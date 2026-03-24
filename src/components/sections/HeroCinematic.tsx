'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '@/components/animations/MagneticButton'

gsap.registerPlugin(ScrollTrigger)

const PALETTES = [
  {
    name: 'Classic Cream',
    bg: '#F5F0EB',
    accent: '#C8A96E',
    text: '#1A1A1A',
    textMuted: 'rgba(26,26,26,0.5)',
    textLabel: 'rgba(26,26,26,0.35)',
    swatch: '#F5F0EB',
    swatchBorder: 'rgba(26,26,26,0.15)',
    btnBg: '#1A1A1A',
    btnText: '#F5F0EB',
    dark: false,
  },
  {
    name: 'Sage Green',
    bg: '#4A5D4A',
    accent: '#D4BC8B',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.6)',
    textLabel: 'rgba(245,240,235,0.35)',
    swatch: '#8B9D77',
    swatchBorder: 'none',
    btnBg: '#F5F0EB',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Navy Depth',
    bg: '#1E2D3D',
    accent: '#C8A96E',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.55)',
    textLabel: 'rgba(245,240,235,0.3)',
    swatch: '#2C3E50',
    swatchBorder: 'none',
    btnBg: '#C8A96E',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Warm Charcoal',
    bg: '#2D2A26',
    accent: '#C8A96E',
    text: '#F5F0EB',
    textMuted: 'rgba(245,240,235,0.5)',
    textLabel: 'rgba(245,240,235,0.3)',
    swatch: '#2D2D2D',
    swatchBorder: 'none',
    btnBg: '#C8A96E',
    btnText: '#1A1A1A',
    dark: true,
  },
  {
    name: 'Blush Pink',
    bg: '#E8D5CC',
    accent: '#A68B5B',
    text: '#2D2A26',
    textMuted: 'rgba(45,42,38,0.5)',
    textLabel: 'rgba(45,42,38,0.35)',
    swatch: '#D4B5A7',
    swatchBorder: 'rgba(26,26,26,0.1)',
    btnBg: '#2D2A26',
    btnText: '#F5F0EB',
    dark: false,
  },
]

