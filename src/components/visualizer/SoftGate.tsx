'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  intent: 'continue' | 'save'
  onSubmit: (d: { name: string; phone: string; email: string; company: string }) => Promise<void>
  onClose: () => void
}

const inputStyles =
  'w-full bg-transparent border-b border-brushly-gold/20 py-3 text-[15px] font-body text-brushly-cream placeholder:text-brushly-cream/30 outline-none transition-colors duration-300 focus:border-brushly-gold'

export default function SoftGate({ intent, onSubmit, onClose }: Props) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const f = e.currentTarget
    try {
      await onSubmit({
        name: (f.elements.namedItem('name') as HTMLInputElement).value,
        phone: (f.elements.namedItem('phone') as HTMLInputElement).value,
        email: (f.elements.namedItem('email') as HTMLInputElement).value,
        company: (f.elements.namedItem('company') as HTMLInputElement).value,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSending(false)
    }
  }

  const heading = intent === 'save' ? 'Send me my visualisation' : 'Keep experimenting'
  const blurb =
    intent === 'save'
      ? 'Pop in your details and we’ll email your visualisation and a free, no-obligation quote for this exact look.'
      : 'Add your details to try more colours and finishes — we’ll email your visualisations and a free quote whenever you’re ready.'

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brushly-black/70 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md border border-brushly-gold/20 bg-brushly-charcoal p-8 shadow-2xl sm:rounded-sm"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-light text-brushly-cream">{heading}</h3>
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

        <p className="mb-6 font-body text-[14px] leading-relaxed text-brushly-cream/60">{blurb}</p>

        <form onSubmit={handle} className="flex flex-col gap-5">
          <input
            ref={firstRef}
            name="name"
            type="text"
            placeholder="Your name"
            required
            className={inputStyles}
          />
          <input name="phone" type="tel" placeholder="Phone number" required className={inputStyles} />
          <input name="email" type="email" placeholder="Email address (optional)" className={inputStyles} />

          {/* Honeypot — hidden from humans, bots fill it. */}
          <input
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {error && <p className="font-body text-[13px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="mt-2 bg-brushly-gold px-8 py-4 font-body text-[13px] font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'Sending…' : intent === 'save' ? 'Send my visualisation' : 'Continue'}
          </button>

          <p className="font-body text-[11px] leading-relaxed text-brushly-cream/40">
            By continuing you agree we can use your photo to create your visualisation and contact
            you about your project. We never sell your data or train AI on it, and photos are deleted
            after 30 days unless you become a client.
          </p>
        </form>
      </motion.div>
    </motion.div>
  )
}
