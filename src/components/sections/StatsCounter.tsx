'use client'

import { useRef, useEffect } from 'react'
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

  useEffect(() => {
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
            toggleActions: 'play none none none',
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
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative bg-brushly-off-black py-20 md:py-28 overflow-hidden">
      <PaintTexture variant="splatter" opacity={0.03} />
      <Container>
        <div className="relative z-10 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="stat-item text-center">
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
              {i < stats.length - 1 && (
                <div className="mt-6 md:hidden">
                  <LineReveal />
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
