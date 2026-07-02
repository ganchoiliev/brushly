'use client'

// Live AR wall preview: runs the on-device segmentation model against a live
// <video> and composites the chosen paint colour onto the wall region of an
// overlay <canvas>.
//
// Two independent loops:
//  - model loop (~6–10fps): crop video frame → 256px input → wall margin at
//    32×32 → temporal EMA + feathered alpha → small tint canvas. Sequential
//    awaits; throttled; never more than one inference in flight.
//  - compositor (rAF, display rate): draws the video crop into the overlay
//    canvas, then the upscaled tint twice — 'color' transfers the paint's
//    hue/saturation at the wall's own luminance, 'soft-light' pulls brightness
//    toward the paint. Both preserve texture and shadows. Compositing happens
//    IN the canvas because CSS mix-blend-mode over <video> silently no-ops on
//    iOS Safari (video composites in its own layer).
//
// The video element must render object-cover (or exactly match the source
// aspect) — coverCrop() mirrors that mapping so the mask lines up on screen.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { dispose, getActiveProvider, lazyInit, segmentWallMargin } from '@/lib/visualizer/segmentation'

export type LivePreviewStatus = 'idle' | 'loading' | 'on' | 'unsupported'

export interface LiveStats {
  /** Wall time of the latest model pass (grab → margin → tint), ms. */
  inferMs: number
  /** Achievable model rate from the rolling average, fps. */
  fps: number
}

const LIVE_INPUT = 256 // model input for live frames (still path stays at 512)
const MIN_INTERVAL_MS = 100 // cap the model loop at ~10fps
const FAIL_AVG_MS = 200 // sustained < 5fps ⇒ turn the overlay off
const WARMUP_RUNS = 3 // first passes compile WebGPU shaders — don't judge them
const WINDOW = 6 // rolling samples for the fps guard
const TEMPORAL_BLEND = 0.45 // EMA weight of the newest mask (higher = snappier, more flicker)
const FEATHER = 1.5 // logit-margin width of the soft mask edge
const MAX_DPR = 2

/**
 * Cheap pre-flight: can this device plausibly run the live overlay at all?
 * Checked BEFORE lazyInit so incapable devices (older iOS Safari with no
 * WebGPU, data-saver users) never download the 8 MB fp32 model just to learn
 * they can't use it. The post-init provider check and the fps guard remain the
 * real gatekeepers — this only avoids pointless work. Capture always works.
 */
export async function detectLiveCapability(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean }
    gpu?: { requestAdapter(): Promise<unknown | null> }
  }
  if (nav.connection?.saveData) return false
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-data: reduce)').matches)
    return false
  // The model only runs acceptably on WebGPU (ort-web's webgl EP can't execute
  // it and wasm blocks the main thread), so no adapter ⇒ fall back to capture.
  if (!nav.gpu) return false
  try {
    return (await nav.gpu.requestAdapter()) !== null
  } catch {
    return false
  }
}

/** Source rect of `vw`×`vh` video shown by an object-cover box of `cw`×`ch`. */
export function coverCrop(
  vw: number,
  vh: number,
  cw: number,
  ch: number,
): { sx: number; sy: number; sw: number; sh: number } {
  let sx = 0
  let sy = 0
  let sw = vw
  let sh = vh
  if (cw > 0 && ch > 0) {
    if (vw / vh > cw / ch) {
      sw = Math.round(vh * (cw / ch))
      sx = Math.round((vw - sw) / 2)
    } else {
      sh = Math.round(vw / (cw / ch))
      sy = Math.round((vh - sh) / 2)
    }
  }
  return { sx, sy, sw, sh }
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) || 0,
    parseInt(hex.slice(3, 5), 16) || 0,
    parseInt(hex.slice(5, 7), 16) || 0,
  ]
}

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** True while the video is live and the overlay is wanted. */
  active: boolean
  colorHex: string
  onStats?: (stats: LiveStats) => void
}

