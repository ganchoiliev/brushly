'use client'

// Instant on-device preview for the AR capture flow: while the photoreal
// Gemini render takes its ~15 seconds, we already have everything needed to
// show the user a decent approximation right now — the captured frame, the
// on-device segmentation model, and the live-AR recolour math at full still
// quality (512 model input vs the live loop's 256/320).
//
// Best-effort by design: any failure returns null and the progress screen
// falls back to the plain photo backdrop. Runs on whatever provider is
// available — one 512 pass is fine even on wasm.

import { acquireSession, releaseSession, segmentWallMargin } from '@/lib/visualizer/segmentation'
import {
  hexToRgb,
  maskedMeanLuminance,
  recolorPixels,
  smoothMargin,
  specPreserveForFinish,
  upsampleAlphaBilinear,
} from '@/lib/visualizer/liveMath'

const PREVIEW_MAX = 900 // it's a progress backdrop, not the deliverable
const STILL_INPUT = 512

/**
 * Recolours the captured photo's walls on-device and returns an object URL
 * (caller revokes), or null when unavailable. Releases the model afterwards.
 */
export async function makeInstantPreview(
  file: File,
  colorHex: string,
  finish: string,
): Promise<string | null> {
  acquireSession()
  try {
    // Data-conscious users shouldn't pay a model download for a nicety.
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
    if (nav.connection?.saveData) return null
    if (window.matchMedia?.('(prefers-reduced-data: reduce)').matches) return null

    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, PREVIEW_MAX / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const { margin, width: mw, height: mh } = await segmentWallMargin(canvas, STILL_INPUT)
    // blend=1: single frame, no temporal history — just the feathered alpha.
    const smooth = smoothMargin(margin, mw, mh, null, 1.5, 1)
    const frame = ctx.getImageData(0, 0, w, h)
    const wallLum = maskedMeanLuminance(frame.data, w, h, smooth.data, mw, mh) ?? 0.5
    const alpha = upsampleAlphaBilinear(smooth.data, mw, mh, w, h)
    recolorPixels(frame.data, w, h, alpha, hexToRgb(colorHex), wallLum, {
      specPreserve: specPreserveForFinish(finish),
    })
    ctx.putImageData(frame, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    return blob ? URL.createObjectURL(blob) : null
  } catch (e) {
    // Silent degradation for the user, but leave a trace for diagnosis.
    console.warn('instant preview unavailable:', e)
    return null
  } finally {
    // Don't hold ~100 MB of model + runtime through the render wait — unless
    // another consumer (a re-opened camera) is using the session right now,
    // in which case releaseSession() leaves it alive for them.
    void releaseSession()
  }
}
