'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import qrcode from 'qrcode-generator'

interface Props {
  /** "use this device anyway" — run the normal webcam path on this device. */
  onProceed: () => void
  onClose: () => void
}

// Quiet zone baked into the SVG, in modules. Scanners want ~4 in total; the
// cream tile's padding supplies the rest.
const QUIET = 2

export default function LiveHandoffModal({ onProceed, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Only ever rendered client-side (opened on click), so window is available.
  // The QR is generated locally — one <path> of 1×1 squares per dark module,
  // crisp at any size and styled with brand tokens; no external QR service.
  const { d, n, host } = useMemo(() => {
    const liveUrl = `${window.location.origin}/visualizer?live=1`
    const code = qrcode(0, 'M')
    code.addData(liveUrl)
    code.make()
    const count = code.getModuleCount()
    let path = ''
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
      }
    }
    return { d: path, n: count, host: new URL(liveUrl).host }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brushly-black/70 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Open the live preview on your phone"
        className="w-full max-w-sm border border-brushly-gold/20 bg-brushly-charcoal p-8 shadow-2xl sm:rounded-sm"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-light text-brushly-cream">
            This works best on your phone.
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-brushly-cream/40 transition-colors hover:text-brushly-cream"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mb-6 font-body text-[14px] leading-relaxed text-brushly-cream/60">
          Scan the code with your phone camera and the live preview opens straight on your wall.
        </p>

        <div className="mx-auto w-fit rounded-sm bg-brushly-cream p-3">
          <svg
            viewBox={`${-QUIET} ${-QUIET} ${n + QUIET * 2} ${n + QUIET * 2}`}
            className="h-44 w-44"
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR code linking to ${host}/visualizer`}
          >
            <path d={d} className="fill-brushly-black" />
          </svg>
        </div>
        <p className="mt-3 text-center font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
          {host}/visualizer
        </p>

        <p className="mt-6 text-center font-body text-[12px] text-brushly-cream/50">
          or{' '}
          <button
            type="button"
            onClick={onProceed}
            className="underline underline-offset-4 transition-colors hover:text-brushly-cream"
          >
            use this device anyway
          </button>
        </p>
      </motion.div>
    </motion.div>
  )
}
