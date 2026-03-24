'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import Image from 'next/image'
import gsap from 'gsap'
import MagneticButton from '@/components/animations/MagneticButton'

export default function HeroSplit() {
  const heroRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.5 })

      // Image reveal
      tl.fromTo('.hero-image-mask',
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 1.4, ease: 'power3.inOut' }
      )
      // Left content staggers
      .from('.hero-location', { y: 20, opacity: 0, duration: 0.7 }, '-=0.8')
      .from('.hero-line-1', { yPercent: 110, opacity: 0, duration: 1 }, '-=0.6')
      .from('.hero-line-2', { yPercent: 110, opacity: 0, duration: 1 }, '-=0.8')
      .from('.hero-line-3', { yPercent: 110, opacity: 0, duration: 1 }, '-=0.8')
      .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
      .from('.hero-cta', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
      .from('.hero-scroll-hint', { opacity: 0, duration: 0.5 }, '-=0.2')

      // Subtle parallax on image
      gsap.to('.hero-image-inner', {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
    }, heroRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={heroRef} className="relative flex min-h-screen flex-col md:flex-row">
      {/* LEFT — Content */}
      <div className="relative z-10 flex w-full flex-col justify-between bg-brushly-cream px-6 py-24 md:w-1/2 md:px-12 lg:px-20">
        {/* Top — location */}
        <div className="hero-location">
          <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-black/40">
            Based in:
          </span>
          <div className="mt-2 font-body text-[14px] font-medium text-brushly-black">
            Surrey<br />
            Epsom<br />
            Reigate
          </div>
        </div>

        {/* Center — Main headline */}
        <div className="my-auto py-20">
          <div className="overflow-hidden">
            <h1 className="hero-line-1 font-display font-light text-brushly-black" style={{ fontSize: 'clamp(48px, 8vw, 120px)', lineHeight: 0.95 }}>
              Premium
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1 className="hero-line-2 font-display font-light italic text-brushly-gold-dark" style={{ fontSize: 'clamp(48px, 8vw, 120px)', lineHeight: 0.95 }}>
              Painting
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1 className="hero-line-3 font-display font-light text-brushly-black" style={{ fontSize: 'clamp(48px, 8vw, 120px)', lineHeight: 0.95 }}>
              &amp; Decorating
            </h1>
          </div>
        </div>

        {/* Bottom — tagline and CTA */}
        <div>
          <p className="hero-tagline max-w-sm font-body text-[15px] leading-relaxed text-brushly-black/50">
            We combine skilled craftsmanship with an artist&apos;s touch. Designing spaces that are as refined as they are enduring.
          </p>
          <div className="hero-cta mt-8">
            <MagneticButton>
              <a
                href="/contact"
                className="inline-block bg-brushly-black px-8 py-4 font-body text-[12px] uppercase tracking-[0.2em] text-brushly-cream transition-colors duration-300 hover:bg-brushly-gold-dark"
              >
                Get a Quote
              </a>
            </MagneticButton>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="hero-scroll-hint absolute bottom-8 left-6 md:left-12 lg:left-20">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-brushly-black/20" />
            <span className="font-body text-[10px] uppercase tracking-[0.2em] text-brushly-black/30">
              Scroll to explore
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT — Image */}
      <div className="hero-image-mask relative w-full overflow-hidden md:w-1/2" style={{ minHeight: '50vh' }}>
        <div className="hero-image-inner absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80"
            alt="Premium interior painting result"
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
        </div>
        {/* Subtle gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-brushly-black/20 to-transparent" />
      </div>
    </section>
  )
}
