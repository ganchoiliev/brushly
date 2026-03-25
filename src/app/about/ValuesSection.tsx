'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

const values = [
  {
    title: 'Preparation is the project.',
    description:
      'Most decorators rush to the roller. We don\u2019t touch a brush until every surface is properly cleaned, filled, sanded, and primed. Corners, edges, and transitions get the same focus as feature walls. This is where the finish is actually made, and it\u2019s where shortcuts show up six months later.',
  },
  {
    title: 'Materials with purpose, not just prestige.',
    description:
      'We partner with Farrow & Ball, Little Greene, and Benjamin Moore because each serves a specific function. Little Greene for superior oil-based woodwork finishes. Farrow & Ball for unmatched colour depth on walls. Benjamin Moore for hardwearing, high-traffic applications. We match the product to the surface and the use case, not to the brand name.',
  },
  {
    title: 'Your home, respected.',
    description:
      'Full dust sheeting, floor and furniture protection, and end-of-day cleanup are non-negotiable on every job. We work quietly, cleanly, and on schedule. When we leave a room, you should only notice the finish, not that we were there.',
  },
  {
    title: 'Honest pricing, no revisions.',
    description:
      'You receive a detailed, line-item quote before any work begins. No vague estimates. No surprise extras. If the scope changes, we discuss it openly before any additional cost is committed.',
  },
]

export default function ValuesSection() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
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
          toggleActions: 'play none none reverse',
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={ref} className="bg-brushly-black py-28 md:py-40">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge>Our Standards</Badge>
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
