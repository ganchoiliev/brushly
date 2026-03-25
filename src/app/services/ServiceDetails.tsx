'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
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
      'Transform your living spaces with precision colour application and flawless finishes. Our skilled decorators combine meticulous preparation, premium paints from Farrow & Ball, Little Greene, and Dulux Trade, and time-honoured techniques to deliver results that look beautiful and last for years.',
    features: [
      'Meticulous surface preparation — filling, sanding, and priming every surface for a smooth, lasting finish',
      'Premium trade-quality paints from Farrow & Ball, Little Greene, and Dulux Trade',
      'Clean, precise cutting in at ceiling junctions, corners, and around fixtures',
      'Specialist woodwork finishing — skirting boards, architraves, and frames in satinwood, eggshell, or gloss',
      'Expert colour guidance tailored to your rooms’ natural light and existing décor',
      'Minimal disruption — furniture and flooring fully sheeted and protected throughout',
      'Consistent, even coverage with a minimum of two coats on every surface',
      'Room-to-room colour coordination for a cohesive feel throughout your home',
    ],
    image: '/img/interior.webp',
  },
  {
    id: 'exterior',
    number: '02',
    title: 'Exterior Painting',
    description:
      'Protect and transform the outside of your property, safeguarding it against the British climate whilst enhancing kerb appeal. Every project begins with a thorough substrate assessment and meticulous preparation, ensuring exceptional adhesion and durability for years to come.',
    features: [
      'Thorough substrate assessment for moisture, cracking, algae, and surface integrity',
      'Professional-grade fungicidal washes and stabilising solutions before any painting',
      'Premium weather-resistant masonry paints, microporous finishes, and elastomeric coatings',
      'Breathable paint systems that prevent trapped damp on older and solid-wall properties',
      'Expert timber and uPVC frame finishing by brush, roller, or airless spray',
      'UV-stable coatings that resist fading, chalking, and colour change',
      'Full fascia, soffit, bargeboard, and guttering preparation and finishing',
      'Scaffolding assessment and arrangement for safe, efficient access to all elevations',
    ],
    image: '/img/exterior.webp',
  },
  {
    id: 'wallpapering',
    number: '03',
    title: 'Wallpapering',
    description:
      'From sourcing and hanging luxury designer papers to meticulous pattern alignment and surface preparation, we ensure a flawless finish that transforms your walls into a statement. Whether refreshing a single feature wall or papering an entire property, our experienced decorators deliver seamless, long-lasting results.',
    features: [
      'Expert hanging of luxury wallpapers including hand-printed, silk, grasscloth, and vinyl',
      'Full surface preparation with lining paper, sizing, and plaster repair for a flawless base',
      'Precise pattern matching across straight, drop, and free match designs with minimal waste',
      'Specialist paste-the-wall and paste-the-paper techniques matched to each wallpaper type',
      'Feature wall design coordinated with panel moulding and architectural details',
      'Careful removal of existing wallpaper, including multi-layered papers in period properties',
      'Plumb-line accuracy and meticulous seam finishing for invisible joins',
      'Advice on wallpaper selection, room suitability, and complementary colour schemes',
    ],
    image: '/img/wallpapering.webp',
  },
  {
    id: 'specialist',
    number: '04',
    title: 'Specialist Finishes',
    description:
      'For those seeking something truly distinctive, we offer a curated range of artisan decorative finishes. From the timeless lustre of Venetian plaster to the soft depth of limewash and the subtle shimmer of metallic effects, each finish is applied by hand using traditional methods, creating a result entirely unique to your home.',
    features: [
      'Hand-applied Venetian and Marmorino polished plaster for a luxurious, marble-like finish',
      'Traditional and modern limewash application, ideal for period homes and breathable walls',
      'Colour washing, rag rolling, and sponging techniques for layered depth and movement',
      'Metallic paints, plasters, and pearlescent glazes in champagne, bronze, copper, and silver tones',
      'Every finish is entirely unique — created by hand with natural tonal variation throughout',
      'Suitable for feature walls, entire rooms, hallways, bathrooms, and commercial spaces',
      'Specialist surface preparation and priming tailored to each decorative technique',
      'Expert colour consultation to ensure your chosen finish complements your interior scheme',
    ],
    image: '/img/finishes.webp',
  },
]

export default function ServiceDetails() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
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
            toggleActions: 'play none none reverse',
          },
        })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={sectionRef} className="bg-brushly-cream py-28 md:py-40">
      <Container>
        {services.map((service, i) => (
          <div key={service.id} id={service.id} className="scroll-mt-28">
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