export default function HeroCinematic() {
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activePalette, setActivePalette] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)

  const p = PALETTES[activePalette]

  // --- ENTRANCE ANIMATION ---
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 })

      // Image/video reveal
      tl.fromTo('.hero-image-mask',
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'power3.inOut' }
      )
      // Left content stagger
      .from('.hero-location', { y: 20, opacity: 0, duration: 0.6 }, '-=0.8')
      .from('.hero-line', {
        yPercent: 120,
        opacity: 0,
        stagger: 0.1,
        duration: 1.2,
      }, '-=0.5')
      .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
      .from('.hero-swatches', { y: 15, opacity: 0, duration: 0.5 }, '-=0.4')
      .from('.hero-cta-group', { y: 15, opacity: 0, duration: 0.5 }, '-=0.3')
      .from('.hero-scroll-hint', { opacity: 0, duration: 0.4 }, '-=0.2')

      // --- SCROLL EFFECTS ---

      // "Painting" drifts right on scroll
      gsap.to('.hero-line-painting', {
        x: 100,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      })

      // "& Decorating" drifts left on scroll
      gsap.to('.hero-line-decorating', {
        x: -70,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      })

      // Location fades first
      gsap.to('.hero-location', {
        y: -30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '25% top',
          scrub: true,
        },
      })

      // Left content fades on scroll
      gsap.to('.hero-left-fade', {
        y: -80,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '30% top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Video zooms on scroll
      gsap.to('.hero-image-inner', {
        scale: 1.12,
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
  }, [])

  // --- VIDEO AUTOPLAY ---
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col overflow-hidden md:flex-row"
    >
      {/* --- LEFT SIDE --- */}
      <div
        className="relative z-20 flex w-full flex-col justify-between px-6 py-20 md:w-1/2 md:px-12 lg:px-20"
        style={{
          backgroundColor: p.bg,
          transition: 'background-color 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Location */}
        <div className="hero-location">
          <span
            className="font-body text-[11px] uppercase tracking-[0.3em]"
            style={{ color: p.textLabel, transition: 'color 0.8s ease' }}
          >
            Based in:
          </span>
          <div
            className="mt-2 font-body text-[14px] font-medium"
            style={{ color: p.text, transition: 'color 0.8s ease' }}
          >
            Surrey &middot; Epsom &middot; Reigate
          </div>
        </div>

        {/* --- HEADLINE --- */}
        <div className="hero-left-fade my-auto py-16">
          <div className="overflow-hidden">
            <h1
              className="hero-line hero-line-premium font-display font-light"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.text,
                transition: 'color 0.8s ease',
              }}
            >
              Premium
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1
              className="hero-line hero-line-painting font-display font-light italic"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.accent,
                transition: 'color 0.8s ease',
              }}
            >
              Painting
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1
              className="hero-line hero-line-decorating font-display font-light"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.text,
                transition: 'color 0.8s ease',
              }}
            >
              &amp; Decorating
            </h1>
          </div>

          {/* Tagline */}
          <p
            className="hero-tagline mt-10 max-w-sm font-body text-[15px] leading-relaxed"
            style={{ color: p.textMuted, transition: 'color 0.8s ease' }}
          >
            We combine skilled craftsmanship with an artist&apos;s touch.
            Designing spaces that are as refined as they are enduring.
          </p>

          {/* --- SWATCHES --- */}
          <div className="hero-swatches mt-8">
            <span
              className="font-body text-[10px] uppercase tracking-[0.2em]"
              style={{ color: p.textLabel, transition: 'color 0.8s ease' }}
            >
              Visualise your space:
            </span>
            <div className="mt-3 flex items-center gap-3">
              {PALETTES.map((palette, i) => (
                <button
                  key={palette.name}
                  onClick={() => setActivePalette(i)}
                  className="group relative"
                  title={palette.name}
                >
                  <div
                    className="h-8 w-8 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: palette.swatch,
                      border: palette.swatchBorder !== 'none' ? `1px solid ${palette.swatchBorder}` : '1px solid rgba(255,255,255,0.15)',
                      transform: activePalette === i ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: activePalette === i
                        ? `0 0 0 2px ${palette.bg}, 0 0 0 4px ${palette.accent}`
                        : 'none',
                    }}
                  />
                  {/* Name tooltip */}
                  <span
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-body text-[9px] uppercase tracking-[0.15em] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: p.textLabel }}
                  >
                    {palette.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="hero-cta-group mt-10 flex items-center gap-6">
            <MagneticButton>
              <a
                href="/contact"
                className="inline-block px-8 py-4 font-body text-[12px] uppercase tracking-[0.2em] transition-all duration-500"
                style={{
                  backgroundColor: p.btnBg,
                  color: p.btnText,
                }}
              >
                Get a Quote
              </a>
            </MagneticButton>
            <a
              href="/gallery"
              className="font-body text-[12px] uppercase tracking-[0.15em] transition-colors duration-500"
              style={{ color: p.textMuted }}
            >
              View our work &rarr;
            </a>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="hero-scroll-hint">
          <div className="flex items-center gap-3">
            <div
              className="h-[1px] w-8 transition-colors duration-800"
              style={{ backgroundColor: p.textLabel }}
            />
            <span
              className="font-body text-[10px] uppercase tracking-[0.2em]"
              style={{ color: p.textLabel, transition: 'color 0.8s ease' }}
            >
              Scroll to explore
            </span>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="hero-image-mask relative w-full overflow-hidden md:w-1/2" style={{ minHeight: '50vh' }}>
        <div className="hero-image-inner absolute inset-0" style={{ transformOrigin: 'center center' }}>
          {/* Video layer */}
          <video
            ref={videoRef}
            className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setVideoLoaded(true)}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>

          {/* Fallback image */}
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80"
              alt="Premium interior"
              fill
              priority
              className="object-cover"
              sizes="50vw"
            />
          </div>
        </div>

        {/* Color wash overlay */}
        <div
          className="absolute inset-0 z-20 transition-all duration-1000"
          style={{
            backgroundColor: p.accent,
            opacity: activePalette === 0 ? 0 : 0.1,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 z-20 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Watermark */}
        <div className="absolute bottom-8 right-8 z-20">
          <span className="font-display text-[140px] font-light leading-none text-white/5">
            B
          </span>
        </div>
      </div>
    </section>
  )
}
