'use client'

import { useEffect, useRef, useState } from 'react'
import {
  lazyInit,
  segmentWall,
  acquireSession,
  releaseSession,
  getActiveProvider,
  getActiveModel,
  INTERIOR_CLASSES,
  EXTERIOR_CLASSES,
  type ExecutionProvider,
} from '@/lib/visualizer/segmentation'
import { DEFAULT_TUNING } from '@/lib/visualizer/liveMath'
import { FINISHES, PALETTE_BY_SPECTRUM, getColor } from '@/lib/visualizer/palette'
import type { CompositorMode } from '@/components/visualizer/liveCompositor'
import useLiveWallPreview, { type LiveStats } from '@/components/visualizer/useLiveWallPreview'

// ?ep=wasm|webgl|webgpu forces a provider (debug page only).
function providerOverride(): ExecutionProvider[] | undefined {
  const ep = new URLSearchParams(window.location.search).get('ep')
  return ep === 'wasm' || ep === 'webgl' || ep === 'webgpu' ? [ep] : undefined
}

const SAMPLES = [
  '/img/interior.webp',
  '/img/modern_kitchen.webp',
  '/img/hallway.webp',
  '/img/exterior.webp',
]
const GOLD: [number, number, number] = [200, 169, 110]
const BLEND = 0.55
const MAX_CANVAS_WIDTH = 900

interface Stats {
  initMs: number
  inferMs: number
  wallPct: number
  provider: string
}

const SIM_W = 800
const SIM_H = 600
const MODES: CompositorMode[] = ['auto', 'webgl', '2d']

