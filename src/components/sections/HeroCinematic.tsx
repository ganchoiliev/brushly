'use client'

import { useRef, useEffect, useState } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import { blurDataURL } from '@/lib/shimmer'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '@/components/animations/MagneticButton'
import { useTheme, PALETTES } from '@/lib/ThemeContext'

gsap.registerPlugin(ScrollTrigger)

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
  const brushVideoRef = useRef<HTMLVideoElement>(null)
  const { activePalette, setActivePalette, palette: p } = useTheme()
  const [videoLoaded, setVideoLoaded] = useState(false)
  const reduced = useReducedMotion()
  const [isMobile, setIsMobile] = useState(true)

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // --- ENTRANCE ANIMATION ---
  useEffect(() => {
    if (reduced) return
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

      // --- RESPONSIVE SCROLL ANIMATIONS ---
      const mm = gsap.matchMedia()

      mm.add("(min-width: 768px)", () => {
        // Desktop: left panel shrinks, image expands
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

        // Desktop video crossfade: brush → consultation video
        gsap.to('.hero-video-consultation', {
          opacity: 0,
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: heroRef.current,
            start: '20% top',
            end: '45% top',
            scrub: true,
          },
        })

        gsap.to('.hero-video-brush', {
          opacity: 1,
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: heroRef.current,
            start: '20% top',
            end: '45% top',
            scrub: true,
          },
        })
      })

      mm.add("(max-width: 767px)", () => {
        // Mobile: left panel fades out + slides up to reveal full-viewport video
        gsap.to('.hero-left-panel', {
          opacity: 0,
          y: -60,
          ease: 'power1.inOut',
          scrollTrigger: {
            trigger: heroRef.current,
            start: '10% top',
            end: '40% top',
            scrub: true,
          },
        })
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

      // Staggered reveal for overlay inner elements
      const overlayTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: '55% top',
          end: '70% top',
          scrub: true,
        },
      })

      overlayTl
        .from('.overlay-bracket', { opacity: 0, scale: 0.5, stagger: 0.05, duration: 0.3 })
        .from('.overlay-label', { opacity: 0, y: -15, duration: 0.3 }, '<0.1')
        .from('.overlay-headline', { opacity: 0, y: 30, duration: 0.4 }, '<0.1')
        .from('.overlay-divider', { scaleX: 0, duration: 0.3 }, '<0.15')
        .from('.overlay-stats', { opacity: 0, y: 20, duration: 0.3 }, '<0.1')
        .from('.overlay-ring', { opacity: 0, scale: 0.5, duration: 0.3 }, '<')

    }, heroRef)

    return () => ctx.revert()
  }, [reduced])

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

  // --- BRUSH VIDEO AUTOPLAY (desktop only) ---
  useEffect(() => {
    const video = brushVideoRef.current
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
      className="relative" style={{ height: '250vh' }}
    >
      {/* h-screen with dvh fallback for iOS Safari address bar */}
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden md:flex-row" style={{ height: '100dvh' }}>
      {/* --- LEFT SIDE --- */}
      <div
        className="hero-left-panel relative z-20 flex w-full flex-1 md:flex-initial flex-col justify-between px-6 pt-20 pb-6 md:w-1/2 md:px-10 lg:px-14"
        style={{ backgroundColor: '#1A1A1A', flexShrink: 0 }}
      >
        {/* Background wipe reveal */}
        <div
          className="hero-left-bg-reveal absolute inset-0 z-0"
          style={{ backgroundColor: p.bg, transformOrigin: 'left center' }}
        />

        {/* All content wrapped for z-index */}
        <div className="relative z-10 flex min-h-0 h-full flex-col justify-between">
        {/* Location */}
        <div className="hero-location shrink-0">
          <span
            className="font-body text-[11px] uppercase tracking-[0.3em]"
            style={{ color: p.textLabel, transition: 'color 0.8s ease' }}
          >
            Based in:
          </span>
          <div
            className="mt-1.5 font-body text-[14px] font-medium"
            style={{ color: p.text, transition: 'color 0.8s ease' }}
          >
            Surrey &middot; Epsom &middot; Reigate
          </div>
        </div>

        {/* --- HEADLINE --- */}
        <div className="hero-left-fade my-auto py-4">
          <div className="overflow-hidden pb-[0.1em]">
            <h1
              className="hero-line hero-line-premium font-display font-light whitespace-nowrap"
              style={{
                fontSize: 'clamp(42px, 6.5vw, 110px)',
                lineHeight: 0.9,
                color: p.text,
                transition: 'color 0.8s ease',
                perspective: '600px',
              }}
            >
              <SplitText>Premium</SplitText>
            </h1>
          </div>
          <div className="overflow-hidden pb-[0.1em]">
            <h1
              className="hero-line hero-line-painting font-display font-light italic whitespace-nowrap"
              style={{
                fontSize: 'clamp(42px, 6.5vw, 110px)',
                lineHeight: 0.9,
                color: p.accent,
                transition: 'color 0.8s ease',
                perspective: '600px',
              }}
            >
              <SplitText>Painting</SplitText>
            </h1>
          </div>
          <div className="overflow-hidden pb-[0.1em]">
            <h1
              className="hero-line hero-line-decorating font-display font-light whitespace-nowrap"
              style={{
                fontSize: 'clamp(42px, 6.5vw, 110px)',
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
            className="hero-tagline mt-4 max-w-sm font-body text-[14px] leading-relaxed"
            style={{ color: p.textMuted, transition: 'color 0.8s ease' }}
          >
            We combine skilled craftsmanship with an artist&apos;s touch.
            Designing spaces that are as refined as they are enduring.
          </p>

          {/* --- SWATCHES --- */}
          <div className="hero-swatches mt-4">
            <span
              className="font-body text-[10px] uppercase tracking-[0.2em]"
              style={{ color: p.textLabel, transition: 'color 0.8s ease' }}
            >
              Visualise your space:
            </span>
            <div className="mt-2.5 flex items-center gap-2.5">
              {PALETTES.map((palette, i) => (
                <button
                  key={palette.name}
                  onClick={() => setActivePalette(i)}
                  className="group relative flex h-10 w-10 items-center justify-center"
                  title={palette.name}
                >
                  <div
                    className="h-7 w-7 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: palette.swatch,
                      border: palette.swatchBorder !== 'none' ? `1px solid ${palette.swatchBorder}` : '1px solid rgba(255,255,255,0.15)',
                      transform: activePalette === i ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: activePalette === i
                        ? `0 0 0 2px ${palette.bg}, 0 0 0 3px ${palette.accent}`
                        : 'none',
                    }}
                  />
                  {/* Name tooltip */}
                  <span
                    className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-body text-[9px] uppercase tracking-[0.15em] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: p.textLabel }}
                  >
                    {palette.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="hero-cta-group mt-5 flex items-center gap-5">
            <MagneticButton>
              <a
                href="/contact"
                className="inline-block px-5 py-2.5 font-body text-[11px] uppercase tracking-[0.2em] transition-all duration-500"
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
        <div className="hero-scroll-hint hidden shrink-0 md:block">
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

      {/* --- RIGHT SIDE / FULL-VIEWPORT VIDEO (mobile: absolute bg, desktop: flex child) --- */}
      <div className="hero-image-mask overflow-hidden absolute inset-0 z-[5] md:relative md:inset-auto md:z-auto md:flex-1 md:min-h-[50vh]">
        <div className="hero-image-inner absolute inset-0" style={{ transformOrigin: 'center center', willChange: 'transform' }}>

          {/* Desktop: Brush video (visible on load, fades out on scroll) */}
          <video
            ref={videoRef}
            className="hero-video-consultation absolute inset-0 z-20 h-full w-full object-cover hidden md:block"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>

          {/* Desktop: Consultation video (hidden initially, fades in on scroll via GSAP) */}
          <video
            ref={brushVideoRef}
            className="hero-video-brush absolute inset-0 z-10 h-full w-full object-cover hidden md:block"
            style={{ opacity: 0 }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/videos/hero-desktop.mp4" type="video/mp4" />
          </video>

          {/* Mobile: Single video (brush video as full-viewport background) */}
          <video
            className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-1000 md:hidden ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setVideoLoaded(true)}
            onPlaying={() => setVideoLoaded(true)}
          >
            <source src="/videos/hero-mobile.mp4" type="video/mp4" />
          </video>

          {/* Fallback image */}
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80"
              alt="Premium interior"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL={blurDataURL}
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

      {/* Scroll overlay — cinematic editorial reveal (covers full viewport) */}
      <div className="hero-scroll-overlay absolute inset-0 z-40 flex items-center justify-center pointer-events-none" style={{ opacity: 0 }}>
        {/* Dark vignette layers — lighter on mobile so video shows through */}
        <div className="absolute inset-0 bg-black/40 md:bg-black/60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />

        {/* Large background monogram */}
        <span
          className="absolute font-display font-light leading-none select-none"
          style={{
            fontSize: 'clamp(200px, 35vw, 500px)',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(200,169,110,0.04)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          B
        </span>

        {/* Corner brackets */}
        {[
          { pos: 'top-6 left-6 md:top-10 md:left-10', rotate: 0 },
          { pos: 'top-6 right-6 md:top-10 md:right-10', rotate: 90 },
          { pos: 'bottom-6 right-6 md:bottom-10 md:right-10', rotate: 180 },
          { pos: 'bottom-6 left-6 md:bottom-10 md:left-10', rotate: 270 },
        ].map((corner, ci) => (
          <div key={ci} className={`overlay-bracket absolute ${corner.pos} z-20`}
            style={{ transform: `rotate(${corner.rotate}deg)` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M0 16V0H16" stroke="rgba(200,169,110,0.25)" strokeWidth="0.75" />
            </svg>
          </div>
        ))}

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center px-6">
          {/* Top label */}
          <div className="overlay-label flex items-center gap-4">
            <div className="h-px w-8 bg-brushly-gold/40" />
            <span className="font-body text-[10px] uppercase tracking-[0.4em] text-white/50">
              Est. 2015
            </span>
            <div className="h-px w-8 bg-brushly-gold/40" />
          </div>

          {/* Headline */}
          <h2
            className="overlay-headline mt-5 font-display font-light text-white text-center leading-[0.95]"
            style={{ fontSize: 'clamp(36px, 7vw, 90px)' }}
          >
            Transforming
            <br />
            <span className="italic" style={{ color: '#C8A96E' }}>Surrey</span> Homes
          </h2>

          {/* Gold divider */}
          <div className="overlay-divider mx-auto mt-6 h-px w-20 origin-center" style={{ backgroundColor: 'rgba(200,169,110,0.5)' }} />

          {/* Stats row */}
          <div className="overlay-stats mt-8 flex items-center gap-6 md:gap-10">
            {[
              { number: '500+', label: 'Projects' },
              { number: '10+', label: 'Years' },
              { number: '100%', label: 'Satisfaction' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="block font-display text-[28px] md:text-[36px] font-light text-brushly-gold leading-none">
                  {stat.number}
                </span>
                <span className="mt-1.5 block font-body text-[9px] uppercase tracking-[0.25em] text-white/40">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rotating ring ornament */}
        <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-20">
          <svg className="overlay-ring" width="60" height="60" viewBox="0 0 60 60" style={{ animation: 'overlayRingSpin 30s linear infinite' }}>
            <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(200,169,110,0.1)" strokeWidth="0.5" strokeDasharray="6 8" />
            <circle cx="30" cy="30" r="20" fill="none" stroke="rgba(200,169,110,0.06)" strokeWidth="0.5" strokeDasharray="3 6" />
          </svg>
        </div>
      </div>

      {/* --- MOBILE SCROLL INDICATOR (modern mouse wheel style) --- */}
      <div
        className="hero-mobile-scroll-hint absolute bottom-1 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-4 md:hidden"
        style={{
          animation: 'scrollHintFadeIn 0.8s ease-out 1.8s both',
        }}
      >
        {/* Mouse wheel icon */}
        <div
          className="relative flex items-start justify-center"
          style={{
            width: '24px',
            height: '38px',
            borderRadius: '12px',
            border: '1.5px solid rgba(200,169,110,0.4)',
          }}
        >
          {/* Animated scroll dot */}
          <div
            style={{
              width: '3px',
              height: '8px',
              borderRadius: '1.5px',
              backgroundColor: 'rgba(200,169,110,0.8)',
              marginTop: '8px',
              animation: 'scrollDot 2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
            }}
          />
        </div>

        {/* Subtle trailing line */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'linear-gradient(to bottom, rgba(200,169,110,0.3), transparent)',
            animation: 'lineGrow 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* CSS keyframes */}
      <style jsx>{`
        @keyframes scrollHintFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes scrollDot {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          50% {
            opacity: 0.3;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes lineGrow {
          0%, 100% {
            opacity: 0.4;
            transform: scaleY(0.6);
            transform-origin: top;
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
            transform-origin: top;
          }
        }
        @keyframes overlayRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-mobile-scroll-hint * {
            animation: none !important;
          }
        }
      `}</style>
      </div>
    </section>
  )
}
