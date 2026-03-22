'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

export default function GalleryHero() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gallery-hero-content > *', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={ref}
      className="relative flex min-h-[60vh] items-end overflow-hidden bg-brushly-black pb-20 pt-40"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-brushly-black/70" />
      </div>
      <Container>
        <div className="gallery-hero-content relative z-10 max-w-2xl">
          <Badge>Portfolio</Badge>
          <h1
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            Our Work
          </h1>
          <p className="mt-6 text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
            A selection of recent projects showcasing our commitment to
            exceptional craftsmanship.
          </p>
        </div>
      </Container>
    </section>
  )
}
