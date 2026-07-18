'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  intent: 'continue' | 'save' | 'quote'
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
  }, [])

  // Dismissal is blocked while the lead is submitting: the pending onSubmit
  // continuation would otherwise fire into a dismissed (or re-opened) gate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sending])

  const handle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = e.currentTarget
    const phone = (f.elements.namedItem('phone') as HTMLInputElement).value
    // Minimal sanity check — a fat-fingered number is a silently lost lead.
    if (phone.replace(/\D/g, '').length < 8) {
      setError('That phone number looks too short — please double-check it.')
      return
    }
    setSending(true)
    setError('')
    try {
      await onSubmit({
        name: (f.elements.namedItem('name') as HTMLInputElement).value,
        phone,
        email: (f.elements.namedItem('email') as HTMLInputElement).value,
        company: (f.elements.namedItem('company') as HTMLInputElement).value,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSending(false)
    }
  }

  const heading =
    intent === 'quote'
      ? 'Get your fixed quote'
      : intent === 'save'
        ? 'Send me my visualisation'
        : 'Keep experimenting'
  // "send", not "email" — email is optional; we can reach people by phone/SMS.
  const blurb =
    intent === 'quote'
      ? 'Pop in your details and we’ll come back with a fixed, no-obligation quote for this exact look — plus your visualisation to keep.'
      : intent === 'save'
        ? 'Pop in your details and we’ll send you your visualisation and a free, no-obligation quote for this exact look.'
        : 'Add your details to try more colours and finishes — we’ll send your visualisations and a free quote whenever you’re ready.'

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brushly-black/70 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => {
        if (!sending) onClose()
      }}
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
            disabled={sending}
            aria-label="Close"
            className="text-brushly-cream/40 transition-colors hover:text-brushly-cream disabled:cursor-not-allowed disabled:opacity-40"
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
            autoComplete="name"
            className={inputStyles}
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone number"
            required
            autoComplete="tel"
            inputMode="tel"
            className={inputStyles}
          />
          <input
            name="email"
            type="email"
            placeholder="Email address (optional)"
            autoComplete="email"
            className={inputStyles}
          />

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
            {sending
              ? 'Sending…'
              : intent === 'quote'
                ? 'Get my quote'
                : intent === 'save'
                  ? 'Send my visualisation'
                  : 'Continue'}
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
