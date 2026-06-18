'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'

const PHONE = '+441737479161'

export default function ContactHero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.contact-hero-content > *', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={ref} className="bg-brushly-black pb-20 pt-40">
      <Container>
        <div className="contact-hero-content max-w-2xl">
          <Badge>Get in Touch</Badge>
          <h1
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            Let&apos;s discuss
            <br />
            <span className="italic text-brushly-gold">your project</span>
          </h1>
          <p className="mt-6 text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
            Ready to transform your space? Get in touch for a free, no-obligation
            consultation and quote.
          </p>

          {/* Above-the-fold call action for mobile paid traffic — the phone
              number plus a primary tap-to-call button, visible without
              scrolling. Hidden on desktop, where the contact column already
              surfaces the number. */}
          <div className="mt-8 flex flex-col items-start gap-4 md:hidden">
            <a
              href={`tel:${PHONE}`}
              onClick={() => {
                trackEvent('phone_click')
                trackConversion(CONV_LABELS.phone)
              }}
              className="font-display text-3xl font-light text-brushly-cream transition-colors hover:text-brushly-gold"
            >
              01737 479 161
            </a>
            <a
              href={`tel:${PHONE}`}
              onClick={() => {
                trackEvent('phone_click')
                trackConversion(CONV_LABELS.phone)
              }}
              className="inline-flex min-h-[52px] items-center gap-2 bg-brushly-gold px-8 py-4 text-[13px] font-body font-semibold uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 active:bg-brushly-gold-dark"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-[18px] w-[18px] shrink-0"
                aria-hidden="true"
              >
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
              </svg>
              Call now
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
