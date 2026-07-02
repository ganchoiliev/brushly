'use client'

/* eslint-disable @next/next/no-img-element */
// The room preview is a local object URL (user's own file), not a next/image
// candidate.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VisualizerService } from '@/lib/supabase/types'
import { FINISHES, SERVICE_LABELS, getColor, type Look } from '@/lib/visualizer/palette'
import {
  getSessionId,
  processImage,
  uploadPhoto,
  requestRender,
  submitLead,
  RENDER_CANCELLED,
  type RenderResult,
} from '@/lib/visualizer/client'
import { downloadRender, shareRender } from '@/lib/visualizer/share'
import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'
import dynamic from 'next/dynamic'
import Uploader from './Uploader'
import { makeInstantPreview } from './instantPreview'
import type { ARSelection } from './ARCamera'

// AR mode (camera + on-device segmentation) stays out of the /visualizer
// bundle: the component chunk loads when the camera is opened, and the ORT
// runtime + model only when the live preview actually initialises. The
// loading fallback matches ARCamera's own opening frame (black, fading in).
const ARCamera = dynamic(() => import('./ARCamera'), {
  ssr: false,
  loading: () => <div aria-busy="true" className="fixed inset-0 z-[80] bg-brushly-black" />,
})
import ColorChooser from './ColorChooser'
import VisualBeforeAfter from './VisualBeforeAfter'
import SoftGate from './SoftGate'
import RenderProgress from './RenderProgress'

type Step = 'upload' | 'design' | 'result'

const SERVICES: { id: VisualizerService; label: string; blurb: string }[] = [
  { id: 'interior', label: 'Interior', blurb: 'Walls, ceilings & woodwork' },
  { id: 'exterior', label: 'Exterior', blurb: 'Masonry, render & trim' },
  { id: 'wallpaper', label: 'Wallpaper', blurb: 'Feature walls & rooms' },
  { id: 'finish', label: 'Specialist', blurb: 'Plaster, limewash, metallic' },
]

// Existing site room photos double as instant demo rooms (no upload needed).
const SAMPLES: { label: string; src: string }[] = [
  { label: 'Living room', src: '/img/interior.webp' },
  { label: 'Kitchen', src: '/img/modern_kitchen.webp' },
  { label: 'Hallway', src: '/img/hallway.webp' },
]

const HOW_IT_WORKS: [string, string][] = [
  ['1', 'Add a photo'],
  ['2', 'Pick a look'],
  ['3', 'See it'],
]

const fade = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
}

// Renders are cached per exact combination — a Gloss request must never
// silently serve the Matt render of the same colour.
const keyOf = (service: VisualizerService, colorId: string, finish: string) =>
  `${service}|${colorId}|${finish}`

interface StoredRender {
  result: RenderResult
  service: VisualizerService
  colorId: string
  finish: string
}

const preloadImage = (url: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })

