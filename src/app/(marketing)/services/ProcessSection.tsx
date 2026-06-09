'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    number: '01',
    title: 'Consultation',
    description:
      'We visit your property, discuss your vision, assess the surfaces, and provide a detailed, transparent quote with no hidden costs.',
  },
  {
    number: '02',
    title: 'Preparation',
    description:
      'Meticulous surface preparation is the foundation of every flawless finish. We fill, sand, prime, and protect with obsessive care.',
  },
  {
    number: '03',
    title: 'Execution',
    description:
      'Premium materials applied by skilled craftsmen. Multiple coats, consistent coverage, and clean lines — every time.',
  },
  {
    number: '04',
    title: 'Inspection',
    description:
      'A thorough final walkthrough with you. We don\'t consider a project complete until you are completely satisfied with every detail.',
  },
]

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.process-step', {
        y: 50,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={sectionRef} className="bg-brushly-black py-28 md:py-40">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge>How We Work</Badge>
          <h2
            className="mt-4 font-display font-light text-brushly-cream"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            Our Process
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-px bg-brushly-gold/10 md:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="process-step bg-brushly-black p-8 md:p-10"
            >
              <span className="text-[13px] font-body font-medium text-brushly-gold">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-2xl font-light text-brushly-cream">
                {step.title}
              </h3>
              <p className="mt-4 text-[14px] font-body leading-relaxed text-brushly-cream/50">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
