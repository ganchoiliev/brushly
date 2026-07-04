'use client'

// "Freeze & refine": the on-device high-quality AR preview.
//
// The live overlay recolours every frame from a coarse mask upsampled with a
// tiny kernel — fast, but the paint edge can't hug real object/lamp boundaries
// and bright patches wash out. When the user taps "Sharpen preview" we FREEZE
// one frame and spend a second or two producing a sharper recolour:
//   1. segment the still at 512 (the same recipe as instantPreview),
//   2. refine the coarse alpha with a guided filter (matting.ts) so the paint
//      snaps toward image edges — sharper than the live upsample, but still
//      BOUNDED by the model's semantic precision: it can't fully clean object
//      edges or same-tone wall/ceiling seams (that's what the cloud render is for),
//   3. recolour with the shared luminance-transfer math.
// Colour switches then re-run only the (LUT-accelerated) recolour on the cached
// matte — visually instant, no re-segment.
//
// One FrozenPreview owns one frozen frame and two detached 2D canvases:
//   - `clean`  : the pristine frame at capture resolution — the shutter exports
//                THIS to the cloud render, so it must stay full-res.
//   - `out`    : the displayed, recoloured canvas at a lighter work resolution.
// Neither ever touches the live WebGL overlay canvas (canvas-context permanence).
//
// The ORT session is NOT acquired/released here — the caller (ARCamera) holds a
// component-lifetime bracket so a freeze→retake→freeze cycle never disposes the
// session out from under the (paused) live loop. Every async step re-checks a
// `disposed` flag so a retake mid-refine can't write to a freed canvas.

import type { VisualizerService } from '@/lib/supabase/types'
import {
  EXTERIOR_CLASSES,
  INTERIOR_CLASSES,
  segmentWallMargin,
} from '@/lib/visualizer/segmentation'
import {
  DEFAULT_TUNING,
  hexToRgb,
  maskedMedianLuminance,
  recolorPixelsFast,
  smoothMargin,
  specPreserveForFinish,
  upsampleAlphaBilinear,
} from '@/lib/visualizer/liveMath'
import { guidedFilterAlpha, luminanceGuide } from '@/lib/visualizer/matting'
import type { CropRect } from './liveCompositor'

const MAX_DIM = 1600 // clean/shutter resolution — matches ARCamera's capture()
const REFINE_MAX = 1000 // work + display resolution (matte/recolour run here)
const STILL_INPUT = 512 // segmentation input, as instantPreview

export interface FrozenPreview {
  /** Displayed canvas: the recoloured frozen frame at work resolution. */
  readonly out: HTMLCanvasElement
  /** Pristine frozen frame at capture resolution — the shutter exports this. */
  readonly clean: HTMLCanvasElement
  /** Segment + matte ONCE (cached), then recolour. Resolves true on success. */
  refine(colorHex: string, finish: string): Promise<boolean>
  /** Re-recolour the cached matte — near-instant; buffers if refine isn't done. */
  recolor(colorHex: string, finish: string): void
  /** Free everything and block any in-flight refine from writing. */
  dispose(): void
}

/**
 * Grabs one frame from `source` (cropped to what the object-cover viewfinder
 * shows) into detached canvases and returns a FrozenPreview. Shows the plain
 * frozen photo immediately; call refine() to compute the recoloured version.
 */
export function freezeFrame(
  source: HTMLVideoElement,
  crop: CropRect,
  service: VisualizerService,
): FrozenPreview {
  // clean: full-res (≤MAX_DIM) pristine frame for the shutter/cloud render.
  const cleanScale = Math.min(1, MAX_DIM / Math.max(crop.sw, crop.sh))
  const clean = document.createElement('canvas')
  clean.width = Math.max(1, Math.round(crop.sw * cleanScale))
  clean.height = Math.max(1, Math.round(crop.sh * cleanScale))
  const cctx = clean.getContext('2d')
  cctx?.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, clean.width, clean.height)

  // work: lighter copy (from clean, so we don't touch the live video again) that
  // the matte and recolour run on and that is displayed.
  const workScale = Math.min(1, REFINE_MAX / Math.max(clean.width, clean.height))
  const w = Math.max(1, Math.round(clean.width * workScale))
  const h = Math.max(1, Math.round(clean.height * workScale))
  const work = document.createElement('canvas')
  work.width = w
  work.height = h
  const wctx = work.getContext('2d', { willReadFrequently: true })
  wctx?.drawImage(clean, 0, 0, w, h)

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  octx?.drawImage(work, 0, 0) // instant: show the plain frozen photo until refined

  let disposed = false
  let cache: { alpha: Float32Array; wallLum: number; clean: ImageData } | null = null
  // A colour tapped before the matte is ready is remembered and applied on completion.
  let pending: { colorHex: string; finish: string } | null = null

  const paint = (colorHex: string, finish: string) => {
    if (disposed || !cache || !octx) return
    const buf = new Uint8ClampedArray(cache.clean.data) // fresh copy of the pristine frame
    recolorPixelsFast(buf, w, h, cache.alpha, hexToRgb(colorHex), cache.wallLum, {
      specPreserve: specPreserveForFinish(finish),
    })
    octx.putImageData(new ImageData(buf, w, h), 0, 0)
  }

  return {
    out,
    clean,
    async refine(colorHex, finish) {
      if (disposed || !wctx) return false
      pending = { colorHex, finish }
      try {
        const targets = service === 'exterior' ? EXTERIOR_CLASSES : INTERIOR_CLASSES
        const { margin, width: mw, height: mh } = await segmentWallMargin(work, STILL_INPUT, targets)
        if (disposed) return false
        // blend=1: single frame, no temporal history — same feather the live
        // overlay uses, so the frozen still reads at the identical saturation.
        const smooth = smoothMargin(margin, mw, mh, null, DEFAULT_TUNING.feather, 1)
        const frame = wctx.getImageData(0, 0, w, h) // pristine work frame
        const wallLum = maskedMedianLuminance(frame.data, w, h, smooth.data, mw, mh) ?? 0.5
        const coarse = upsampleAlphaBilinear(smooth.data, mw, mh, w, h)
        let alpha = coarse
        try {
          const guide = luminanceGuide(frame.data, w, h)
          alpha = guidedFilterAlpha(guide, coarse, w, h)
        } catch (e) {
          // Matting is a nicety — fall back to the coarse (bilinear) alpha, which
          // is exactly today's instant-preview quality.
          console.warn('matting unavailable, using coarse alpha:', e)
          alpha = coarse
        }
        if (disposed) return false
        cache = { alpha, wallLum, clean: frame }
        const p = pending ?? { colorHex, finish }
        pending = null
        paint(p.colorHex, p.finish)
        return true
      } catch (e) {
        // Segmentation failed — leave the plain frozen photo showing (still a
        // steadier preview than the jittery live overlay). Best-effort by design.
        console.warn('freeze refine unavailable:', e)
        return false
      }
    },
    recolor(colorHex, finish) {
      if (disposed) return
      if (!cache) {
        pending = { colorHex, finish }
        return
      }
      paint(colorHex, finish)
    },
    dispose() {
      disposed = true
      cache = null
      pending = null
      // Shrink the detached canvases so their backing stores free promptly even
      // if the caller holds a reference a moment longer.
      clean.width = clean.height = 0
      work.width = work.height = 0
      out.width = out.height = 0
    },
  }
}
