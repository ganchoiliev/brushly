'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '@/components/animations/MagneticButton'

gsap.registerPlugin(ScrollTrigger)

const COLORS = [
  { name: 'Ivory White', hex: '#F5F0EB', dark: false },
  { name: 'Sage Green', hex: '#8B9D77', dark: false },
  { name: 'Navy Depth', hex: '#2C3E50', dark: true },
  { name: 'Brushly Gold', hex: '#C8A96E', dark: false },
  { name: 'Charcoal', hex: '#2D2D2D', dark: true },
]

export default function HeroCinematic() {
  const heroRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [activeColor, setActiveColor] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const particlesRef = useRef<Array<{
    x: number; y: number; size: number; speed: number;
    opacity: number; color: string; rotation: number; rotSpeed: number;
  }>>([])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Skip particle animation on mobile
    if (window.innerWidth < 768) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['#C8A96E', '#D4BC8B', '#A68B5B', '#F5F0EB', '#8B9D77']
    particlesRef.current = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 6 + 2,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.15 + 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.5,
    }))

    let scrollY = 0
    let raf: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((p) => {
        p.y -= p.speed + scrollY * 0.02
        p.rotation += p.rotSpeed

        if (p.y < -20) {
          p.y = canvas.height + 20
          p.x = Math.random() * canvas.width
        }

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity

        ctx.fillStyle = p.color
        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const angle = (j / 6) * Math.PI * 2
          const radius = p.size * (0.7 + Math.random() * 0.6)
          const px = Math.cos(angle) * radius
          const py = Math.sin(angle) * radius
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })

      raf = requestAnimationFrame(animate)
    }

    animate()

    const onScroll = () => {
      scrollY = window.scrollY || 0
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    document.addEventListener('mousemove', handleMouseMove)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.3 })

      tl.from('.hero-particles', { opacity: 0, duration: 1.5 })
        .fromTo('.hero-image-mask',
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'power3.inOut' },
          '-=1.2'
        )
        .from('.hero-location', { y: 20, opacity: 0, duration: 0.6 }, '-=0.8')
        .from('.hero-line', {
          yPercent: 120,
          rotateX: 40,
          opacity: 0,
          stagger: 0.12,
          duration: 1.2,
        }, '-=0.6')
        .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.hero-swatches', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
        .from('.hero-cta', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
        .from('.hero-scroll-hint', { opacity: 0, duration: 0.5 }, '-=0.2')

      gsap.to('.hero-left-content', {
        y: -100,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'center center',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to('.hero-image-mask', {
        scale: 1.15,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to('.hero-particles', {
        y: -200,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'center center',
          end: 'bottom top',
          scrub: true,
        },
      })

      // "Painting" slides right on scroll
      gsap.to('.hero-line-painting', {
        x: 120,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      })

      // "& Decorating" slides left on scroll
      gsap.to('.hero-line-decorating', {
        x: -80,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '60% top',
          scrub: true,
        },
      })

      // Location text fades out first
      gsap.to('.hero-location', {
        y: -40,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '30% top',
          scrub: true,
        },
      })

    }, hero)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      ctx.revert()
    }
  }, [handleMouseMove])

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

  const tiltX = mousePos.y * -12
  const tiltY = mousePos.x * 12

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col overflow-hidden md:flex-row"
    >
      <canvas
        ref={canvasRef}
        className="hero-particles pointer-events-none absolute inset-0 z-30"
      />

      <div className="hero-left-content relative z-20 flex w-full flex-col justify-between bg-brushly-cream px-6 py-20 md:w-1/2 md:px-12 lg:px-20">
        <div className="hero-location">
          <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-black/40">
            Based in:
          </span>
          <div className="mt-2 font-body text-[14px] font-medium text-brushly-black">
            Surrey &middot; Epsom &middot; Reigate
          </div>
        </div>

        <div
          ref={headlineRef}
          className="my-auto py-16"
          style={{
            perspective: '1000px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          <div
            style={{
              transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
              transition: 'transform 0.15s ease-out',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="overflow-hidden">
              <h1
                className="hero-line hero-line-premium font-display font-light text-brushly-black"
                style={{ fontSize: 'clamp(48px, 8vw, 120px)', lineHeight: 0.9, transform: 'translateZ(40px)' }}
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
                  color: COLORS[activeColor].hex,
                  transition: 'color 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: 'translateZ(60px)',
                }}
              >
                Painting
              </h1>
            </div>
            <div className="overflow-hidden">
              <h1
                className="hero-line hero-line-decorating font-display font-light text-brushly-black"
                style={{ fontSize: 'clamp(48px, 8vw, 120px)', lineHeight: 0.9, transform: 'translateZ(20px)' }}
              >
                &amp; Decorating
              </h1>
            </div>
          </div>
        </div>

        <div>
          <p className="hero-tagline max-w-sm font-body text-[15px] leading-relaxed text-brushly-black/50">
            We combine skilled craftsmanship with an artist&apos;s touch. Designing spaces that are as refined as they are enduring.
          </p>

          <div className="hero-swatches mt-8 flex items-center gap-3">
            <span className="font-body text-[10px] uppercase tracking-[0.2em] text-brushly-black/30">
              Colours:
            </span>
            <div className="flex gap-2">
              {COLORS.map((color, i) => (
                <button
                  key={color.name}
                  onClick={() => setActiveColor(i)}
                  className="group relative"
                  title={color.name}
                >
                  <div
                    className="h-7 w-7 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: color.hex,
                      border: color.dark ? 'none' : '1px solid rgba(26,26,26,0.1)',
                      transform: activeColor === i ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: activeColor === i ? `0 0 0 2px #F5F0EB, 0 0 0 4px ${color.hex}` : 'none',
                    }}
                  />
                  <span
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-body text-[9px] uppercase tracking-[0.15em] text-brushly-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  >
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-cta mt-10">
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

        <div className="hero-scroll-hint absolute bottom-6 left-6 md:left-12 lg:left-20">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-brushly-black/20" />
            <span className="font-body text-[10px] uppercase tracking-[0.2em] text-brushly-black/30">
              Scroll to explore
            </span>
          </div>
        </div>
      </div>

      <div className="hero-image-mask relative w-full overflow-hidden md:w-1/2" style={{ minHeight: '50vh' }}>
        <video
          ref={videoRef}
          className={`absolute inset-0 z-10 h-full w-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
          {/* <source src="/videos/hero.webm" type="video/webm" /> */}
        </video>

        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80"
            alt="Premium interior painting"
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
        </div>

        <div
          className="absolute inset-0 z-20 mix-blend-multiply transition-colors duration-1000"
          style={{
            backgroundColor: COLORS[activeColor].hex,
            opacity: activeColor === 0 ? 0 : 0.15,
          }}
        />

        <div className="absolute inset-x-0 bottom-0 z-20 h-1/3 bg-gradient-to-t from-brushly-black/30 to-transparent" />

        <div className="absolute bottom-8 right-8 z-20">
          <span className="font-display text-[140px] font-light leading-none text-white/5">
            B
          </span>
        </div>
      </div>
    </section>
  )
}
