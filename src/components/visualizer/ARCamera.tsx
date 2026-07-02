'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import useReducedMotion from '@/hooks/useReducedMotion'
import type { VisualizerService } from '@/lib/supabase/types'
import { FINISHES, PALETTE_BY_SPECTRUM, SERVICE_LABELS, getColor } from '@/lib/visualizer/palette'
import { trackEvent } from '@/lib/gtag'
import useLiveWallPreview, { coverCrop } from './useLiveWallPreview'

export interface ARSelection {
  service: VisualizerService
  colorId: string
  finish: string
}

interface Props {
  /** Shutter: the captured frame plus the look selected in AR mode. */
  onCaptureRender: (file: File, selection: ARSelection) => void
  onClose: () => void
}

type CamState = 'starting' | 'live' | 'denied' | 'unavailable' | 'busy'

const MAX_DIM = 1600
// Default live-preview colour: mid-dark so the first overlay reads clearly.
const DEFAULT_COLOR_ID = 'green-smoke'

// Compact pill labels for AR mode ("Interior painting" → "Interior").
const AR_SERVICES = (Object.keys(SERVICE_LABELS) as VisualizerService[]).map((id) => ({
  id,
  label: SERVICE_LABELS[id].split(' ')[0],
}))

export default function ARCamera({ onCaptureRender, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const capturing = useRef(false)
  const overlayShown = useRef(false)
  const [state, setState] = useState<CamState>('starting')
  const [flash, setFlash] = useState(false)
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID)
  const [service, setService] = useState<VisualizerService>('interior')
  const [finish, setFinish] = useState<string>(FINISHES.interior[0])
  const reducedMotion = useReducedMotion()

  const liveColor = getColor(colorId) ?? PALETTE_BY_SPECTRUM[0]
  const liveStatus = useLiveWallPreview({
    videoRef,
    canvasRef: overlayRef,
    active: state === 'live',
    colorHex: liveColor.hex,
    finish,
  })

  useEffect(() => {
    if (liveStatus === 'on' && !overlayShown.current) {
      overlayShown.current = true
      trackEvent('ar_overlay_shown')
    }
  }, [liveStatus])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const handleClose = useCallback(() => {
    stopStream()
    onClose()
  }, [stopStream, onClose])

  // Generation counter instead of a boolean: startCamera is also re-run by
  // the "Try again" button on error states, and any older attempt (or one
  // belonging to an unmounted instance) must not touch state or keep tracks.
  const camGen = useRef(0)

  // Camera failure states are funnel drop-offs — instrument them.
  const setFailState = useCallback((s: 'denied' | 'unavailable' | 'busy') => {
    setState(s)
    trackEvent(`ar_camera_${s}`)
  }, [])

  const startCamera = useCallback(async () => {
    const gen = ++camGen.current
    stopStream()
    setState('starting')
    // getUserMedia needs a secure context; also absent on very old browsers.
    if (!navigator.mediaDevices?.getUserMedia) {
      setFailState('unavailable')
      return
    }
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
      } catch (e) {
        // No rear camera (laptops, some tablets) — take any camera before giving up.
        const name = e instanceof DOMException ? e.name : ''
        if (name === 'OverconstrainedError' || name === 'NotFoundError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } else {
          throw e
        }
      }
      if (gen !== camGen.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      // The OS or another app can take the camera away mid-session; track.stop()
      // does NOT fire 'ended' on itself, so this only catches external loss.
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => {
          if (gen === camGen.current) setState('busy')
        }
      })
      const video = videoRef.current
      if (!video) return
      // iOS Safari only autoplays a muted+playsinline video, and React's
      // muted prop doesn't reliably reach the DOM on first render.
      video.muted = true
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // iOS can reject the first play() before metadata arrives; the
        // autoplay attribute retries and onPlaying flips us to live.
      }
    } catch (e) {
      if (gen !== camGen.current) return
      const name = e instanceof DOMException ? e.name : ''
      setFailState(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : name === 'NotReadableError' || name === 'AbortError'
            ? 'busy' // camera exists but the OS/another app holds it
            : 'unavailable',
      )
    }
  }, [stopStream, setFailState])

  useEffect(() => {
    void startCamera()
    return () => {
      camGen.current += 1
      if (flashTimer.current) clearTimeout(flashTimer.current)
      stopStream()
    }
  }, [startCamera, stopStream])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  // Minimal focus trap: Tab cycles within the dialog (it is aria-modal, but
  // nothing inerts the page behind it, so wrap focus manually).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const root = rootRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Move focus into the dialog on open and hand it back on close. Restore only
  // when focus fell to body (dialog removal) or is still inside this instance —
  // never steal it from a newer overlay.
  useEffect(() => {
    const node = rootRef.current
    const prev = document.activeElement
    node?.focus()
    return () => {
      const active = document.activeElement
      if (
        prev instanceof HTMLElement &&
        (active === document.body || (node && node.contains(active)))
      ) {
        prev.focus()
      }
    }
  }, [])

  const capture = useCallback(async () => {
    const video = videoRef.current
    if (!video || state !== 'live' || !video.videoWidth || capturing.current) return
    capturing.current = true
    trackEvent('ar_capture')
    if (!reducedMotion) {
      setFlash(true)
      flashTimer.current = setTimeout(() => setFlash(false), 180)
    }
    // Export exactly what the object-cover viewfinder shows: crop the source
    // frame to the container's aspect ratio, centred, before scaling. The
    // capture is the CLEAN frame — the live overlay is preview-only; the
    // photoreal recolour comes from the render pipeline.
    const vw = video.videoWidth
    const vh = video.videoHeight
    const { sx, sy, sw, sh } = coverCrop(vw, vh, video.clientWidth, video.clientHeight)
    const scale = Math.min(1, MAX_DIM / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      capturing.current = false
      return
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    )
    if (!blob) {
      capturing.current = false
      return
    }
    stopStream()
    onCaptureRender(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }), {
      service,
      colorId,
      finish,
    })
  }, [state, reducedMotion, stopStream, onCaptureRender, service, colorId, finish])

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      tabIndex={-1}
      className="fixed inset-0 z-[80] bg-brushly-black outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        onPlaying={() => setState('live')}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Live paint overlay — the compositor redraws video + tint here, so it
          fully covers the video while on and fades away otherwise. */}
      <canvas
        ref={overlayRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${
          liveStatus === 'on' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Shutter flash */}
      {flash && <div className="absolute inset-0 z-10 bg-white/70" />}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end bg-gradient-to-b from-brushly-black/70 to-transparent p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close camera"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brushly-black/40 text-brushly-cream/80 backdrop-blur-sm transition-colors hover:text-brushly-cream"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {state === 'live' && (
        <>
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 top-[max(1.5rem,env(safe-area-inset-top))] z-10 flex flex-col items-center gap-2 px-10"
          >
            {liveStatus === 'unsupported' ? (
              <span className="max-w-[340px] rounded-2xl bg-brushly-black/50 px-4 py-2 text-center font-body text-[12px] leading-relaxed text-brushly-cream/80 backdrop-blur-sm">
                Live preview isn&rsquo;t supported on this device — tap to capture and we&rsquo;ll
                render it
              </span>
            ) : (
              <>
                <span className="rounded-full bg-brushly-black/50 px-4 py-2 font-body text-[12px] text-brushly-cream/80 backdrop-blur-sm">
                  Point at the wall you want to paint
                </span>
                {liveStatus === 'loading' && (
                  <span className="rounded-full bg-brushly-black/40 px-3 py-1 font-body text-[11px] text-brushly-cream/50 backdrop-blur-sm">
                    Preparing live preview…
                  </span>
                )}
              </>
            )}
          </div>

          {/* Aiming reticle — corner brackets, gently breathing. Anchored at
              38% height: the control stack covers the lower half on phones. */}
          {liveStatus !== 'unsupported' && (
            <motion.svg
              aria-hidden="true"
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              className="pointer-events-none absolute left-1/2 top-[38%] z-10 -translate-x-1/2 -translate-y-1/2 text-brushly-gold"
              initial={{ opacity: 0.4 }}
              animate={reducedMotion ? { opacity: 0.4 } : { opacity: [0.3, 0.55, 0.3] }}
              transition={
                reducedMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <path
                d="M2 30V10a8 8 0 0 1 8-8h20M90 2h20a8 8 0 0 1 8 8v20M118 90v20a8 8 0 0 1-8 8H90M30 118H10a8 8 0 0 1-8-8V90"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </motion.svg>
          )}

          <motion.div
            className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 bg-gradient-to-t from-brushly-black/80 to-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8"
            initial={reducedMotion ? false : { y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Service + finish drive the photoreal render (and stay useful even
                when the live overlay is unsupported). */}
            <div
              role="group"
              aria-label="Service"
              className="scrollbar-none flex w-full max-w-md justify-start gap-1.5 overflow-x-auto py-0.5 sm:justify-center"
            >
              {AR_SERVICES.map((s) => {
                const active = service === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setService(s.id)
                      setFinish(FINISHES[s.id][0])
                    }}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full px-3.5 py-2 font-body text-[10px] font-medium uppercase tracking-[0.15em] backdrop-blur-sm transition-colors duration-200 ${
                      active
                        ? 'bg-brushly-gold text-brushly-black'
                        : 'bg-brushly-black/40 text-brushly-cream/70 hover:text-brushly-cream'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
            <div
              role="group"
              aria-label="Finish"
              className="scrollbar-none flex w-full max-w-md justify-start gap-1.5 overflow-x-auto py-0.5 sm:justify-center"
            >
              {FINISHES[service].map((f) => {
                const active = finish === f
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFinish(f)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full px-3.5 py-2 font-body text-[10px] backdrop-blur-sm transition-colors duration-200 ${
                      active
                        ? 'bg-brushly-cream/90 text-brushly-black'
                        : 'bg-brushly-black/40 text-brushly-cream/60 hover:text-brushly-cream'
                    }`}
                  >
                    {f}
                  </button>
                )
              })}
            </div>

            <div className="flex w-full max-w-md flex-col items-center gap-1.5">
              <span className="rounded-full bg-brushly-black/40 px-2.5 py-0.5 font-body text-[11px] text-brushly-cream/90 backdrop-blur-sm">
                {liveColor.label} · {liveColor.brand}
              </span>
              <div
                role="group"
                aria-label="Colour"
                className="scrollbar-none flex w-full gap-2.5 overflow-x-auto px-1 py-1.5"
              >
                {PALETTE_BY_SPECTRUM.map((c) => {
                  const active = colorId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorId(c.id)}
                      aria-label={`${c.label} — ${c.brand}`}
                      aria-pressed={active}
                      className={`h-10 w-10 shrink-0 rounded-full transition-all duration-150 ${
                        active
                          ? 'scale-110 ring-2 ring-brushly-gold'
                          : 'border border-white/30 hover:scale-105'
                      }`}
                      style={{ background: c.hex }}
                    />
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void capture()}
              aria-label="Capture and render this look"
              className={`flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-brushly-cream ${
                reducedMotion ? '' : 'transition-transform duration-150 active:scale-90'
              }`}
            >
              <span className="h-[52px] w-[52px] rounded-full bg-brushly-cream" />
            </button>
            <span className="rounded-full bg-brushly-black/40 px-2.5 py-0.5 font-body text-[10px] uppercase tracking-[0.2em] text-brushly-cream/80 backdrop-blur-sm">
              Tap to see it for real
            </span>
          </motion.div>
        </>
      )}

      {state === 'starting' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
          <span
            className={`h-8 w-8 rounded-full border-2 border-brushly-gold/30 border-t-brushly-gold ${
              reducedMotion ? '' : 'animate-spin'
            }`}
          />
          <span className="font-body text-[13px] uppercase tracking-[0.2em] text-brushly-cream/60">
            Starting camera…
          </span>
        </div>
      )}

      {(state === 'denied' || state === 'unavailable' || state === 'busy') && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div
            role="alert"
            className="max-w-sm border border-brushly-gold/20 bg-brushly-charcoal p-8 text-center"
          >
            <p className="font-display text-2xl font-light text-brushly-cream">
              {state === 'denied'
                ? 'Camera access needed'
                : state === 'busy'
                  ? 'Camera is in use'
                  : 'Camera not available'}
            </p>
            <p className="mt-3 font-body text-[14px] leading-relaxed text-brushly-cream/60">
              {state === 'denied'
                ? 'Allow camera access in your browser settings to use the viewfinder — or upload a photo instead.'
                : state === 'busy'
                  ? 'Another app seems to be using your camera. Close it and try again — or upload a photo instead.'
                  : 'We couldn’t find a camera on this device — you can upload a photo instead.'}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full bg-brushly-gold px-6 py-3.5 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light"
            >
              Upload a photo instead
            </button>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="mt-3 w-full border border-brushly-gold/40 px-6 py-3 font-body text-[12px] font-medium uppercase tracking-[0.2em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
