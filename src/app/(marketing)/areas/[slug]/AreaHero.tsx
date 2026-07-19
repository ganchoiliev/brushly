'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import PaintTexture from '@/components/ui/PaintTexture'

interface AreaHeroProps {
  headline: string
  headlineAccent: string
  intro: string
  postcode: string
  county: string
}

export default function AreaHero({
  headline,
  headlineAccent,
  intro,
  postcode,
  county,
}: AreaHeroProps) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.area-hero-content > *', {
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
      className="relative flex min-h-[60vh] items-end overflow-hidden bg-brushly-black pb-16 pt-40"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/img/services-hero.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-brushly-black/75" />
      </div>
      <PaintTexture variant="grain" opacity={0.06} />
      <Container>
        <div className="area-hero-content relative z-10 max-w-3xl">
          <Badge>
            Painter &amp; Decorator &middot; {postcode} &middot; {county}
          </Badge>
          <h1
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(38px, 6vw, 76px)' }}
          >
            {headline}
            <br />
            <span className="italic text-brushly-gold">{headlineAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
            {intro}
          </p>
        </div>
      </Container>
    </section>
  )
}
