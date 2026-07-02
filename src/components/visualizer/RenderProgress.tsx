'use client'

/* eslint-disable @next/next/no-img-element */
// previewUrl is the user's local object URL — not a next/image candidate.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useReducedMotion from '@/hooks/useReducedMotion'

interface Props {
  previewUrl: string
  /** On-device recolour of the AR capture — shown instead of the plain photo. */
  instantPreviewUrl?: string | null
  serviceLabel: string
  colorLabel?: string
  colorHex?: string
  finish?: string
  /** Abort the in-flight render and return to the design step. */
  onCancel?: () => void
}

const MESSAGES = [
  'Reading your room’s light…',
  'Masking the walls…',
  'Mixing {colour}…',
  'Applying {finish}…',
  'Blending shadows and highlights…',
  'Final brushstrokes…',
]

export default function RenderProgress({
  previewUrl,
  instantPreviewUrl,
  serviceLabel,
  colorLabel,
  colorHex,
  finish,
  onCancel,
}: Props) {
  const reduced = useReducedMotion()
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(6)

  useEffect(() => {
    const mi = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2600)
    // Eased "fake" progress that approaches ~92% (Gemini gives no real progress);
    // the view is replaced by the result the moment the render returns.
    const pi = setInterval(
      () => setProgress((p) => (p < 92 ? p + Math.max(0.4, (92 - p) * 0.05) : p)),
      420,
    )
    return () => {
      clearInterval(mi)
      clearInterval(pi)
    }
  }, [])

  const msg = MESSAGES[msgIdx]
    .replace('{colour}', colorLabel || 'your colour')
    .replace('{finish}', (finish || 'the finish').toLowerCase())

  return (
    <div className="flex flex-col gap-6">
      {/* role=status announces the render starting to screen readers — after
          the AR shutter the camera dialog unmounts and focus lands on body. */}
      <div className="mb-2" role="status">
        <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-gold/70">
          Creating your visualisation
        </span>
        <h2 className="mt-2 font-display text-3xl font-light text-brushly-cream md:text-4xl">
          Painting your room…
        </h2>
      </div>

      <div
        className="relative overflow-hidden rounded-sm bg-brushly-black/40"
        style={{ aspectRatio: '4/3' }}
      >
        {/* Empty during the AR upload phase (progress shows before the photo
            is processed); the room fades in as soon as the preview exists.
            When the on-device recolour lands, it replaces the plain photo —
            already painted, so no darkening scrim or colour wash on top. */}
        {(instantPreviewUrl || previewUrl) && (
          <img
            src={instantPreviewUrl || previewUrl}
            alt="Your room"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className={`absolute inset-0 ${instantPreviewUrl ? 'bg-brushly-black/15' : 'bg-brushly-black/45'}`}
        />
        {colorHex && !instantPreviewUrl && (
          <div
            className="absolute inset-0 opacity-30 mix-blend-multiply"
            style={{ background: colorHex }}
          />
        )}
        {instantPreviewUrl && (
          <span className="absolute left-3 top-3 rounded-full bg-brushly-black/60 px-2.5 py-1 font-body text-[10px] uppercase tracking-[0.2em] text-brushly-cream/85 backdrop-blur-sm">
            Instant preview
          </span>
        )}

        {!reduced && (
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(200,169,110,0.35), transparent)',
            }}
            initial={{ x: '-120%' }}
            animate={{ x: '320%' }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-brushly-cream/20 border-t-brushly-gold" />
          {colorHex && (
            <div className="flex items-center gap-2 rounded-full bg-brushly-black/60 px-3 py-1.5 backdrop-blur-sm">
              <span
                className="h-4 w-4 rounded-full border border-white/20"
                style={{ background: colorHex }}
              />
              <span className="font-body text-[12px] text-brushly-cream/80">
                {colorLabel} · {serviceLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-brushly-cream/10">
          <motion.div
            className="h-full bg-brushly-gold"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: 0.4 }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <motion.span
            key={msgIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-body text-[13px] text-brushly-cream/60"
          >
            {msg}
          </motion.span>
          <span className="shrink-0 font-body text-[11px] text-brushly-cream/35">usually ~15s</span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 font-body text-[12px] uppercase tracking-[0.15em] text-brushly-cream/50 underline-offset-4 transition-colors hover:text-brushly-cream hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
