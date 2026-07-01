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
  type RenderResult,
} from '@/lib/visualizer/client'
import { downloadRender, shareRender } from '@/lib/visualizer/share'
import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'
import Uploader from './Uploader'
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

export default function VisualizerWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [sessionId, setSessionId] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [sourcePath, setSourcePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [service, setService] = useState<VisualizerService>('interior')
  const [colorId, setColorId] = useState<string>()
  const [finish, setFinish] = useState<string>(FINISHES.interior[0])

  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState('')

  // Multi-colour: keep every render this session, keyed by colour id, so flipping
  // between already-rendered colours is instant (and free).
  const [results, setResults] = useState<Record<string, RenderResult>>({})
  const [activeColorId, setActiveColorId] = useState<string | null>(null)
  const [renderIds, setRenderIds] = useState<string[]>([])

  const [freeUsed, setFreeUsed] = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [gate, setGate] = useState<{ open: boolean; intent: 'continue' | 'save' }>({
    open: false,
    intent: 'continue',
  })
  const [saved, setSaved] = useState(false)
  const [busyAction, setBusyAction] = useState<'' | 'download' | 'share'>('')
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  const prevUrl = useRef('')

  useEffect(() => {
    setSessionId(getSessionId())
    trackEvent('visualizer_open')
  }, [])

  const onFile = async (file: File) => {
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
      setActiveColorId(null)
      setStep('design')
      trackEvent('visualizer_photo_added')
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Instant demo: load an existing room photo through the same pipeline.
  const onSample = async (src: string) => {
    if (uploading) return
    try {
      const resp = await fetch(src)
      const blob = await resp.blob()
      const file = new File([blob], 'sample.jpg', { type: blob.type || 'image/webp' })
      trackEvent('visualizer_sample_used')
      await onFile(file)
    } catch {
      setUploadError('Could not load the sample — please upload your own photo.')
    }
  }

  const doRender = async (cid: string, fin: string) => {
    if (!cid || !sourcePath) return
    setRendering(true)
    setRenderError('')
    try {
      const r = await requestRender({ sessionId, sourcePath, service, colorId: cid, finish: fin })
      setResults((prev) => ({ ...prev, [cid]: r }))
      setActiveColorId(cid)
      setRenderIds((prev) => (prev.includes(r.renderId) ? prev : [...prev, r.renderId]))
      setFreeUsed(true)
      setStep('result')
      trackEvent('visualizer_render_success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Render failed.'
      setRenderError(
        msg === 'limit_reached'
          ? 'That’s the free limit for now — leave your details and we’ll send you more.'
          : msg,
      )
      if (msg === 'limit_reached') setGate({ open: true, intent: 'save' })
    } finally {
      setRendering(false)
    }
  }

  // Central entry: sets selection, then flips instantly (cached), gates, or renders.
  const startRender = (cid: string, fin: string) => {
    setColorId(cid)
    setFinish(fin)
    if (results[cid]) {
      setActiveColorId(cid)
      setStep('result')
      return
    }
    trackEvent('visualizer_render_requested')
    if (freeUsed && !leadCaptured) {
      setGate({ open: true, intent: 'continue' })
      return
    }
    void doRender(cid, fin)
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
    setGate({ open: false, intent: 'continue' })
    trackEvent('visualizer_lead_captured')
    trackConversion(CONV_LABELS.form)
    if (intent === 'continue' && colorId) void doRender(colorId, finish)
    else if (intent === 'save') setSaved(true)
  }

  const onDownload = async () => {
    const r = activeColorId ? results[activeColorId] : null
    if (!r) return
    setBusyAction('download')
    try {
      await downloadRender(r.afterUrl)
      trackEvent('visualizer_download')
    } catch {
      /* ignore */
    } finally {
      setBusyAction('')
    }
  }

  const onShare = async () => {
    const r = activeColorId ? results[activeColorId] : null
    if (!r) return
    setBusyAction('share')
    try {
      await shareRender(r.afterUrl)
      trackEvent('visualizer_share')
    } catch {
      /* ignore */
    } finally {
      setBusyAction('')
    }
  }

  const selectedColor = colorId ? getColor(colorId) : undefined
  const activeResult = activeColorId ? results[activeColorId] : null
  const renderedIds = Object.keys(results)

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {/* RENDERING — the "thinking" state, shown whenever a render is in flight */}
        {rendering && (
          <motion.div key="rendering" {...fade}>
            <RenderProgress
              previewUrl={previewUrl}
              serviceLabel={SERVICE_LABELS[service]}
              colorLabel={selectedColor?.label}
              colorHex={selectedColor?.hex}
              finish={finish}
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
            <p className="mt-3 font-body text-[12px] text-brushly-cream/40">
              Tip: natural light and the whole wall in frame give the best results.
            </p>

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
              <img
                src={previewUrl}
                alt="Your room"
                className="max-h-56 w-full rounded-sm object-cover"
              />
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

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => colorId && startRender(colorId, finish)}
                disabled={!colorId}
                className="bg-brushly-gold px-10 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {colorId && results[colorId] ? 'See it again' : 'See it'}
              </button>
              {renderedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!activeColorId && renderedIds[0]) setActiveColorId(renderedIds[0])
                    setStep('result')
                  }}
                  className="font-body text-[12px] uppercase tracking-[0.15em] text-brushly-gold/80 underline-offset-4 hover:underline"
                >
                  View my {renderedIds.length} render{renderedIds.length > 1 ? 's' : ''}
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
        {step === 'result' && activeResult && !rendering && (
          <motion.div key="result" {...fade} className="flex flex-col gap-6">
            <StepLabel n={3} total={3} title="Your room, reimagined" />

            <VisualBeforeAfter beforeSrc={activeResult.beforeUrl} afterSrc={activeResult.afterUrl} />

            {renderedIds.length > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
                  Compare
                </span>
                {renderedIds.map((cid) => {
                  const c = getColor(cid)
                  if (!c) return null
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => setActiveColorId(cid)}
                      title={c.label}
                      className={`h-9 w-9 rounded-full border transition-all ${
                        activeColorId === cid
                          ? 'scale-110 border-transparent ring-2 ring-brushly-gold ring-offset-2 ring-offset-brushly-charcoal'
                          : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ background: c.hex }}
                    />
                  )
                })}
              </div>
            )}

            <p className="font-body text-[13px] text-brushly-cream/60">
              {SERVICE_LABELS[service]}
              {selectedColor ? ` · ${selectedColor.label}` : ''}
              {finish ? ` · ${finish}` : ''}
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
                onClick={() => activeResult && setZoomUrl(activeResult.afterUrl)}
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
                  onClick={() =>
                    leadCaptured ? setSaved(true) : setGate({ open: true, intent: 'save' })
                  }
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
        {gate.open && (
          <SoftGate
            intent={gate.intent}
            onSubmit={onGateSubmit}
            onClose={() => setGate((g) => ({ ...g, open: false }))}
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
