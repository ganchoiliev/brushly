'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ParallaxImage from '@/components/animations/ParallaxImage'

gsap.registerPlugin(ScrollTrigger)

export default function StorySection() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.story-content > *', {
        y: 40,
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
    <section ref={ref} className="bg-brushly-cream py-28 md:py-40">
      <Container>
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          {/* Image with parallax */}
          <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>
            <ParallaxImage
              src="/img/about-story.webp"
              alt="Brushly decorator painting a period property"
              speed={0.15}
              className="h-full w-full"
            />
          </div>

          {/* Text */}
          <div className="story-content flex flex-col justify-center">
            <Badge className="text-brushly-gold-dark">Our Story</Badge>
            <h2 className="mt-4 font-display text-4xl font-light text-brushly-black md:text-5xl">
              A passion for
              <br />
              <span className="italic">perfection</span>
            </h2>
            <p className="mt-8 text-[15px] font-body leading-relaxed text-brushly-black/60">
              Brushly started with a conviction that most people settle for
              &ldquo;good enough&rdquo; when it comes to their walls. We
              don&apos;t.
            </p>
            <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-black/60">
              We are a specialist painting and decorating studio operating across
              Surrey, from Epsom and Reigate to the surrounding villages and
              estates. Every project we take on is treated as a craft commission,
              not a job sheet. That means slower timelines, deeper preparation,
              and a standard of finish that holds up years after the dust sheets
              come down.
            </p>
            <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-black/60">
              We work exclusively with premium paint systems from Farrow &amp;
              Ball, Little Greene, and Benjamin Moore, selected not just for
              their colour depth but for their durability and application
              qualities. The right product on the right surface, applied with the
              right technique, is the difference between a paint job and a
              lasting finish.
            </p>
            <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-black/60">
              Our clients tend to find us through word of mouth. We prefer it
              that way. The work speaks. The results stay.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
