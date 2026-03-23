'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    id: 'interior',
    title: 'Interior\nPainting',
    description: 'Transform your living spaces with precision colour application and flawless finishes. We work with premium brands including Farrow & Ball, Little Greene, and Benjamin Moore.',
    items: ['Full Room Painting', 'Feature Walls', 'Ceiling & Woodwork', 'Colour Consultation'],
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000&q=80',
  },
  {
    id: 'exterior',
    title: 'Exterior\nPainting',
    description: 'Protect and beautify your property with weather-resistant coatings expertly applied. We assess substrate conditions and select the optimal paint system for lasting protection.',
    items: ['Masonry & Render', 'Window & Door Frames', 'Weather-Resistant Coatings', 'Full Exterior Refresh'],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&q=80',
  },
  {
    id: 'wallpaper',
    title: 'Wall-\npapering',
    description: 'Expert installation of designer wallpapers with perfect pattern matching and seamless joins. From delicate hand-printed papers to heavy vinyls, we handle every type with care.',
    items: ['Designer Installation', 'Pattern Matching', 'Feature Walls', 'Wallpaper Removal'],
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1000&q=80',
  },
  {
    id: 'specialist',
    title: 'Specialist\nFinishes',
    description: 'Bespoke decorative techniques for statement interiors. Venetian plaster, limewash, colour washing, and textured finishes that elevate any space to extraordinary.',
    items: ['Venetian Plaster', 'Limewash Finishes', 'Colour Washing', 'Metallic Effects'],
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80',
  },
]

