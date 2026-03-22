'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

export default function StorySection() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
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
          toggleActions: 'play none none none',
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="bg-brushly-cream py-28 md:py-40">
      <Container>
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          {/* Image */}
          <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80)',
              }}
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
              Brushly was founded on a simple belief: that painting and
              decorating should be an art form, not just a trade. Every surface
              we touch receives the same obsessive attention to detail — from
              thorough preparation through to the final coat.
            </p>
            <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-black/60">
              Operating across Surrey, Epsom, and Reigate, we&apos;ve built our
              reputation on delivering premium results that speak for themselves.
              We use only the finest materials and proven techniques to ensure
              every project exceeds expectations.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <span className="font-display text-4xl font-light text-brushly-gold-dark">
                  10+
                </span>
                <p className="mt-2 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
                  Years Experience
                </p>
              </div>
              <div>
                <span className="font-display text-4xl font-light text-brushly-gold-dark">
                  500+
                </span>
                <p className="mt-2 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
                  Projects Done
                </p>
              </div>
              <div>
                <span className="font-display text-4xl font-light text-brushly-gold-dark">
                  100%
                </span>
                <p className="mt-2 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
                  Satisfaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