export default function VisualizerWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [sessionId, setSessionId] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  const [service, setService] = useState<VisualizerService>('interior')
  const [colorId, setColorId] = useState<string>()
  const [finish, setFinish] = useState<string>(FINISHES.interior[0])

  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState('')
  // True only while a render request is actually in flight (not during the AR
  // upload phase) — gates the Cancel affordance on the progress screen.
  const [cancellable, setCancellable] = useState(false)
  // On-device recolour of the AR capture, shown while the photoreal render
  // generates. Object URL — revoked when the render finishes.
  const [instantPreviewUrl, setInstantPreviewUrl] = useState<string | null>(null)

  // Every render this session, keyed by service|colour|finish, so flipping
  // between already-rendered combinations is instant (and free).
  const [results, setResults] = useState<Record<string, StoredRender>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [renderIds, setRenderIds] = useState<string[]>([])

  const [freeUsed, setFreeUsed] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [gate, setGate] = useState<{ open: boolean; intent: 'continue' | 'save' }>({
    open: false,
    intent: 'continue',
  })
  // The gate was dismissed without submitting — explain the value exchange
  // inline instead of silently re-modal-ing on every tap.
  const [gateDismissed, setGateDismissed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busyAction, setBusyAction] = useState<'' | 'download' | 'share'>('')
  const [busySample, setBusySample] = useState<string | null>(null)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  const prevUrl = useRef('')
  // Bump per open so a quick reopen during the exit fade mounts a fresh camera
  // instead of reviving the exiting instance (whose stream is already stopped).
  const cameraKey = useRef(0)
  // Where the in-flight render was initiated from, for AR funnel analytics.
  // A gate-deferred render keeps the value set at capture time.
  const renderSource = useRef<'ui' | 'ar'>('ui')
  // In-flight guard as a REF, not state: AnimatePresence keeps the exiting
  // design step clickable with frozen closures for its 0.5s fade, so a
  // double-tap on "See it"/a Look would otherwise POST two paid renders.
  const renderInFlight = useRef(false)
  const renderAbort = useRef<AbortController | null>(null)
  // Staleness guard for the async instant preview: a slow preview from an
  // earlier (cancelled) capture must not surface over a later render's
  // progress screen. Bumped whenever a new render context begins.
  const instantGen = useRef(0)
  // Mirrors instantPreviewUrl for unmount cleanup + late-resolve revocation.
  const instantUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setSessionId(getSessionId())
    trackEvent('visualizer_open')
  }, [])

  // The instant preview only belongs to the progress screen; drop it (and its
  // object URL) as soon as the render settles either way.
  useEffect(() => {
    instantUrlRef.current = instantPreviewUrl
    if (!rendering && instantPreviewUrl) {
      URL.revokeObjectURL(instantPreviewUrl)
      setInstantPreviewUrl(null)
    }
  }, [rendering, instantPreviewUrl])

  // Unmount: object URLs outlive React state — revoke whatever is still held.
  useEffect(
    () => () => {
      instantGen.current += 1 // discard any still-computing instant preview
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
      if (instantUrlRef.current) URL.revokeObjectURL(instantUrlRef.current)
    },
    [],
  )

  const openGate = (intent: 'continue' | 'save') => {
    trackEvent('visualizer_gate_shown')
    setGate({ open: true, intent })
  }

  // Process + upload a photo; returns the storage path (null on failure, with
  // the error left in uploadError). Step handling is up to the caller.
  const uploadForRender = async (file: File): Promise<string | null> => {
    if (uploading) return null
    setUploadError('')
    setUploading(true)
    try {
      const sid = sessionId || getSessionId()
      if (!sessionId) setSessionId(sid)
      const blob = await processImage(file)
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
      const url = URL.createObjectURL(blob)
      prevUrl.current = url
      setPreviewUrl(url)
      const path = await uploadPhoto(sid, blob)
      setSourcePath(path)
      setResults({})
      setActiveKey(null)
      return path
    } catch (e) {
      // previewUrl already shows the NEW photo (swapped before the upload),
      // but sourcePath/results still belong to the OLD one — a paid render
      // would fire against a photo the user isn't looking at. Clear the old
      // photo's state so the flow is coherent: no active photo until a
      // successful upload.
      setSourcePath('')
      setResults({})
      setActiveKey(null)
      // Raw DOMException text ("The source image could not be decoded") means
      // nothing to a visitor — map decode failures to actionable copy.
      setUploadError(
        e instanceof DOMException
          ? 'That file didn’t work — try a JPG or PNG photo.'
          : e instanceof Error && e.message
            ? e.message
            : 'Upload failed. Please try again.',
      )
      return null
    } finally {
      setUploading(false)
    }
  }

  const onFile = async (file: File) => {
    const path = await uploadForRender(file)
    if (!path) return
    setStep('design')
    trackEvent('visualizer_photo_added')
  }

  // Instant demo: load an existing room photo through the same pipeline.
  const onSample = async (src: string) => {
    if (uploading) return
    setBusySample(src)
    try {
      const resp = await fetch(src)
      const blob = await resp.blob()
      const file = new File([blob], 'sample.jpg', { type: blob.type || 'image/webp' })
      trackEvent('visualizer_sample_used')
      await onFile(file)
    } catch {
      setUploadError('Could not load the sample — please upload your own photo.')
    } finally {
      setBusySample(null)
    }
  }

  // opts carry just-created values (fresh upload path / AR selection) that
  // React state wouldn't reflect yet inside the same async flow.
  const doRender = async (
    cid: string,
    fin: string,
    opts?: { service?: VisualizerService; sourcePath?: string },
  ) => {
    const src = opts?.sourcePath ?? sourcePath
    const svc = opts?.service ?? service
    if (!cid || !src || renderInFlight.current) return
    renderInFlight.current = true
    // A late instant preview from an older capture must not decorate this
    // render's progress screen (AR renders set their own gen at capture).
    if (renderSource.current !== 'ar') instantGen.current += 1
    setRendering(true)
    setRenderError('')
    const ctrl = new AbortController()
    renderAbort.current = ctrl
    setCancellable(true)
    try {
      const r = await requestRender(
        {
          sessionId,
          sourcePath: src,
          service: svc,
          colorId: cid,
          finish: fin,
        },
        { signal: ctrl.signal },
      )
      // The paid call is done — Cancel can no longer do anything real, so
      // hide it rather than leave a button that silently no-ops.
      setCancellable(false)
      if (ctrl.signal.aborted) throw new Error(RENDER_CANCELLED)
      // Decode both halves before the reveal so the slider isn't half-blank
      // on slow connections — the progress screen is still up and buys the
      // time. Capped so a broken image can't strand the user here.
      await Promise.race([
        Promise.all([preloadImage(r.beforeUrl), preloadImage(r.afterUrl)]),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ])
      const key = keyOf(svc, cid, fin)
      setResults((prev) => ({
        ...prev,
        [key]: { result: r, service: svc, colorId: cid, finish: fin },
      }))
      setActiveKey(key)
      setRenderIds((prev) => (prev.includes(r.renderId) ? prev : [...prev, r.renderId]))
      setFreeUsed(true)
      setStep('result')
      trackEvent('visualizer_render_success')
      if (renderSource.current === 'ar') trackEvent('ar_render_success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Render failed.'
      if (msg === RENDER_CANCELLED) {
        // User backed out — return to the design step quietly.
        trackEvent('visualizer_render_cancelled')
      } else if (msg === 'limit_reached') {
        trackEvent('visualizer_render_failed')
        if (leadCaptured) {
          setRenderError(
            'That’s the free limit for this session — we have your details and we’ll be in touch with more.',
          )
        } else {
          setRenderError(
            'That’s the free limit for now — leave your details and we’ll send you more.',
          )
          openGate('save')
        }
      } else {
        trackEvent('visualizer_render_failed')
        setRenderError(msg)
      }
    } finally {
      renderAbort.current = null
      setCancellable(false)
      renderInFlight.current = false
      setRendering(false)
    }
  }

  // Central entry: sets selection, then flips instantly (cached), gates, or renders.
  const startRender = (cid: string, fin: string) => {
    if (renderInFlight.current) return
    renderSource.current = 'ui'
    setColorId(cid)
    setFinish(fin)
    const cached = results[keyOf(service, cid, fin)]
    if (cached) {
      setActiveKey(keyOf(service, cid, fin))
      setStep('result')
      return
    }
    trackEvent('visualizer_render_requested')
    if (freeUsed && !leadCaptured) {
      openGate('continue')
      return
    }
    void doRender(cid, fin)
  }

  // AR shutter: captured frame + AR-selected look → the exact same pipeline
  // (upload → gate check → render → result). The live overlay was the preview;
  // this is the payoff.
  const onARCaptureRender = async (file: File, sel: ARSelection) => {
    setCameraOpen(false)
    setService(sel.service)
    setColorId(sel.colorId)
    setFinish(sel.finish)
    renderSource.current = 'ar'
    // Show the render progress screen through the upload phase too, so the
    // design step doesn't flash between camera and render.
    setRendering(true)
    // In parallel with upload+render: recolour the capture on-device and show
    // it while the photoreal render cooks. Best-effort — null on any failure.
    const gen = ++instantGen.current
    void makeInstantPreview(file, getColor(sel.colorId)?.hex ?? '#888888', sel.finish).then(
      (url) => {
        if (!url) return
        // Stale (a newer render context started, or we unmounted): discard.
        if (instantGen.current !== gen) {
          URL.revokeObjectURL(url)
          return
        }
        setInstantPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        trackEvent('ar_instant_preview_shown')
      },
    )
    const path = await uploadForRender(file)
    if (!path) {
      // Upload error stays visible on the upload step (camera opens from there).
      setRendering(false)
      return
    }
    setStep('design') // backdrop for the gate now + error/result fallback later
    trackEvent('visualizer_photo_added')
    trackEvent('visualizer_render_requested')
    if (freeUsed && !leadCaptured) {
      setRendering(false)
      openGate('continue')
      return
    }
    await doRender(sel.colorId, sel.finish, { service: sel.service, sourcePath: path })
  }

  // One-tap Look → clamp its finish to the current service, then render.
  const applyLook = (look: Look) => {
    const fin = FINISHES[service].includes(look.finish) ? look.finish : FINISHES[service][0]
    startRender(look.colorId, fin)
  }

  const onGateSubmit = async (d: {
    name: string
    phone: string
    email: string
    company: string
  }) => {
    await submitLead({
      sessionId,
      name: d.name,
      phone: d.phone,
      email: d.email || undefined,
      consent: true,
      renderIds,
      company: d.company,
    })
    const intent = gate.intent
    setLeadCaptured(true)
    setGateDismissed(false)
    setGate({ open: false, intent: 'continue' })
    trackEvent('visualizer_lead_captured')
    trackConversion(CONV_LABELS.form)
    if (intent === 'continue' && colorId) {
      const cached = results[keyOf(service, colorId, finish)]
      if (cached) {
        setActiveKey(keyOf(service, colorId, finish))
        setStep('result')
      } else {
        void doRender(colorId, finish)
      }
    } else if (intent === 'save') {
      // The save gate can be submitted from the design step (limit_reached):
      // clear the "leave your details" error it answered, and let the design
      // step show the confirmation the result step already has.
      setRenderError('')
      setSaved(true)
    }
  }

  const active = activeKey ? results[activeKey] : null

  const onDownload = async () => {
    if (!active) return
    setBusyAction('download')
    try {
      await downloadRender(active.result.afterUrl)
      trackEvent('visualizer_download')
    } catch {
      /* ignore */
    } finally {
      setBusyAction('')
    }
  }

  const onShare = async () => {
    if (!active) return
    setBusyAction('share')
    try {
      const outcome = await shareRender(active.result.afterUrl)
      trackEvent(outcome === 'shared' ? 'visualizer_share' : 'visualizer_share_fallback_download')
    } catch {
      /* ignore */
    } finally {
      setBusyAction('')
    }
  }

  const selectedColor = colorId ? getColor(colorId) : undefined
  const renderedKeys = Object.keys(results)
  const currentComboCached = Boolean(colorId && results[keyOf(service, colorId, finish)])

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {/* RENDERING — the "thinking" state, shown whenever a render is in flight */}
        {rendering && (
          <motion.div key="rendering" {...fade}>
            <RenderProgress
              previewUrl={previewUrl}
              instantPreviewUrl={instantPreviewUrl}
              serviceLabel={SERVICE_LABELS[service]}
              colorLabel={selectedColor?.label}
              colorHex={selectedColor?.hex}
              finish={finish}
              onCancel={cancellable ? () => renderAbort.current?.abort() : undefined}
            />
          </motion.div>
        )}

        {/* STEP 1 — UPLOAD */}
        {step === 'upload' && !rendering && (
          <motion.div key="upload" {...fade}>
            <StepLabel n={1} total={3} title="Add your room" />

            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
              {HOW_IT_WORKS.map(([n, t]) => (
                <div
                  key={n}
                  className="flex items-center gap-2 border border-brushly-gold/10 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brushly-gold/40 font-body text-[11px] text-brushly-gold">
                    {n}
                  </span>
                  <span className="font-body text-[12px] text-brushly-cream/70">{t}</span>
                </div>
              ))}
            </div>

            <Uploader
              onSelect={onFile}
              busy={uploading}
              busyLabel="Preparing your photo…"
              error={uploadError}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                trackEvent('visualizer_camera_open')
                trackEvent('ar_open')
                cameraKey.current += 1
                setCameraOpen(true)
              }}
              className="mt-3 flex w-full items-center justify-center gap-3 border border-brushly-gold/40 px-6 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              See colours live on your wall
            </button>
            <p className="mt-3 font-body text-[12px] text-brushly-cream/40">
              Tip: natural light and the whole wall in frame give the best results.
            </p>

            {sourcePath && (
              <button
                type="button"
                onClick={() => setStep('design')}
                className="mt-4 font-body text-[12px] uppercase tracking-[0.15em] text-brushly-gold/80 underline-offset-4 hover:underline"
              >
                ← Back to your design
              </button>
            )}

            <div className="mt-6">
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                No photo handy? Try a sample room
              </p>
              <div className="grid grid-cols-3 gap-3">
                {SAMPLES.map((s) => (
                  <button
                    key={s.src}
                    type="button"
                    disabled={uploading}
                    onClick={() => onSample(s.src)}
                    className="group relative overflow-hidden rounded-sm border border-brushly-gold/15 transition-colors duration-300 hover:border-brushly-gold/50 disabled:opacity-50"
                  >
                    <img src={s.src} alt={s.label} className="h-20 w-full object-cover" />
                    {busySample === s.src && (
                      <span className="absolute inset-0 flex items-center justify-center bg-brushly-black/50">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brushly-gold/30 border-t-brushly-gold" />
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-brushly-black/60 px-2 py-1 font-body text-[11px] text-brushly-cream/80 backdrop-blur-sm">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-6 font-body text-[12px] leading-relaxed text-brushly-cream/40">
              Your photo is used only to create your visualisation. It’s never sold or used to train
              AI, and is deleted after 30 days unless you become a client.
            </p>
          </motion.div>
        )}

        {/* STEP 2 — DESIGN */}
        {step === 'design' && !rendering && (
          <motion.div key="design" {...fade} className="flex flex-col gap-8">
            <StepLabel n={2} total={3} title="Choose your look" />

            {previewUrl && (
              <div>
                <img
                  src={previewUrl}
                  alt="Your room"
                  className="max-h-56 w-full rounded-sm object-cover"
                />
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="mt-2 font-body text-[12px] uppercase tracking-[0.15em] text-brushly-gold/80 underline-offset-4 hover:underline"
                >
                  Use a different photo
                </button>
              </div>
            )}

            <div>
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                What are we transforming?
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setService(s.id)
                      setFinish(FINISHES[s.id][0])
                    }}
                    className={`flex flex-col gap-1 border p-3 text-left transition-all duration-300 ${
                      service === s.id
                        ? 'border-brushly-gold bg-brushly-gold/5'
                        : 'border-brushly-gold/20 hover:border-brushly-gold/50'
                    }`}
                  >
                    <span className="font-display text-lg font-light text-brushly-cream">
                      {s.label}
                    </span>
                    <span className="font-body text-[11px] text-brushly-cream/50">{s.blurb}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                Pick a look, or browse colours
              </p>
              <ColorChooser colorId={colorId} onColor={setColorId} onLook={applyLook} />
            </div>

            <div>
              <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                Finish
              </p>
              <div className="flex flex-wrap gap-2">
                {FINISHES[service].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFinish(f)}
                    className={`border px-4 py-2 font-body text-[12px] transition-all duration-300 ${
                      finish === f
                        ? 'border-brushly-gold bg-brushly-gold/5 text-brushly-cream'
                        : 'border-brushly-gold/20 text-brushly-cream/60 hover:border-brushly-gold/50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {renderError && <p className="font-body text-[13px] text-red-400">{renderError}</p>}

            {gateDismissed && freeUsed && !leadCaptured && !saved && (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-brushly-gold/30 bg-brushly-gold/5 p-4">
                <p className="font-body text-[13px] text-brushly-cream/70">
                  Your free preview is used — add your details to keep trying colours.
                </p>
                <button
                  type="button"
                  onClick={() => openGate('continue')}
                  className="font-body text-[12px] font-medium uppercase tracking-[0.15em] text-brushly-gold underline-offset-4 hover:underline"
                >
                  Unlock more colours
                </button>
              </div>
            )}

            {saved && (
              <div role="status" className="border border-brushly-gold/30 bg-brushly-gold/5 p-5">
                <p className="font-display text-xl font-light text-brushly-cream">
                  Sent — thank you.
                </p>
                <p className="mt-2 font-body text-[14px] text-brushly-cream/60">
                  We’ll be in touch shortly with your visualisation and a free quote.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => colorId && startRender(colorId, finish)}
                disabled={!colorId}
                className="bg-brushly-gold px-10 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentComboCached ? 'See it again' : 'See it'}
              </button>
              {renderedKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!activeKey && renderedKeys[0]) setActiveKey(renderedKeys[0])
                    setStep('result')
                  }}
                  className="font-body text-[12px] uppercase tracking-[0.15em] text-brushly-gold/80 underline-offset-4 hover:underline"
                >
                  View my {renderedKeys.length} render{renderedKeys.length > 1 ? 's' : ''}
                </button>
              )}
              {!colorId && (
                <span className="font-body text-[12px] text-brushly-cream/40">
                  Tap a look, or pick a colour
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 3 — RESULT */}
        {step === 'result' && active && !rendering && (
          <motion.div key="result" {...fade} className="flex flex-col gap-6">
            <StepLabel n={3} total={3} title="Your room, reimagined" />

            <VisualBeforeAfter
              beforeSrc={active.result.beforeUrl}
              afterSrc={active.result.afterUrl}
            />

            {renderedKeys.length > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                  Compare
                </span>
                {renderedKeys.map((key) => {
                  const sr = results[key]
                  const c = getColor(sr.colorId)
                  if (!c) return null
                  const label = `${c.label} · ${sr.finish}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveKey(key)}
                      title={label}
                      aria-label={label}
                      aria-pressed={activeKey === key}
                      className={`h-9 w-9 rounded-full border transition-all ${
                        activeKey === key
                          ? 'scale-110 border-transparent ring-2 ring-brushly-gold ring-offset-2 ring-offset-brushly-charcoal'
                          : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ background: c.hex }}
                    />
                  )
                })}
              </div>
            )}

            {/* Describe the render actually on screen, not the design-step
                selection — they can differ after browsing other combos. */}
            <p className="font-body text-[13px] text-brushly-cream/60">
              {SERVICE_LABELS[active.service]}
              {` · ${getColor(active.colorId)?.label ?? active.colorId}`}
              {active.finish ? ` · ${active.finish}` : ''}
              <span className="mt-1 block text-[11px] text-brushly-cream/35">
                AI visualisation — we confirm exact colours at survey.
              </span>
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onDownload}
                disabled={busyAction !== ''}
                className="border border-brushly-gold/40 px-6 py-3 font-body text-[12px] font-medium uppercase tracking-[0.15em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black disabled:opacity-50"
              >
                {busyAction === 'download' ? 'Saving…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={onShare}
                disabled={busyAction !== ''}
                className="border border-brushly-gold/40 px-6 py-3 font-body text-[12px] font-medium uppercase tracking-[0.15em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black disabled:opacity-50"
              >
                {busyAction === 'share' ? 'Sharing…' : 'Share'}
              </button>
              <button
                type="button"
                onClick={() => setZoomUrl(active.result.afterUrl)}
                className="border border-brushly-gold/40 px-6 py-3 font-body text-[12px] font-medium uppercase tracking-[0.15em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black"
              >
                Full size
              </button>
            </div>

            {saved ? (
              <div className="border border-brushly-gold/30 bg-brushly-gold/5 p-5">
                <p className="font-display text-xl font-light text-brushly-cream">
                  Sent — thank you.
                </p>
                <p className="mt-2 font-body text-[14px] text-brushly-cream/60">
                  We’ll be in touch shortly with your visualisation and a free quote for this look.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 border-t border-brushly-gold/10 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('design')}
                  className="border border-brushly-gold/40 px-8 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black"
                >
                  Try another colour
                </button>
                <button
                  type="button"
                  onClick={() => (leadCaptured ? setSaved(true) : openGate('save'))}
                  className="bg-brushly-gold px-8 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light"
                >
                  Save &amp; get my free quote
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cameraOpen && (
          <ARCamera
            key={cameraKey.current}
            onCaptureRender={(file, sel) => void onARCaptureRender(file, sel)}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gate.open && (
          <SoftGate
            intent={gate.intent}
            onSubmit={onGateSubmit}
            onClose={() => {
              trackEvent('visualizer_gate_dismissed')
              if (gate.intent === 'continue') setGateDismissed(true)
              setGate((g) => ({ ...g, open: false }))
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomUrl && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-brushly-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomUrl(null)}
          >
            <img
              src={zoomUrl}
              alt="Full-size visualisation"
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomUrl(null)}
              aria-label="Close full-size view"
              className="absolute right-5 top-5 text-brushly-cream/70 transition-colors hover:text-brushly-cream"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StepLabel({ n, total, title }: { n: number; total: number; title: string }) {
  return (
    <div className="mb-6">
      <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-gold/70">
        Step {n} / {total}
      </span>
      <h2 className="mt-2 font-display text-3xl font-light text-brushly-cream md:text-4xl">
        {title}
      </h2>
    </div>
  )
}