export default function ServicesPinned() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Skip pinning on mobile
    if (isMobile) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: pinnedRef.current,
        pinSpacing: false,
        onUpdate: (self) => {
          const newIndex = Math.min(3, Math.floor(self.progress * 4))
          setActiveIndex(newIndex)
        },
      })

      gsap.from('.service-sidebar-item', {
        x: -30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [isMobile])

  // Mobile: stacked cards layout
  if (isMobile) {
    return (
      <section className="bg-brushly-black">
        {services.map((service, i) => (
          <div key={service.id} className="relative min-h-screen px-6 py-20">
            <div className="relative z-10">
              <span className="font-display text-[80px] font-light leading-none text-brushly-gold/15">
                0{i + 1}
              </span>
              <h2 className="mt-[-20px] font-display text-4xl font-light text-brushly-cream whitespace-pre-line">
                {service.title}
              </h2>
              <p className="mt-6 max-w-sm font-body text-[15px] leading-relaxed text-brushly-cream/50">
                {service.description}
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {service.items.map((item) => (
                  <span key={item} className="font-body text-[13px] text-brushly-cream/40">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-12 aspect-[4/3] overflow-hidden">
              <Image
                src={service.image}
                alt={service.title.replace('\n', ' ')}
                width={800}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: '400vh' }}
    >
      <div ref={pinnedRef} className="relative h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            backgroundColor: activeIndex % 2 === 0 ? '#1A1A1A' : '#F5F0EB',
          }}
        />

        <div className="relative z-10 flex h-full">
          <div className="hidden w-[220px] flex-shrink-0 flex-col justify-between px-8 py-12 md:flex lg:w-[280px] lg:px-12">
            <div>
              <span
                className="font-body text-[11px] uppercase tracking-[0.3em] transition-colors duration-700"
                style={{ color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.4)' : 'rgba(26,26,26,0.4)' }}
              >
                Services:
              </span>
              <nav className="mt-8 flex flex-col gap-4">
                {services.map((service, i) => (
                  <button
                    key={service.id}
                    className="service-sidebar-item text-left font-body text-[14px] transition-all duration-500"
                    style={{
                      color: activeIndex === i
                        ? '#C8A96E'
                        : activeIndex % 2 === 0
                          ? 'rgba(245,240,235,0.35)'
                          : 'rgba(26,26,26,0.35)',
                      fontWeight: activeIndex === i ? 600 : 400,
                      transform: activeIndex === i ? 'translateX(8px)' : 'translateX(0)',
                    }}
                  >
                    {service.title.replace('\n', ' ')}
                  </button>
                ))}
              </nav>
            </div>

            <div
              className="transition-colors duration-700"
              style={{ color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.3)' : 'rgba(26,26,26,0.3)' }}
            >
              <span className="font-body text-[10px] uppercase tracking-[0.2em]">
                Surrey &middot; Epsom &middot; Reigate
              </span>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col md:flex-row">
            <div className="relative flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16"
                  style={{
                    opacity: activeIndex === i ? 1 : 0,
                    transform: activeIndex === i ? 'translateY(0)' : 'translateY(30px)',
                    transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                    pointerEvents: activeIndex === i ? 'auto' : 'none',
                  }}
                >
                  <h2
                    className="font-display font-light leading-[0.85] whitespace-pre-line"
                    style={{
                      fontSize: 'clamp(56px, 10vw, 140px)',
                      color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.08)' : 'rgba(26,26,26,0.07)',
                      transition: 'color 0.7s ease',
                    }}
                  >
                    {service.title}
                  </h2>

                  <div className="mt-[-40px] relative z-10 max-w-md md:mt-[-60px]">
                    <p
                      className="font-body text-[15px] leading-relaxed transition-colors duration-700"
                      style={{ color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.6)' : 'rgba(26,26,26,0.6)' }}
                    >
                      {service.description}
                    </p>

                    <div className="mt-8 flex flex-col gap-3">
                      {service.items.map((item) => (
                        <a
                          key={item}
                          href={`/services#${service.id}`}
                          className="group flex items-center justify-between border-b py-3 transition-colors duration-300"
                          style={{
                            borderColor: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.08)' : 'rgba(26,26,26,0.08)',
                          }}
                        >
                          <span
                            className="font-body text-[14px] transition-colors duration-300 group-hover:text-brushly-gold"
                            style={{ color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.7)' : 'rgba(26,26,26,0.7)' }}
                          >
                            {item}
                          </span>
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            className="transition-transform duration-300 group-hover:translate-x-1"
                          >
                            <path
                              d="M4 12L12 4M12 4H5M12 4V11"
                              stroke={activeIndex % 2 === 0 ? 'rgba(245,240,235,0.3)' : 'rgba(26,26,26,0.3)'}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>

                    <a
                      href={`/services#${service.id}`}
                      className="mt-8 inline-flex items-center gap-3 font-body text-[12px] uppercase tracking-[0.2em] text-brushly-gold transition-colors hover:text-brushly-gold-light"
                    >
                      Learn More
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 15L15 5M15 5H7M15 5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative hidden w-1/2 overflow-hidden md:block">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className="absolute inset-0"
                  style={{
                    clipPath: activeIndex === i ? 'inset(0 0 0 0)' : 'inset(5% 5% 5% 5%)',
                    opacity: activeIndex === i ? 1 : 0,
                    transform: activeIndex === i ? 'scale(1)' : 'scale(1.05)',
                    transition: 'clip-path 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease, transform 1s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <Image
                    src={service.image}
                    alt={service.title.replace('\n', ' ')}
                    fill
                    className="object-cover"
                    sizes="50vw"
                    priority={i === 0}
                  />
                  <div className="absolute bottom-8 right-8">
                    <span className="font-display text-[120px] font-light leading-none text-white/10">
                      0{i + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-brushly-cream/10">
          <div
            className="h-full bg-brushly-gold transition-all duration-500"
            style={{ width: `${((activeIndex + 1) / services.length) * 100}%` }}
          />
        </div>

        <div className="absolute bottom-6 right-6 z-20 md:hidden">
          <span className="font-display text-[32px] font-light text-brushly-gold">
            0{activeIndex + 1}
          </span>
          <span className="font-body text-[12px] text-brushly-cream/30">
            /04
          </span>
        </div>
      </div>
    </section>
  )
}
