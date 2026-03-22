'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

const values = [
  {
    title: 'Meticulous Preparation',
    description:
      'We spend as much time preparing surfaces as we do painting them. Proper preparation is the foundation of every flawless finish.',
  },
  {
    title: 'Premium Materials',
    description:
      'Only the finest paints, primers, and materials. We partner with Farrow & Ball, Little Greene, Benjamin Moore, and other leading brands.',
  },
  {
    title: 'Clean & Respectful',
    description:
      'Your home is treated with the utmost care. Dust sheets, protection, and thorough clean-up are standard on every project.',
  },
  {
    title: 'Transparent Pricing',
    description:
      'Detailed quotes with no hidden costs. We believe in honest communication and delivering exactly what we promise.',
  },
]

export default function ValuesSection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.value-card', {
        y: 50,
        opacity: 0,
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="bg-brushly-black py-28 md:py-40">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge>Our Values</Badge>
          <h2
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            What sets us apart
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-px bg-brushly-gold/10 md:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="value-card bg-brushly-black p-10 md:p-14"
            >
              <h3 className="font-display text-2xl font-light text-brushly-cream">
                {value.title}
              </h3>
              <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-cream/50">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
