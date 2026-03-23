'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import LineReveal from '@/components/animations/LineReveal'
import ParallaxImage from '@/components/animations/ParallaxImage'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    id: 'interior',
    number: '01',
    title: 'Interior Painting',
    description:
      'Transform your living spaces with precision colour application and flawless finishes. We work with premium brands including Farrow & Ball, Little Greene, and Benjamin Moore to deliver results that endure.',
    features: [
      'Full room preparation and protection',
      'Ceiling, wall, and woodwork painting',
      'Feature walls and accent colours',
      'Colour consultation available',
    ],
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
  },
  {
    id: 'exterior',
    number: '02',
    title: 'Exterior Painting',
    description:
      'Protect and beautify your property with weather-resistant coatings expertly applied. We assess substrate conditions and select the optimal paint system for lasting protection.',
    features: [
      'Full exterior surface preparation',
      'Masonry, render, and cladding painting',
      'Window and door frame finishing',
      'Weather-resistant coating systems',
    ],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  },
  {
    id: 'wallpapering',
    number: '03',
    title: 'Wallpapering',
    description:
      'Expert installation of designer wallpapers with perfect pattern matching and seamless joins. From delicate hand-printed papers to heavy vinyls, we handle every type with care.',
    features: [
      'Designer wallpaper installation',
      'Precise pattern matching',
      'Feature wall and full room hanging',
      'Wallpaper removal and wall preparation',
    ],
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
  },
  {
    id: 'specialist',
    number: '04',
    title: 'Specialist Finishes',
    description:
      'Bespoke decorative techniques for statement interiors. Venetian plaster, limewash, colour washing, and textured finishes that elevate any space to extraordinary.',
    features: [
      'Venetian plaster and polished plaster',
      'Limewash and mineral paint finishes',
      'Colour washing and rag rolling',
      'Metallic and pearlescent effects',
    ],
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
  },
]

export default function ServiceDetails() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.service-detail').forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="bg-brushly-cream py-28 md:py-40">
      <Container>
        {services.map((service, i) => (
          <div key={service.id} id={service.id}>
            {i === 0 && <LineReveal />}
            <div className="service-detail grid grid-cols-1 gap-10 py-16 md:grid-cols-2 md:gap-20 md:py-24">
              {/* Text */}
              <div className={i % 2 !== 0 ? 'md:order-2' : ''}>
                <span className="text-[13px] font-body font-medium text-brushly-gold-dark/50">
                  {service.number}
                </span>
                <h2 className="mt-2 font-display text-4xl font-light text-brushly-black md:text-5xl">
                  {service.title}
                </h2>
                <p className="mt-6 text-[15px] font-body leading-relaxed text-brushly-black/60">
                  {service.description}
                </p>
                <ul className="mt-8 flex flex-col gap-3">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-[14px] font-body text-brushly-black/70"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brushly-gold" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image with parallax */}
              <div
                className={`overflow-hidden ${i % 2 !== 0 ? 'md:order-1' : ''}`}
                style={{ aspectRatio: '3/4' }}
              >
                <ParallaxImage
                  src={service.image}
                  alt={service.title}
                  speed={0.15}
                  className="h-full w-full"
                />
              </div>
            </div>
            <LineReveal />
          </div>
        ))}
      </Container>
    </section>
  )
}
