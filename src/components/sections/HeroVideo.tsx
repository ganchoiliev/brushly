'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import Badge from '@/components/ui/Badge'

export default function HeroVideo() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.hero-badge', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
      })
        .from(
          '.hero-heading .word',
          {
            yPercent: 110,
            opacity: 0,
            stagger: 0.06,
            duration: 1,
          },
          '-=0.4'
        )
        .from(
          '.hero-body',
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
          },
          '-=0.5'
        )
        .from(
          '.hero-scroll',
          {
            opacity: 0,
            duration: 0.6,
          },
          '-=0.3'
        )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brushly-black"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-brushly-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-32 text-center md:px-10 lg:px-16">
        <div className="hero-badge">
          <Badge>Premium Painting &amp; Decorating</Badge>
        </div>

        <h1
          className="hero-heading mt-6 font-display font-light leading-[1.05] text-brushly-cream"
          style={{ fontSize: 'clamp(40px, 7vw, 96px)' }}
        >
          <span className="inline-block overflow-hidden">
            <span className="word inline-block">Walls</span>
          </span>{' '}
          <span className="inline-block overflow-hidden">
            <span className="word inline-block">That</span>
          </span>{' '}
          <span className="inline-block overflow-hidden">
            <span className="word inline-block">Speak</span>
          </span>{' '}
          <span className="inline-block overflow-hidden">
            <span className="word inline-block italic text-brushly-gold">
              Volumes
            </span>
          </span>
        </h1>

        <p
          className="hero-body mx-auto mt-8 max-w-xl font-body font-light leading-relaxed text-brushly-cream/70"
          style={{ fontSize: 'clamp(15px, 1.2vw, 18px)' }}
        >
          Flawless finishes for homes and businesses that demand more than just a
          coat of paint.
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll absolute bottom-10 right-10 flex flex-col items-center gap-3">
        <span className="text-[11px] font-body uppercase tracking-[0.3em] text-brushly-cream/40 [writing-mode:vertical-lr]">
          Scroll
        </span>
        <div className="h-12 w-[1px] overflow-hidden bg-brushly-cream/20">
          <div
            className="h-full w-full bg-brushly-gold"
            style={{ animation: 'scrollDown 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </section>
  )
}
