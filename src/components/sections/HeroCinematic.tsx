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

function SplitText({ children, className = '' }: { children: string; className?: string }) {
  return (
    <>
      {children.split('').map((char, i) => (
        <span
          key={i}
          className={`char inline-block ${className}`}
          style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  )
}

export default function HeroCinematic() {
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activePalette, setActivePalette] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  const p = PALETTES[activePalette]

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // --- ENTRANCE ANIMATION ---
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.3 })

      // PHASE 1: Left side background wipe-in from left
      tl.fromTo('.hero-left-bg-reveal',
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 1, duration: 1.0, ease: 'power3.inOut' }
      )

      // PHASE 2: Video reveals with a dramatic vertical wipe (bottom to top)
      .fromTo('.hero-image-mask',
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'power3.inOut' },
        '-=0.6'
      )

      // PHASE 3: Location fades in while video is still revealing
      .from('.hero-location', {
        y: 15,
        opacity: 0,
        duration: 0.5,
      }, '-=0.6')

      // PHASE 4: Headline — LETTER BY LETTER reveal
      .from('.hero-line-premium .char', {
        yPercent: 100,
        opacity: 0,
        rotateX: 40,
        stagger: 0.03,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.2')

      .from('.hero-line-painting .char', {
        yPercent: 100,
        opacity: 0,
        rotateX: 40,
        stagger: 0.03,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5')

      .from('.hero-line-decorating .char', {
        yPercent: 100,
        opacity: 0,
        rotateX: 40,
        stagger: 0.02,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5')

      // PHASE 5: Supporting content fades in
      .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
      .from('.hero-swatches', { y: 15, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.hero-cta-group', { y: 15, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.hero-scroll-hint', { opacity: 0, duration: 0.4 }, '-=0.1')

      // --- SCROLL EFFECTS (Aventura-style) ---

      gsap.to('.hero-scroll-hint', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '10% top',
          end: '18% top',
          scrub: true,
        },
      })

      gsap.to('.hero-mobile-scroll-hint', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '5% top',
          end: '15% top',
          scrub: true,
        },
      })

      gsap.to('.hero-left-panel', {
        width: 0,
        opacity: 0,
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '15% top',
          end: '55% top',
          scrub: true,
        },
      })

      gsap.to('.hero-image-mask', {
        width: '100%',
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '15% top',
          end: '55% top',
          scrub: true,
        },
      })

      gsap.to('.hero-image-inner', {
        scale: 1.15,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to('.hero-scroll-overlay', {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: '45% top',
          end: '60% top',
          scrub: true,
        },
      })

    }, heroRef)

    return () => ctx.revert()
  }, [])

  // --- VIDEO AUTOPLAY (desktop only) ---
  useEffect(() => {
    if (isMobile) return
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
  }, [isMobile])

  return (
    <section
      ref={heroRef}
      className="relative" style={{ height: '250vh' }}
    >
      {/* h-screen with dvh fallback for iOS Safari address bar */}
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden md:flex-row" style={{ height: '100dvh' }}>
      {/* --- LEFT SIDE --- */}
      <div
        className="hero-left-panel relative z-20 flex w-full flex-col justify-between px-6 pt-24 pb-8 md:w-1/2 md:px-12 lg:px-16"
        style={{ backgroundColor: '#1A1A1A', flexShrink: 0 }}
      >
        {/* Background wipe reveal */}
        <div
          className="hero-left-bg-reveal absolute inset-0 z-0"
          style={{ backgroundColor: p.bg, transformOrigin: 'left center' }}
        />

        {/* All content wrapped for z-index */}
        <div className="relative z-10 flex h-full flex-col justify-between overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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
        <div className="hero-left-fade my-auto py-6">
          <div className="overflow-hidden pb-[0.15em]">
            <h1
              className="hero-line hero-line-premium font-display font-light whitespace-nowrap"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.text,
                transition: 'color 0.8s ease',
                perspective: '600px',
              }}
            >
              <SplitText>Premium</SplitText>
            </h1>
          </div>
          <div className="overflow-hidden pb-[0.15em]">
            <h1
              className="hero-line hero-line-painting font-display font-light italic whitespace-nowrap"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.accent,
                transition: 'color 0.8s ease',
                perspective: '600px',
              }}
            >
              <SplitText>Painting</SplitText>
            </h1>
          </div>
          <div className="overflow-hidden pb-[0.15em]">
            <h1
              className="hero-line hero-line-decorating font-display font-light whitespace-nowrap"
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)',
                lineHeight: 0.9,
                color: p.text,
                transition: 'color 0.8s ease',
                perspective: '600px',
              }}
            >
              <SplitText>{'& Decorating'}</SplitText>
            </h1>
          </div>

          {/* Tagline */}
          <p
            className="hero-tagline mt-6 max-w-sm font-body text-[15px] leading-relaxed"
            style={{ color: p.textMuted, transition: 'color 0.8s ease' }}
          >
            We combine skilled craftsmanship with an artist&apos;s touch.
            Designing spaces that are as refined as they are enduring.
          </p>

          {/* --- SWATCHES --- */}
          <div className="hero-swatches mt-5">
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
                  className="group relative flex h-11 w-11 items-center justify-center"
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
          <div className="hero-cta-group mt-6 flex items-center gap-6">
            <MagneticButton>
              <a
                href="/contact"
                className="inline-block px-6 py-3 font-body text-[11px] uppercase tracking-[0.2em] transition-all duration-500"
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
        <div className="hero-scroll-hint hidden md:block">
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
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="hero-image-mask relative flex-1 overflow-hidden" style={{ minHeight: '50vh' }}>
        <div className="hero-image-inner absolute inset-0" style={{ transformOrigin: 'center center', willChange: 'transform' }}>
          {/* Video layer — desktop only to save mobile memory */}
          {!isMobile && (
            <video
              ref={videoRef}
              className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
            >
              <source src="/videos/hero.mp4" type="video/mp4" />
            </video>
          )}

          {/* Fallback image */}
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80"
              alt="Premium interior"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
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

        {/* Scroll overlay text */}
        <div className="hero-scroll-overlay absolute inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ opacity: 0 }}>
          {/* Dark vignette for readability */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
          <div className="relative z-10 text-center">
            <p className="font-body text-[13px] uppercase tracking-[0.5em] text-white/70">
              Transforming Surrey homes
            </p>
            <p className="mt-4 font-display font-light text-white leading-tight" style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}>
              Since 2015
            </p>
            <div className="mx-auto mt-6 h-[1px] w-16 bg-brushly-gold/60" />
          </div>
        </div>
      </div>

      {/* --- MOBILE SCROLL INDICATOR (CSS-only, no GSAP dependency) --- */}
      <div
        className="hero-mobile-scroll-hint absolute bottom-8 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-2 md:hidden"
        style={{
          animation: 'fadeInUp 0.6s ease-out 1.5s both',
        }}
      >
        <span className="font-body text-[10px] uppercase tracking-[0.25em] text-white/70">
          Scroll to explore
        </span>
        <svg
          width="16"
          height="24"
          viewBox="0 0 16 24"
          fill="none"
          style={{ animation: 'gentleBounce 2s ease-in-out infinite' }}
        >
          <path
            d="M8 4L8 18M8 18L14 12M8 18L2 12"
            stroke="rgba(200,169,110,0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* CSS keyframes for mobile scroll hint */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
      </div>
    </section>
  )
}
