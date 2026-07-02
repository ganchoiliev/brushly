'use client'

// Live AR wall preview: runs the on-device segmentation model against a live
// <video> and composites the chosen paint colour onto the wall region of an
// overlay <canvas>.
//
// Two independent loops:
//  - model loop (~6–10fps): crop video frame → 256/320px input → wall margin
//    at input/8 → motion-adaptive temporal EMA + feathered alpha → compositor
//    mask update, plus wall-luminance and motion statistics from the same
//    grabbed frame. Sequential awaits; throttled; never more than one
//    inference in flight. Fast devices are stepped up to 320 input (40×40
//    mask) for a visibly sharper edge.
//  - compositor (rAF, display rate): WebGL2 when available — edge-aware mask
//    upsampling + luminance-transfer recolour in linear light (dark paints
//    actually read dark; texture, shadows and highlights survive; glossier
//    finishes keep more specular). Falls back to the original 2D-canvas
//    'color' + 'soft-light' recipe. Compositing happens IN the canvas because
//    CSS mix-blend-mode over <video> silently no-ops on iOS Safari (video
//    composites in its own layer).
//
// The video element must render object-cover (or exactly match the source
// aspect) — coverCrop() mirrors that mapping so the mask lines up on screen.

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  acquireSession,
  getActiveProvider,
  lazyInit,
  releaseSession,
  segmentWallMargin,
} from '@/lib/visualizer/segmentation'
import {
  DEFAULT_TUNING,
  adaptInputSize,
  hexToRgb,
  maskedMeanLuminance,
  motionBlend,
  motionScore,
  smoothMargin,
  specPreserveForFinish,
  type LiveTuning,
  type SmoothedMask,
} from '@/lib/visualizer/liveMath'
import {
  createLiveCompositor,
  type CompositorMode,
  type LiveCompositor,
} from './liveCompositor'

export type LivePreviewStatus = 'idle' | 'loading' | 'on' | 'unsupported'

export interface LiveStats {
  /** Wall time of the latest model pass (grab → margin → mask), ms. */
  inferMs: number
  /** Achievable model rate from the rolling average, fps. */
  fps: number
  /** Current model input size (256 baseline, 320 on fast devices). */
  inputSize: number
  /** Which compositor is drawing ('webgl' preferred, '2d' fallback). */
  compositor: 'webgl' | '2d' | null
  /** Display-loop rate over the last second, fps. */
  drawFps: number
}

const MIN_INTERVAL_MS = 100 // cap the model loop at ~10fps
const FAIL_AVG_MS = 200 // sustained < 5fps ⇒ turn the overlay off
const WARMUP_RUNS = 3 // first passes compile WebGPU shaders — don't judge them
const WINDOW = 6 // rolling samples for the fps guard
const MOTION_STRIDE = 8 // sample grid for the frame-difference motion score
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

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** True while the video is live and the overlay is wanted. */
  active: boolean
  colorHex: string
  /** Paint finish label — drives specular preservation in the WebGL path. */
  finish?: string
  onStats?: (stats: LiveStats) => void
  /** Overrides for the smoothing/recolour constants (debug page sliders). */
  tuning?: Partial<LiveTuning>
  /** Force a compositor implementation (debug page A/B). */
  compositorMode?: CompositorMode
  /** Debug: run the live loop even on wasm (normally capture-only). */
  debugAllowAnyProvider?: boolean
  /** Debug: keep the loop alive past the FAIL_AVG_MS guard. */
  debugDisableFpsGuard?: boolean
}

