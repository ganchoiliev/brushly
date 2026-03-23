'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ParallaxImage from '@/components/animations/ParallaxImage'

export default function AboutHero() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.about-hero-content > *', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={ref}
      className="relative flex min-h-[70vh] items-end overflow-hidden bg-brushly-black pb-20 pt-40"
    >
      <div className="absolute inset-0">
        <ParallaxImage
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80"
          alt="Beautiful interior"
          speed={0.15}
          priority
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-brushly-black/70" />
      <Container>
        <div className="about-hero-content relative z-10 max-w-2xl">
          <Badge>About Brushly</Badge>
          <h1
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            Built on
            <br />
            <span className="italic text-brushly-gold">craftsmanship</span>
          </h1>
        </div>
      </Container>
    </section>
  )
}
