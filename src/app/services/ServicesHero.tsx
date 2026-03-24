'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import PaintTexture from '@/components/ui/PaintTexture'

export default function ServicesHero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.services-hero-content > *', {
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
    <section
      ref={ref}
      className="relative flex min-h-[70vh] items-end overflow-hidden bg-brushly-black pb-20 pt-40"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-brushly-black/70" />
      </div>
      <PaintTexture variant="grain" opacity={0.06} />
      <Container>
        <div className="services-hero-content relative z-10 max-w-2xl">
          <Badge>Our Services</Badge>
          <h1
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            Craftsmanship in
            <br />
            <span className="italic text-brushly-gold">every stroke</span>
          </h1>
          <p className="mt-6 text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
            From meticulous preparation to flawless finishing, every project
            receives the same uncompromising standard of care.
          </p>
        </div>
      </Container>
    </section>
  )
}
