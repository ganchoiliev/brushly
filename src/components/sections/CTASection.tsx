'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'

gsap.registerPlugin(ScrollTrigger)

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.cta-content', {
        y: 50,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-brushly-black py-32 md:py-44"
    >
      {/* Radial Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '800px',
          height: '800px',
          background:
            'radial-gradient(circle, rgba(200, 169, 110, 0.08) 0%, transparent 70%)',
        }}
      />

      <Container>
        <div className="cta-content relative z-10 mx-auto max-w-2xl text-center">
          <h2
            className="font-display font-light leading-tight text-brushly-cream"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            Ready to transform
            <br />
            <span className="italic text-brushly-gold">your space?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
            Let&apos;s discuss your project. From initial consultation to final
            inspection, we ensure every detail exceeds expectations.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href="/contact">Get a Free Quote</Button>
            <Button href="/gallery" variant="outline">
              View Our Work
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