export default function useLiveWallPreview({
  videoRef,
  canvasRef,
  active,
  colorHex,
  onStats,
}: Options): LivePreviewStatus {
  const [status, setStatus] = useState<LivePreviewStatus>('idle')

  // Smoothed wall alpha at model-output resolution, persisted across frames
  // for the EMA and reused by instant colour switches.
  const smoothRef = useRef<{ data: Float32Array; w: number; h: number } | null>(null)
  const tintRef = useRef<HTMLCanvasElement | null>(null)
  const tintDataRef = useRef<ImageData | null>(null)
  const colorRef = useRef<[number, number, number]>(hexToRgb(colorHex))
  const onStatsRef = useRef(onStats)
  onStatsRef.current = onStats

  /** Rewrites the small tint canvas from the smoothed alpha + current colour. */
  const paintTint = useCallback(() => {
    const s = smoothRef.current
    if (!s) return
    let tint = tintRef.current
    if (!tint) {
      tint = document.createElement('canvas')
      tintRef.current = tint
    }
    if (tint.width !== s.w || tint.height !== s.h) {
      tint.width = s.w
      tint.height = s.h
      tintDataRef.current = null
    }
    const ctx = tint.getContext('2d')
    if (!ctx) return
    let img = tintDataRef.current
    if (!img) {
      img = ctx.createImageData(s.w, s.h)
      tintDataRef.current = img
    }
    const [r, g, b] = colorRef.current
    const px = img.data
    for (let i = 0; i < s.data.length; i++) {
      const p = i * 4
      px[p] = r
      px[p + 1] = g
      px[p + 2] = b
      px[p + 3] = Math.round(s.data[i] * 255)
    }
    ctx.putImageData(img, 0, 0)
  }, [])

  // Colour switches re-tint the last mask immediately — no model pass needed.
  useEffect(() => {
    colorRef.current = hexToRgb(colorHex)
    paintTint()
  }, [colorHex, paintTint])

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      return
    }
    let stopped = false
    let rafId = 0
    let sleepTimer: ReturnType<typeof setTimeout> | undefined
    const grab = document.createElement('canvas')
    grab.width = LIVE_INPUT
    grab.height = LIVE_INPUT
    setStatus('loading')

    const clearOverlay = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const fail = () => {
      stopped = true
      cancelAnimationFrame(rafId)
      clearOverlay()
      setStatus('unsupported')
    }

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        sleepTimer = setTimeout(resolve, ms)
      })

    // Feathered alpha from the raw margin, EMA-blended with the previous frame.
    const applyMargin = (margin: Float32Array, w: number, h: number) => {
      let s = smoothRef.current
      let fresh = false
      if (!s || s.w !== w || s.h !== h) {
        s = { data: new Float32Array(w * h), w, h }
        smoothRef.current = s
        fresh = true
      }
      const data = s.data
      for (let i = 0; i < margin.length; i++) {
        const alpha = 1 / (1 + Math.exp(-margin[i] / FEATHER))
        data[i] = fresh ? alpha : data[i] + (alpha - data[i]) * TEMPORAL_BLEND
      }
    }

    // Canvas blend support is near-universal, but degrade to a plain alpha
    // overlay rather than an invisible one if 'color'/'soft-light' are missing.
    let blendOk = true
    const startCompositor = () => {
      const probe = canvasRef.current?.getContext('2d')
      if (probe) {
        probe.globalCompositeOperation = 'color'
        blendOk = probe.globalCompositeOperation === 'color'
        probe.globalCompositeOperation = 'source-over'
      }
      const draw = () => {
        if (stopped) return
        const video = videoRef.current
        const canvas = canvasRef.current
        const tint = tintRef.current
        if (video && canvas && tint && video.videoWidth) {
          const cw = video.clientWidth
          const ch = video.clientHeight
          const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
          const w = Math.round(cw * dpr)
          const h = Math.round(ch * dpr)
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
          const ctx = canvas.getContext('2d')
          if (ctx && w > 0 && h > 0) {
            const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, cw, ch)
            ctx.globalCompositeOperation = 'source-over'
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h)
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            if (blendOk) {
              ctx.globalCompositeOperation = 'color'
              ctx.drawImage(tint, 0, 0, w, h)
              ctx.globalCompositeOperation = 'soft-light'
              ctx.drawImage(tint, 0, 0, w, h)
              ctx.globalCompositeOperation = 'source-over'
            } else {
              ctx.globalAlpha = 0.55
              ctx.drawImage(tint, 0, 0, w, h)
              ctx.globalAlpha = 1
            }
          }
        }
        rafId = requestAnimationFrame(draw)
      }
      rafId = requestAnimationFrame(draw)
    }

    const loop = async () => {
      const durations: number[] = []
      let runs = 0
      let errors = 0
      let compositing = false
      while (!stopped) {
        const video = videoRef.current
        if (!video || video.readyState < 2 || !video.videoWidth || document.hidden) {
          await sleep(120)
          continue
        }
        const t0 = performance.now()
        try {
          const cw = video.clientWidth || video.videoWidth
          const ch = video.clientHeight || video.videoHeight
          const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, cw, ch)
          const gctx = grab.getContext('2d')
          if (!gctx) throw new Error('Canvas 2D is unavailable.')
          gctx.drawImage(video, sx, sy, sw, sh, 0, 0, LIVE_INPUT, LIVE_INPUT)
          const { margin, width, height } = await segmentWallMargin(grab, LIVE_INPUT)
          if (stopped) return
          applyMargin(margin, width, height)
          paintTint()
          if (!compositing) {
            compositing = true
            startCompositor()
            setStatus('on')
          }
          errors = 0
          runs += 1
          const dt = performance.now() - t0
          if (runs > WARMUP_RUNS) {
            durations.push(dt)
            if (durations.length > WINDOW) durations.shift()
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length
            onStatsRef.current?.({ inferMs: Math.round(dt), fps: Math.round(10000 / avg) / 10 })
            if (durations.length >= WINDOW && avg > FAIL_AVG_MS) {
              fail()
              return
            }
          }
        } catch {
          if (stopped) return
          errors += 1
          if (errors >= 2) {
            fail()
            return
          }
        }
        await sleep(Math.max(16, MIN_INTERVAL_MS - (performance.now() - t0)))
      }
    }

    // Deferred a tick so StrictMode's mount→cleanup→mount doesn't start a
    // doomed duplicate init (cleanup clears the timer before it fires).
    const initTimer = setTimeout(() => {
      detectLiveCapability()
        .then((capable) => {
          if (stopped) return
          if (!capable) {
            // Don't fetch the model at all — capture-only fallback.
            setStatus('unsupported')
            return
          }
          return lazyInit().then(() => {
            if (stopped) return
            const ep = getActiveProvider()
            // wasm executes on the main thread (~hundreds of ms per frame) —
            // that's "no WebGL/WebGPU" for live purposes. Capture still works.
            if (ep !== 'webgpu' && ep !== 'webgl') {
              setStatus('unsupported')
              return
            }
            void loop()
          })
        })
        .catch(() => {
          if (!stopped) setStatus('unsupported')
        })
    }, 0)

    return () => {
      stopped = true
      clearTimeout(initTimer)
      if (sleepTimer) clearTimeout(sleepTimer)
      cancelAnimationFrame(rafId)
      clearOverlay()
      // Release everything the live loop grew: the smoothed-mask buffer, the
      // tint canvas + ImageData, and (via dispose) the ORT session, its input
      // scratch buffers and the model weights.
      smoothRef.current = null
      tintRef.current = null
      tintDataRef.current = null
      void dispose()
    }
  }, [active, videoRef, canvasRef, paintTint])

  return status
}
