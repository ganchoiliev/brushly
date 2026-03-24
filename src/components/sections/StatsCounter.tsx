'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import LineReveal from '@/components/animations/LineReveal'
import PaintTexture from '@/components/ui/PaintTexture'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: 10, suffix: '+', label: 'Years of experience' },
  { value: 500, suffix: '+', label: 'Projects completed' },
  { value: 100, suffix: '%', label: 'Client satisfaction' },
  { value: null, text: 'Surrey', label: 'Based & proud' },
]

export default function StatsCounter() {
  const sectionRef = useRef<HTMLElement>(null)
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([])
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      // Show final values immediately
      stats.forEach((stat, i) => {
        const el = counterRefs.current[i]
        if (el && stat.value !== null) el.textContent = stat.value + stat.suffix
      })
      return
    }
    const ctx = gsap.context(() => {
      stats.forEach((stat, i) => {
        const el = counterRefs.current[i]
        if (!el || stat.value === null) return

        const obj = { val: 0 }
        gsap.to(obj, {
          val: stat.value,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + stat.suffix
          },
        })
      })

      gsap.from('.stat-item', {
        y: 30,
        opacity: 0,
        scale: 0.95,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })

      // Animate gold edge lines
      gsap.from('.stats-top-line, .stats-bottom-line', {
        scaleX: 0,
        duration: 1.2,
        ease: 'power3.inOut',
        stagger: 0.2,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })

      // Animate radial glow
      gsap.from('.stats-glow', {
        opacity: 0,
        scale: 0.8,
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })

      // Animate vertical dividers
      gsap.from('.stats-divider', {
        scaleY: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={sectionRef} className="relative bg-brushly-charcoal py-20 md:py-28 overflow-hidden">
      {/* Layered textures */}
      <PaintTexture variant="splatter" opacity={0.03} />
      <PaintTexture variant="grain" opacity={0.04} />

      {/* Radial gold glow */}
      <div
        className="stats-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '900px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(200,169,110,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Top gold line */}
      <div
        className="stats-top-line absolute top-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(to right, transparent, rgba(200,169,110,0.3) 20%, rgba(200,169,110,0.3) 80%, transparent)' }}
      />
      {/* Bottom gold line */}
      <div
        className="stats-bottom-line absolute bottom-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(to right, transparent, rgba(200,169,110,0.3) 20%, rgba(200,169,110,0.3) 80%, transparent)' }}
      />

      <Container>
        <div className="relative z-10 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="stat-item relative text-center">
              <span
                ref={(el) => { counterRefs.current[i] = el }}
                className="font-display font-light text-brushly-gold"
                style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}
              >
                {stat.value !== null ? `0${stat.suffix}` : stat.text}
              </span>
              <p className="mt-3 text-[14px] font-body text-brushly-cream/60">
                {stat.label}
              </p>
              {/* Mobile line separator */}
              {i < stats.length - 1 && (
                <div className="mt-6 md:hidden">
                  <LineReveal />
                </div>
              )}
              {/* Desktop vertical divider */}
              {i < stats.length - 1 && (
                <div
                  className="stats-divider absolute right-0 top-[10%] bottom-[10%] hidden w-px origin-top md:block"
                  style={{ background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.15) 30%, rgba(200,169,110,0.15) 70%, transparent)' }}
                />
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