export default function useLiveWallPreview({
  videoRef,
  canvasRef,
  active,
  colorHex,
  finish,
  onStats,
  tuning,
  compositorMode = 'auto',
  debugAllowAnyProvider = false,
  debugDisableFpsGuard = false,
}: Options): LivePreviewStatus {
  const [status, setStatus] = useState<LivePreviewStatus>('idle')

  // Smoothed wall alpha at model-output resolution, persisted across frames
  // for the EMA.
  const smoothRef = useRef<SmoothedMask | null>(null)
  const compositorRef = useRef<LiveCompositor | null>(null)
  const colorRef = useRef<[number, number, number]>(hexToRgb(colorHex))
  const finishRef = useRef(finish)
  finishRef.current = finish
  const onStatsRef = useRef(onStats)
  onStatsRef.current = onStats
  const tuningRef = useRef<LiveTuning>({ ...DEFAULT_TUNING, ...tuning })
  tuningRef.current = { ...DEFAULT_TUNING, ...tuning }
  const drawFpsRef = useRef(0)

  // Colour switches re-tint instantly — no model pass needed.
  useEffect(() => {
    colorRef.current = hexToRgb(colorHex)
    compositorRef.current?.setColor(colorRef.current)
  }, [colorHex])

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      return
    }
    let stopped = false
    let rafId = 0
    let sleepTimer: ReturnType<typeof setTimeout> | undefined
    let inputSize = 256
    acquireSession()
    let downgraded = false // once 320 proves too slow, don't oscillate back
    const grab = document.createElement('canvas')
    grab.width = inputSize
    grab.height = inputSize
    // Motion sampling grid at the largest input size (320/8 = 40 per side).
    const prevLuma = new Float32Array(40 * 40)
    let hasPrevLuma = false
    let wallLum = 0.5
    setStatus('loading')

    // Clearing goes through the compositor ONLY. A getContext('2d') fallback
    // here would permanently claim the (still pristine) overlay canvas as 2D
    // during the model-load window — before startCompositor ever ran — and
    // silently lock the WebGL path out for every later activation. When no
    // compositor exists nothing has drawn to the canvas, so there is nothing
    // to clear anyway.
    const clearOverlay = () => {
      compositorRef.current?.clear()
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

    const startCompositor = (): boolean => {
      const canvas = canvasRef.current
      if (!canvas) return false
      const compositor = createLiveCompositor(canvas, compositorMode)
      if (!compositor) return false
      compositorRef.current = compositor
      compositor.setColor(colorRef.current)
      let frames = 0
      let windowStart = performance.now()
      const draw = () => {
        if (stopped) return
        const video = videoRef.current
        if (video && video.videoWidth) {
          const cw = video.clientWidth
          const ch = video.clientHeight
          const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
          const crop = coverCrop(video.videoWidth, video.videoHeight, cw, ch)
          compositor.render(video, crop, Math.round(cw * dpr), Math.round(ch * dpr))
          frames += 1
          const now = performance.now()
          if (now - windowStart >= 1000) {
            drawFpsRef.current = Math.round((frames * 1000) / (now - windowStart))
            frames = 0
            windowStart = now
          }
        }
        rafId = requestAnimationFrame(draw)
      }
      rafId = requestAnimationFrame(draw)
      return true
    }

    const loop = async () => {
      const durations: number[] = []
      let runs = 0
      let errors = 0
      let compositing = false
      // A size change recompiles ort-web's shape-specialised WebGPU kernels,
      // exactly like startup — judge the new size only on warm samples, or
      // the compile spike of the first 320 pass reads as "too slow" and
      // permanently locks the upgrade out (or worse, trips the fail guard).
      let skipSamples = 0
      while (!stopped) {
        const video = videoRef.current
        if (!video || video.readyState < 2 || !video.videoWidth || document.hidden) {
          await sleep(120)
          continue
        }
        const t0 = performance.now()
        try {
          const tune = tuningRef.current
          const cw = video.clientWidth || video.videoWidth
          const ch = video.clientHeight || video.videoHeight
          const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, cw, ch)
          const gctx = grab.getContext('2d', { willReadFrequently: true })
          if (!gctx) throw new Error('Canvas 2D is unavailable.')
          gctx.drawImage(video, sx, sy, sw, sh, 0, 0, inputSize, inputSize)
          // One read serves the motion score now and the wall-luminance
          // estimate after the mask lands.
          const frame = gctx.getImageData(0, 0, inputSize, inputSize)
          const motion = motionScore(
            frame.data,
            inputSize,
            inputSize,
            MOTION_STRIDE,
            prevLuma,
            hasPrevLuma,
          )
          hasPrevLuma = true
          const { margin, width, height } = await segmentWallMargin(grab, inputSize)
          if (stopped) return
          const smooth = smoothMargin(
            margin,
            width,
            height,
            smoothRef.current,
            tune.feather,
            motionBlend(motion, tune),
          )
          smoothRef.current = smooth
          wallLum =
            maskedMeanLuminance(frame.data, inputSize, inputSize, smooth.data, width, height) ??
            wallLum
          if (!compositing) {
            if (!startCompositor()) {
              fail()
              return
            }
            compositing = true
            setStatus('on')
          }
          const compositor = compositorRef.current
          if (compositor) {
            compositor.setParams({
              tintStrength: tune.tintStrength,
              edgeSigma: tune.edgeSigma,
              specPreserve: specPreserveForFinish(finishRef.current ?? ''),
            })
            compositor.updateMask(smooth.data, width, height)
            compositor.setWallLuminance(wallLum)
          }
          errors = 0
          runs += 1
          const dt = performance.now() - t0
          if (runs > WARMUP_RUNS && skipSamples > 0) {
            skipSamples -= 1
          } else if (runs > WARMUP_RUNS) {
            durations.push(dt)
            if (durations.length > WINDOW) durations.shift()
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length
            onStatsRef.current?.({
              inferMs: Math.round(dt),
              fps: Math.round(10000 / avg) / 10,
              inputSize,
              compositor: compositorRef.current?.kind ?? null,
              drawFps: drawFpsRef.current,
            })
            if (durations.length >= WINDOW) {
              if (!debugDisableFpsGuard && avg > FAIL_AVG_MS) {
                fail()
                return
              }
              // Step the model input against the measured budget: 320 gives a
              // 40×40 mask (sharper edges) but only while comfortably real-time.
              const next = adaptInputSize(inputSize, avg)
              if (next !== inputSize && !(next > inputSize && downgraded)) {
                if (next < inputSize) downgraded = true
                inputSize = next
                grab.width = inputSize
                grab.height = inputSize
                hasPrevLuma = false // sample grid moved
                durations.length = 0 // measure the new size fresh
                skipSamples = 2 // …but not its shader-compile spike
              }
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
          if (!capable && !debugAllowAnyProvider) {
            // Don't fetch the model at all — capture-only fallback.
            setStatus('unsupported')
            return
          }
          return lazyInit().then(() => {
            if (stopped) return
            const ep = getActiveProvider()
            // wasm executes on the main thread (~hundreds of ms per frame) —
            // that's "no WebGL/WebGPU" for live purposes. Capture still works.
            if (ep !== 'webgpu' && ep !== 'webgl' && !debugAllowAnyProvider) {
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
      // compositor's GPU resources and (when we're the last consumer) the ORT
      // session, its input scratch buffers and the model weights.
      compositorRef.current?.destroy()
      compositorRef.current = null
      smoothRef.current = null
      void releaseSession()
    }
  }, [
    active,
    videoRef,
    canvasRef,
    compositorMode,
    debugAllowAnyProvider,
    debugDisableFpsGuard,
  ])

  return status
}
