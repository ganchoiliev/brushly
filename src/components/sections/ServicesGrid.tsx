'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import LineReveal from '@/components/animations/LineReveal'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    number: '01',
    title: 'Interior Painting',
    description:
      'From feature walls to full property interiors. Precision preparation, premium paints, and meticulous attention to detail.',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
  },
  {
    number: '02',
    title: 'Exterior Painting',
    description:
      'Weather-resistant finishes that protect and transform. We work with the finest exterior-grade coatings.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  },
  {
    number: '03',
    title: 'Wallpapering',
    description:
      'Expert hanging of designer wallpapers. Pattern matching, feature walls, and full room installations.',
    image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800&q=80',
  },
  {
    number: '04',
    title: 'Specialist Finishes',
    description:
      'Venetian plaster, limewash, colour washing, and bespoke decorative techniques for statement spaces.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
  },
]

export default function ServicesGrid() {
  const sectionRef = useRef<HTMLElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.service-row', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="bg-brushly-cream py-28 md:py-40">
      <Container>
        <Badge className="text-brushly-gold-dark">What We Do</Badge>
        <h2
          className="mt-4 font-display font-light text-brushly-black"
          style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
        >
          Our Services
        </h2>

        <div className="relative mt-16">
          {services.map((service, i) => (
            <div key={service.number}>
              {i === 0 && <LineReveal />}
              <div
                className="service-row will-animate group relative grid cursor-pointer grid-cols-1 items-center gap-4 py-8 md:grid-cols-12 md:py-10"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span className="font-body text-[13px] font-medium text-brushly-gold-dark/50 md:col-span-1">
                  {service.number}
                </span>
                <h3 className="font-display text-3xl font-light text-brushly-black transition-colors duration-300 group-hover:text-brushly-gold-dark md:col-span-4 md:text-4xl">
                  {service.title}
                </h3>
                <p className="font-body text-[15px] leading-relaxed text-brushly-black/50 md:col-span-5">
                  {service.description}
                </p>
                <div className="flex justify-end md:col-span-2">
                  <span className="text-[13px] font-body uppercase tracking-[0.15em] text-brushly-gold-dark opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Learn More &rarr;
                  </span>
                </div>
              </div>
              <LineReveal />

              {/* Hover Image Preview */}
              {hoveredIndex === i && (
                <div
                  className="pointer-events-none fixed right-20 top-1/2 z-50 hidden -translate-y-1/2 overflow-hidden md:block"
                  style={{ width: 320, height: 400 }}
                >
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700"
                    style={{
                      backgroundImage: `url(${service.image})`,
                      transform: 'scale(1.05)',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
