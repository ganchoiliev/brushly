'use client'

import { useRef, useEffect, useState } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'
import { readAttribution } from '@/lib/attribution'

gsap.registerPlugin(ScrollTrigger)

const serviceOptions = [
  'Interior Painting',
  'Exterior Painting',
  'Wallpapering',
  'Specialist Finishes',
  'Other',
]

export default function ContactForm() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (reduced) return
    // On touch devices (the paid mobile traffic) Lenis is skipped and native
    // scroll drives ScrollTrigger; skip the entrance reveal entirely so the
    // form is plain, always-visible HTML — no flash, and no way to be left
    // hidden by a missed/reversed trigger. Matches SmoothScroll's touch path.
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    if (isTouch) return
    const ctx = gsap.context(() => {
      // Desktop-only enhancement. immediateRender:false keeps the content
      // visible until the trigger actually fires, so a ScrollTrigger/Lenis
      // failure leaves it visible rather than stuck at opacity:0; once:true
      // reveals a single time and never reverses back to the hidden state.
      gsap.fromTo(
        '.contact-form-area > *',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power3.out',
          immediateRender: false,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setError('')

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      service: (form.elements.namedItem('service') as HTMLSelectElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
      attribution: readAttribution(),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setSubmitted(true)
        // Fire conversion only after the API confirms success.
        trackEvent('quote_form_submit')
        trackConversion(CONV_LABELS.form)
      } else {
        const result = await res.json()
        setError(result.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const inputStyles =
    'w-full bg-transparent border-b border-brushly-gold/20 py-4 text-[15px] font-body text-brushly-cream placeholder:text-brushly-cream/30 outline-none transition-colors duration-300 focus:border-brushly-gold'

  return (
    <section ref={sectionRef} className="bg-brushly-charcoal py-20 md:py-32">
      <Container>
        <div className="grid grid-cols-1 gap-20 md:grid-cols-2">
          {/* Form */}
          <div className="contact-form-area order-2 md:order-1">
            {submitted ? (
              <div className="flex min-h-[400px] flex-col items-start justify-center">
                <h3 className="font-display text-3xl font-light text-brushly-cream">
                  Thank you
                </h3>
                <p className="mt-4 text-[15px] font-body text-brushly-cream/60">
                  We&apos;ve received your message and will be in touch within 24
                  hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  required
                  className={inputStyles}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  required
                  className={inputStyles}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address (optional)"
                  className={inputStyles}
                />
                <select
                  name="service"
                  required
                  className={`${inputStyles} appearance-none cursor-pointer`}
                  defaultValue=""
                >
                  <option value="" disabled className="text-brushly-black">
                    Select a Service
                  </option>
                  {serviceOptions.map((opt) => (
                    <option key={opt} value={opt} className="text-brushly-black">
                      {opt}
                    </option>
                  ))}
                </select>
                <textarea
                  name="message"
                  placeholder="Tell us about your project..."
                  rows={4}
                  required
                  className={`${inputStyles} resize-none`}
                />
                {error && (
                  <p className="text-[14px] font-body text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="mt-4 self-start bg-brushly-gold px-10 py-4 text-[13px] font-body font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info — rendered above the form on mobile (order-1) so the
              phone/email/area sit first; restored to the right column on
              desktop (md:order-2). */}
          <div className="contact-form-area order-1 md:order-2 flex flex-col justify-center">
            <div className="flex flex-col gap-10">
              <div>
                <Badge>Phone</Badge>
                <a
                  href="tel:+441737479161"
                  onClick={() => {
                    trackEvent('phone_click')
                    trackConversion(CONV_LABELS.phone)
                  }}
                  className="mt-3 block font-display text-2xl font-light text-brushly-cream transition-colors hover:text-brushly-gold"
                >
                  01737 479 161
                </a>
              </div>
              <div>
                <Badge>Email</Badge>
                <a
                  href="mailto:hello@brushly.uk"
                  className="mt-3 block font-display text-2xl font-light text-brushly-cream transition-colors hover:text-brushly-gold"
                >
                  hello@brushly.uk
                </a>
              </div>
              <div>
                <Badge>Service Area</Badge>
                <p className="mt-3 font-display text-2xl font-light text-brushly-cream">
                  Surrey, Epsom &amp; Reigate
                </p>
                <p className="mt-2 text-[14px] font-body text-brushly-cream/50">
                  We also cover Dorking, Leatherhead, Cobham, Esher, Guildford,
                  and the surrounding areas.
                </p>
              </div>
              <div>
                <Badge>Hours</Badge>
                <p className="mt-3 text-[15px] font-body text-brushly-cream/70">
                  Monday &ndash; Friday: 8:00 &ndash; 17:00
                  <br />
                  Saturday: By appointment
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
