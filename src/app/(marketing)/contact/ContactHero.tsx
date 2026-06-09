'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

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
        </div>
      </Container>
    </section>
  )
}
