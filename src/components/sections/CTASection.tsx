'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import PaintTexture from '@/components/ui/PaintTexture'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import TextReveal from '@/components/animations/TextReveal'

gsap.registerPlugin(ScrollTrigger)

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.cta-content', {
        y: 50,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })

      gsap.from('.cta-slider', {
        y: 60,
        opacity: 0,
        duration: 1.2,
        delay: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-brushly-black py-32 md:py-44"
    >
      {/* Paint texture overlay */}
      <PaintTexture variant="brush-strokes" opacity={0.03} />

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
        <div className="relative z-10 grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Before/After Slider */}
          <div className="cta-slider will-animate order-2 lg:order-1">
            <BeforeAfterSlider
              beforeSrc="https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&q=80"
              afterSrc="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80"
              beforeAlt="Room before painting"
              afterAlt="Room after Brushly transformation"
              className="rounded-sm"
            />
            <p className="mt-4 text-center text-[12px] font-body uppercase tracking-[0.2em] text-brushly-cream/40">
              Drag to compare &middot; Living room transformation
            </p>
          </div>

          {/* CTA Content */}
          <div className="cta-content will-animate order-1 text-center lg:order-2 lg:text-left">
            <TextReveal
              as="h2"
              className="font-display font-light leading-tight text-brushly-cream"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
              staggerDelay={0.03}
            >
              See the difference craftsmanship makes
            </TextReveal>
            <p className="mx-auto mt-6 max-w-lg text-[16px] font-body font-light leading-relaxed text-brushly-cream/60 lg:mx-0">
              Every project begins with a free consultation. From colour selection to final inspection, we ensure every detail exceeds expectations.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:justify-center">
              <Button href="/contact">Get a Free Quote</Button>
              <Button href="/gallery" variant="outline">
                View Our Work
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
