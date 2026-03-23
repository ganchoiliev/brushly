'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import Badge from '@/components/ui/Badge'

export default function HeroVideo() {
  const heroRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)

  // Intersection-triggered video play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => setVideoError(true))
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  // Hero entrance animation (delayed for page transition)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.6 })

      tl.from('.hero-badge', { y: 30, opacity: 0, duration: 0.8 })
        .from('.hero-heading .word', { yPercent: 110, opacity: 0, stagger: 0.06, duration: 1 }, '-=0.4')
        .from('.hero-body', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.hero-scroll', { opacity: 0, duration: 0.6 }, '-=0.3')
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen items-end overflow-hidden bg-brushly-black"
    >
      {/* Video Background */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setVideoLoaded(true)}
        onError={() => setVideoError(true)}
      >
        {/* Add video sources here when ready:
        <source src="/videos/hero.webm" type="video/webm" />
        <source src="/videos/hero.mp4" type="video/mp4" />
        */}
      </video>

      {/* Poster/Fallback Image — always rendered underneath */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=1920&q=80"
          alt="Premium interior painting"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-brushly-black/40 via-transparent to-brushly-black/80" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-brushly-black/60 to-transparent" />

      {/* Content — bottom-left aligned (Aventura pattern) */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-20 pt-32 md:px-10 md:pb-28 lg:px-16">
        <div className="hero-badge">
          <Badge>Premium Painting &amp; Decorating</Badge>
        </div>

        <h1
          className="hero-heading mt-6 max-w-4xl font-display font-light leading-[1.05] text-brushly-cream"
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
            <span className="word inline-block italic text-brushly-gold">Volumes</span>
          </span>
        </h1>

        <p
          className="hero-body mt-8 max-w-xl font-body font-light leading-relaxed text-brushly-cream/60"
          style={{ fontSize: 'clamp(15px, 1.2vw, 18px)' }}
        >
          Flawless finishes for homes and businesses that demand more than just a coat of paint.
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll absolute bottom-10 right-10 z-10 flex flex-col items-center gap-3">
        <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-cream/40 [writing-mode:vertical-lr]">
          Scroll
        </span>
        <div className="h-12 w-[1px] overflow-hidden bg-brushly-cream/20">
          <div className="h-full w-full bg-brushly-gold" style={{ animation: 'scrollDown 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </section>
  )
}
