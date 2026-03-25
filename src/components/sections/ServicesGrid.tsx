'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import Image from 'next/image'
import { blurDataURL } from '@/lib/shimmer'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import LineReveal from '@/components/animations/LineReveal'
import ServiceIcon from '@/components/ui/ServiceIcon'
import TextReveal from '@/components/animations/TextReveal'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    number: '01',
    title: 'Interior Painting',
    icon: 'interior' as const,
    description:
      'Precision colour application with premium paints from Farrow & Ball, Little Greene, and Dulux Trade. Meticulous preparation for flawless, lasting results.',
    image: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=800&q=80',
  },
  {
    number: '02',
    title: 'Exterior Painting',
    icon: 'exterior' as const,
    description:
      'Protect and transform your property against the British climate. Thorough substrate assessment, weather-resistant coatings, and expert finishing.',
    image: 'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?w=800&q=80',
  },
  {
    number: '03',
    title: 'Wallpapering',
    icon: 'wallpaper' as const,
    description:
      'Expert installation of designer wallpapers with flawless pattern matching and seamless joins. From hand-printed papers to heavy vinyls.',
    image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800&q=80',
  },
  {
    number: '04',
    title: 'Specialist Finishes',
    icon: 'specialist' as const,
    description:
      'Artisan decorative techniques applied by hand. Venetian plaster, limewash, colour washing, and metallic effects for statement interiors.',
    image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&q=80',
  },
]

function ScrollRevealBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!ref.current || reduced) return
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export default function ServicesGrid() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!sectionRef.current || !imageContainerRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      gsap.to(imageContainerRef.current, {
        y: relativeY - imageContainerRef.current.offsetHeight / 2,
        duration: 0.8,
        ease: 'power3.out',
      })
    },
    []
  )

  useEffect(() => {
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray('.service-row') as HTMLElement[]
      rows.forEach((row) => {
        const icon = row.querySelector('.service-icon')
        const number = row.querySelector('.service-number')
        const title = row.querySelector('.service-title')
        const desc = row.querySelector('.service-desc')
        const cta = row.querySelector('.service-cta')

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: row,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        })

        if (icon) {
          tl.from(icon, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' })
        }
        tl.from(number, { x: -20, opacity: 0, duration: 0.6, ease: 'power3.out' }, icon ? '-=0.2' : 0)
          .from(title, { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.3')
          .from(desc, { y: 15, opacity: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4')
          .from(cta, { opacity: 0, x: -10, duration: 0.5, ease: 'power3.out' }, '-=0.3')
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="bg-brushly-cream py-28 md:py-40"
      onMouseMove={handleMouseMove}
    >
      <Container>
        <ScrollRevealBadge>
          <Badge className="text-brushly-gold-dark">What We Do</Badge>
        </ScrollRevealBadge>
        <TextReveal
          as="h2"
          className="mt-4 font-display font-light text-brushly-black"
          style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          staggerDelay={0.04}
        >
          Our Services
        </TextReveal>

        <div className="relative mt-16">
          {/* Cursor-following image preview */}
          <div
            ref={imageContainerRef}
            className="pointer-events-none absolute right-0 top-0 z-50 hidden md:block"
            style={{ width: 300, height: 380 }}
          >
            {services.map((service, i) => (
              <div
                key={service.number}
                className="absolute inset-0 overflow-hidden transition-all duration-700 ease-out"
                style={{
                  clipPath:
                    hoveredIndex === i
                      ? 'inset(0% 0% 0% 0%)'
                      : 'inset(50% 50% 50% 50%)',
                  opacity: hoveredIndex === i ? 1 : 0,
                  transform: hoveredIndex === i ? 'scale(1)' : 'scale(1.1)',
                }}
              >
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover"
                  sizes="300px"
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
              </div>
            ))}
          </div>

          {services.map((service, i) => (
            <div key={service.number}>
              {i === 0 && <LineReveal />}
              <div
                className="service-row group relative grid cursor-pointer grid-cols-1 items-center gap-4 py-8 md:grid-cols-12 md:py-10"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-4 md:col-span-1">
                  <ServiceIcon
                    type={service.icon}
                    className="service-icon hidden text-brushly-gold-dark/40 md:block"
                    size={40}
                  />
                  <span className="service-number font-body text-[13px] font-medium text-brushly-gold-dark/50">
                    {service.number}
                  </span>
                </div>
                <h3 className="service-title font-display text-3xl font-light text-brushly-black transition-colors duration-300 group-hover:text-brushly-gold-dark md:col-span-4 md:text-4xl">
                  {service.title}
                </h3>
                <p className="service-desc font-body text-[15px] leading-relaxed text-brushly-black/50 md:col-span-5">
                  {service.description}
                </p>
                <div className="flex justify-end md:col-span-2">
                  <span className="service-cta font-body text-[13px] uppercase tracking-[0.15em] text-brushly-gold-dark opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Learn More &rarr;
                  </span>
                </div>
              </div>
              <LineReveal />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