export default function SegmentationDebug() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const simFileRef = useRef<HTMLInputElement>(null)
  const initMs = useRef(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'error'>('loading')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)

  // ---- Live AR loop simulation: canvas.captureStream stands in for the
  // camera so the full useLiveWallPreview path runs without hardware. The
  // debug flags keep the loop alive on wasm and past the fps guard, so the
  // compositor is inspectable on machines without WebGPU. ----
  const simVideoRef = useRef<HTMLVideoElement>(null)
  const simOverlayRef = useRef<HTMLCanvasElement>(null)
  const [simOn, setSimOn] = useState(false)
  const [simColorId, setSimColorId] = useState('green-smoke')
  const [simStats, setSimStats] = useState<LiveStats | null>(null)
  const [simSrc, setSimSrc] = useState<string>(SAMPLES[0])
  const [mode, setMode] = useState<CompositorMode>('auto')
  const [showMask, setShowMask] = useState(false)
  const [simFinish, setSimFinish] = useState<string>(FINISHES.interior[0])
  // Interior walls vs exterior facade — applies to the still path AND the sim.
  const [target, setTarget] = useState<'interior' | 'exterior'>('interior')
  const [feather, setFeather] = useState(DEFAULT_TUNING.feather)
  const [temporalBase, setTemporalBase] = useState(DEFAULT_TUNING.temporalBase)
  const [tintStrength, setTintStrength] = useState(DEFAULT_TUNING.tintStrength)
  const [edgeSigma, setEdgeSigma] = useState(DEFAULT_TUNING.edgeSigma)

  const simColor = getColor(simColorId) ?? PALETTE_BY_SPECTRUM[0]
  const simStatus = useLiveWallPreview({
    videoRef: simVideoRef,
    canvasRef: simOverlayRef,
    active: simOn,
    // Mask view: hot magenta at full strength shows exactly what the model +
    // smoothing consider "wall", separating segmentation errors from
    // compositing errors.
    colorHex: showMask ? '#FF00FF' : simColor.hex,
    finish: simFinish,
    onStats: setSimStats,
    tuning: {
      feather,
      temporalBase,
      tintStrength: showMask ? 1 : tintStrength,
      edgeSigma,
    },
    targetClasses: target === 'exterior' ? EXTERIOR_CLASSES : INTERIOR_CLASSES,
    compositorMode: mode,
    debugAllowAnyProvider: true,
    debugDisableFpsGuard: true,
  })

  useEffect(() => {
    if (!simOn) return
    // The sim <video> mounts in the same commit that sets simOn, so the ref is
    // populated by the time this effect runs; captured once for the cleanup.
    const video = simVideoRef.current
    let cancelled = false
    let raf = 0
    let stream: MediaStream | null = null
    const setup = async () => {
      const img = new Image()
      img.src = simSrc
      await img.decode()
      if (cancelled) return
      const source = document.createElement('canvas')
      source.width = SIM_W
      source.height = SIM_H
      const ctx = source.getContext('2d')
      if (!ctx || !video) return
      const t0 = performance.now()
      const drawFrame = () => {
        // Slow pan + zoom ≈ handheld drift — proves the mask tracks movement.
        const t = (performance.now() - t0) / 1000
        const zoom = 1.12 + 0.04 * Math.sin(t * 0.7)
        const w = SIM_W * zoom
        const h = SIM_H * zoom
        const dx = (SIM_W - w) / 2 + Math.sin(t * 0.9) * SIM_W * 0.04
        const dy = (SIM_H - h) / 2 + Math.cos(t * 0.6) * SIM_H * 0.03
        ctx.drawImage(img, dx, dy, w, h)
        raf = requestAnimationFrame(drawFrame)
      }
      drawFrame()
      stream = source.captureStream(20)
      video.muted = true
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // autoplay of a muted programmatic stream shouldn't be blocked
      }
    }
    void setup()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      if (video) video.srcObject = null
      setSimStats(null)
    }
  }, [simOn, simSrc])

  // Model lifecycle == page lifecycle: load on enter, dispose on exit.
  // Init is deferred a tick so StrictMode's mount→cleanup→mount doesn't start
  // a doomed duplicate init (the cleanup clears the timer before it fires).
  useEffect(() => {
    let cancelled = false
    acquireSession()
    const timer = setTimeout(() => {
      const t0 = performance.now()
      lazyInit(providerOverride())
        .then(() => {
          if (cancelled) return
          initMs.current = Math.round(performance.now() - t0)
          setStatus('ready')
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setError(e instanceof Error ? e.message : 'Model failed to load.')
          setStatus('error')
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
      void releaseSession()
    }
  }, [])

  const run = async (src: string | File) => {
    const canvas = canvasRef.current
    if (!canvas || status === 'running' || status === 'loading' || simOn) return
    setStatus('running')
    setError('')
    const url = typeof src === 'string' ? src : URL.createObjectURL(src)
    try {
      // Retry after a failed init: re-init with the SAME ?ep override (not the
      // default chain) and report the real load time instead of a stale 0ms.
      if (!getActiveProvider()) {
        const t0 = performance.now()
        await lazyInit(providerOverride())
        initMs.current = Math.round(performance.now() - t0)
      }
      const img = new Image()
      img.src = url
      await img.decode()
      const scale = Math.min(1, MAX_CANVAS_WIDTH / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D is unavailable.')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const t0 = performance.now()
      const { mask, width, height } = await segmentWall(
        canvas,
        target === 'exterior' ? EXTERIOR_CLASSES : INTERIOR_CLASSES,
      )
      const inferMs = Math.round(performance.now() - t0)

      const frame = ctx.getImageData(0, 0, width, height)
      let wallCount = 0
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue
        wallCount++
        const p = i * 4
        frame.data[p] = Math.round(frame.data[p] * (1 - BLEND) + GOLD[0] * BLEND)
        frame.data[p + 1] = Math.round(frame.data[p + 1] * (1 - BLEND) + GOLD[1] * BLEND)
        frame.data[p + 2] = Math.round(frame.data[p + 2] * (1 - BLEND) + GOLD[2] * BLEND)
      }
      ctx.putImageData(frame, 0, 0)

      setStats({
        initMs: initMs.current,
        inferMs,
        wallPct: Math.round((wallCount / mask.length) * 100),
        provider: `${getActiveProvider() ?? 'unknown'}/${getActiveModel() ?? '?'}`,
      })
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Segmentation failed.')
      setStatus('error')
    } finally {
      if (typeof src !== 'string') URL.revokeObjectURL(url)
    }
  }

  const onSimUpload = (f: File) => {
    if (simSrc.startsWith('blob:')) URL.revokeObjectURL(simSrc)
    setSimSrc(URL.createObjectURL(f))
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-gold/70">
        Dev only
      </span>
      <h1 className="mt-2 font-display text-3xl font-light text-brushly-cream">
        Wall segmentation debug
      </h1>
      <p className="mt-2 font-body text-[13px] text-brushly-cream/50">
        Runs the on-device ADE20K model on a still and paints the wall mask in gold.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={status === 'running' || status === 'loading' || simOn}
            onClick={() => void run(s)}
            className="border border-brushly-gold/30 transition-colors duration-300 hover:border-brushly-gold disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local debug thumbnails */}
            <img src={s} alt="Sample room" className="h-16 w-24 object-cover" />
          </button>
        ))}
        <button
          type="button"
          disabled={status === 'running' || status === 'loading' || simOn}
          onClick={() => fileRef.current?.click()}
          className="border border-brushly-gold/40 px-5 py-3 font-body text-[12px] uppercase tracking-[0.15em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black disabled:opacity-50"
        >
          Upload a photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void run(f)
            e.target.value = ''
          }}
        />
      </div>

      <p className="mt-4 font-body text-[13px] text-brushly-cream/60">
        {status === 'loading' && 'Loading model…'}
        {status === 'running' && 'Segmenting…'}
        {status === 'ready' && !stats && 'Model ready — pick a sample or upload a photo.'}
        {stats && status !== 'running' && (
          <span data-testid="seg-stats">
            provider <b className="text-brushly-gold">{stats.provider}</b> · load+warmup{' '}
            <b className="text-brushly-gold">{stats.initMs}ms</b> · inference{' '}
            <b className="text-brushly-gold">{stats.inferMs}ms</b> · wall{' '}
            <b className="text-brushly-gold">{stats.wallPct}%</b>
          </span>
        )}
      </p>
      {error && <p className="mt-2 font-body text-[13px] text-red-400">{error}</p>}

      <canvas ref={canvasRef} className="mt-6 max-w-full rounded-sm" data-testid="seg-canvas" />

      <div className="mt-12 border-t border-brushly-gold/10 pt-8">
        <h2 className="font-display text-xl font-light text-brushly-cream">
          Live preview simulation
        </h2>
        <p className="mt-1 font-body text-[12px] text-brushly-cream/50">
          Streams a panning sample photo through canvas.captureStream to exercise the live AR
          loop (segment → smooth → recolour → composite) without a camera. Runs on any provider
          with the fps guard off, so it works — slowly — even on wasm.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setSimOn((v) => !v)}
            className="border border-brushly-gold/40 px-5 py-3 font-body text-[12px] uppercase tracking-[0.15em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold hover:text-brushly-black"
          >
            {simOn ? 'Stop simulation' : 'Start live simulation'}
          </button>
          <span data-testid="sim-status" className="font-body text-[13px] text-brushly-cream/60">
            status <b className="text-brushly-gold">{simStatus}</b>
            {simStats && (
              <span data-testid="sim-stats">
                {' '}
                · last pass <b className="text-brushly-gold">{simStats.inferMs}ms</b> · model rate{' '}
                <b className="text-brushly-gold">{simStats.fps}fps</b> · input{' '}
                <b className="text-brushly-gold">{simStats.inputSize}</b> · compositor{' '}
                <b className="text-brushly-gold">{simStats.compositor ?? '—'}</b> · draw{' '}
                <b className="text-brushly-gold">{simStats.drawFps}fps</b> · wallLum{' '}
                <b className="text-brushly-gold">{simStats.wallLum}</b> · maskConf{' '}
                <b className="text-brushly-gold">{simStats.maskConfidence}</b>
              </span>
            )}
          </span>
        </div>

        {/* Compositor A/B + mask view. The overlay canvas is keyed by mode:
            a canvas is permanently claimed by its first context type, so
            switching webgl↔2d must mount a fresh element. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
            Target
          </span>
          {(['interior', 'exterior'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              aria-pressed={target === t}
              className={`border px-3 py-1.5 font-body text-[12px] transition-colors duration-200 ${
                target === t
                  ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-cream'
                  : 'border-brushly-gold/25 text-brushly-cream/60 hover:border-brushly-gold/60'
              }`}
            >
              {t === 'interior' ? 'Interior walls' : 'Exterior facade'}
            </button>
          ))}
          <span className="ml-4 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
            Compositor
          </span>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`border px-3 py-1.5 font-body text-[12px] transition-colors duration-200 ${
                mode === m
                  ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-cream'
                  : 'border-brushly-gold/25 text-brushly-cream/60 hover:border-brushly-gold/60'
              }`}
            >
              {m}
            </button>
          ))}
          <label className="ml-4 flex items-center gap-2 font-body text-[12px] text-brushly-cream/70">
            <input
              type="checkbox"
              checked={showMask}
              onChange={(e) => setShowMask(e.target.checked)}
            />
            Mask view
          </label>
          <label className="ml-4 flex items-center gap-2 font-body text-[12px] text-brushly-cream/70">
            Finish
            <select
              value={simFinish}
              onChange={(e) => setSimFinish(e.target.value)}
              className="border border-brushly-gold/25 bg-transparent px-2 py-1 text-brushly-cream"
            >
              {FINISHES.interior.map((f) => (
                <option key={f} value={f} className="bg-brushly-charcoal">
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid max-w-xl grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {(
            [
              ['Feather', feather, 0.25, 4, 0.25, setFeather],
              ['EMA base', temporalBase, 0.05, 0.9, 0.05, setTemporalBase],
              ['Tint', tintStrength, 0, 1, 0.05, setTintStrength],
              ['Edge σ', edgeSigma, 0.01, 0.3, 0.01, setEdgeSigma],
            ] as const
          ).map(([label, value, min, max, step, set]) => (
            <label key={label} className="font-body text-[11px] text-brushly-cream/60">
              {label} <b className="text-brushly-gold">{value}</b>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                className="mt-1 w-full accent-[#C8A96E]"
              />
            </label>
          ))}
        </div>

        {simOn && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {SAMPLES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSimSrc(s)}
                  aria-pressed={simSrc === s}
                  className={`border transition-colors duration-200 ${
                    simSrc === s ? 'border-brushly-gold' : 'border-brushly-gold/25'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local debug thumbnails */}
                  <img src={s} alt={`Sim sample ${i + 1}`} className="h-10 w-16 object-cover" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => simFileRef.current?.click()}
                className="border border-brushly-gold/25 px-3 py-2 font-body text-[11px] uppercase tracking-[0.15em] text-brushly-cream/70 hover:border-brushly-gold/60"
              >
                Upload
              </button>
              <input
                ref={simFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onSimUpload(f)
                  e.target.value = ''
                }}
              />
            </div>

            <div className="relative mt-4 aspect-[4/3] w-full max-w-xl overflow-hidden rounded-sm border border-brushly-gold/15">
              <video
                ref={simVideoRef}
                muted
                playsInline
                autoPlay
                className="absolute inset-0 h-full w-full object-cover"
              />
              <canvas
                key={mode}
                ref={simOverlayRef}
                data-testid="sim-overlay"
                className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${
                  simStatus === 'on' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
            <div className="scrollbar-none mt-3 flex max-w-xl gap-2 overflow-x-auto py-1.5">
              {PALETTE_BY_SPECTRUM.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSimColorId(c.id)}
                  aria-label={c.label}
                  title={c.label}
                  className={`h-8 w-8 shrink-0 rounded-full transition-all duration-150 ${
                    simColorId === c.id
                      ? 'scale-110 ring-2 ring-brushly-gold'
                      : 'border border-white/20 hover:scale-105'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            <p className="mt-2 font-body text-[12px] text-brushly-cream/50">
              {simColor.label} · {simColor.brand}
            </p>
          </>
        )}
      </div>
    </main>
  )
}
