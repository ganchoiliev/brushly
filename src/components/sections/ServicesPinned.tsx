'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    id: 'interior',
    title: 'Interior\nPainting',
    description: 'Transform your living spaces with precision colour application and flawless finishes. We work with premium brands including Farrow & Ball, Little Greene, and Benjamin Moore.',
    items: [
      { label: 'Full Room Painting', focusX: 50, focusY: 50 },
      { label: 'Feature Walls', focusX: 30, focusY: 40 },
      { label: 'Ceiling & Woodwork', focusX: 50, focusY: 20 },
      { label: 'Colour Consultation', focusX: 70, focusY: 60 },
    ],
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
  },
  {
    id: 'exterior',
    title: 'Exterior\nPainting',
    description: 'Protect and beautify your property with weather-resistant coatings expertly applied. We assess substrate conditions and select the optimal paint system for lasting protection.',
    items: [
      { label: 'Masonry & Render', focusX: 40, focusY: 60 },
      { label: 'Window & Door Frames', focusX: 60, focusY: 40 },
      { label: 'Weather-Resistant Coatings', focusX: 50, focusY: 50 },
      { label: 'Full Exterior Refresh', focusX: 50, focusY: 30 },
    ],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
  },
  {
    id: 'wallpaper',
    title: 'Wall-\npapering',
    description: 'Expert installation of designer wallpapers with perfect pattern matching and seamless joins. From delicate hand-printed papers to heavy vinyls, we handle every type with care.',
    items: [
      { label: 'Designer Installation', focusX: 50, focusY: 50 },
      { label: 'Pattern Matching', focusX: 30, focusY: 30 },
      { label: 'Feature Walls', focusX: 70, focusY: 50 },
      { label: 'Wallpaper Removal', focusX: 50, focusY: 70 },
    ],
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
  },
  {
    id: 'specialist',
    title: 'Specialist\nFinishes',
    description: 'Bespoke decorative techniques for statement interiors. Venetian plaster, limewash, colour washing, and textured finishes that elevate any space to extraordinary.',
    items: [
      { label: 'Venetian Plaster', focusX: 40, focusY: 40 },
      { label: 'Limewash Finishes', focusX: 60, focusY: 50 },
      { label: 'Colour Washing', focusX: 50, focusY: 60 },
      { label: 'Metallic Effects', focusX: 70, focusY: 30 },
    ],
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
  },
]

export default function ServicesPinned() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)
  const [imageFocus, setImageFocus] = useState({ x: 50, y: 50 })
  const numberRef = useRef<HTMLSpanElement>(null)

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse tracking for image parallax
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!pinnedRef.current) return
    const rect = pinnedRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePos({ x, y })
  }, [])

  useEffect(() => {
    if (isMobile) return
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove, isMobile])

  // Apply mouse parallax to active image
  useEffect(() => {
    if (isMobile || !imageContainerRef.current) return
    const offsetX = hoveredItem !== null ? (imageFocus.x - 50) * 0.3 : mousePos.x * -20
    const offsetY = hoveredItem !== null ? (imageFocus.y - 50) * 0.3 : mousePos.y * -15

    gsap.to(imageContainerRef.current, {
      x: offsetX,
      y: offsetY,
      duration: hoveredItem !== null ? 0.8 : 1.2,
      ease: 'power3.out',
    })
  }, [mousePos, hoveredItem, imageFocus, isMobile])

  // Number counter animation
  useEffect(() => {
    if (!numberRef.current) return
    const el = numberRef.current

    gsap.to(el, {
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {

        el.textContent = `0${activeIndex + 1}`
        gsap.fromTo(el,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        )
      },
    })
  }, [activeIndex])

  // Handle service change with split reveal
  useEffect(() => {
    if (activeIndex === prevIndex) return

    setIsTransitioning(true)

    const oldLeft = document.querySelector(`.service-image-left-${prevIndex}`)
    const oldRight = document.querySelector(`.service-image-right-${prevIndex}`)
    const newImage = document.querySelector(`.service-image-full-${activeIndex}`)

    if (oldLeft && oldRight && newImage) {
      gsap.set(newImage, { opacity: 1, scale: 1.1 })

      gsap.to(oldLeft, {
        x: '-100%',
        duration: 0.8,
        ease: 'power3.inOut',
      })
      gsap.to(oldRight, {
        x: '100%',
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          gsap.set(oldLeft, { x: '0%' })
          gsap.set(oldRight, { x: '0%' })
          setPrevIndex(activeIndex)
          setIsTransitioning(false)
        },
      })

      gsap.to(newImage, {
        scale: 1,
        duration: 1,
        ease: 'power2.out',
      })
    } else {
      setPrevIndex(activeIndex)
      setIsTransitioning(false)
    }
  }, [activeIndex, prevIndex])

  // ScrollTrigger pinning
  useEffect(() => {
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

  // Sub-service item hover
  const handleItemHover = (itemIndex: number | null) => {
    setHoveredItem(itemIndex)
    if (itemIndex !== null) {
      const item = services[activeIndex].items[itemIndex]
      setImageFocus({ x: item.focusX, y: item.focusY })
    } else {
      setImageFocus({ x: 50, y: 50 })
    }
  }

  // Mobile layout
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
                  <span key={item.label} className="font-body text-[13px] text-brushly-cream/40">
                    {item.label}
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

  // Desktop layout
  return (
    <section ref={sectionRef} className="relative" style={{ height: '400vh' }}>
      <div ref={pinnedRef} className="relative h-screen w-full overflow-hidden">
        {/* Background color transition */}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            backgroundColor: activeIndex % 2 === 0 ? '#1A1A1A' : '#F5F0EB',
          }}
        />

        <div className="relative z-10 flex h-full">
          {/* LEFT SIDEBAR */}
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
                    {/* Active indicator dot */}
                    <span
                      className="mr-3 inline-block h-[6px] w-[6px] rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: activeIndex === i ? '#C8A96E' : 'transparent',
                        transform: activeIndex === i ? 'scale(1)' : 'scale(0)',
                      }}
                    />
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

          {/* MAIN CONTENT */}
          <div className="relative flex flex-1 flex-col md:flex-row">
            {/* Left text panel */}
            <div className="relative flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16"
                  style={{
                    opacity: activeIndex === i ? 1 : 0,
                    transform: activeIndex === i
                      ? 'translateY(0)'
                      : activeIndex > i
                        ? 'translateY(-60px)'
                        : 'translateY(60px)',
                    transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                    pointerEvents: activeIndex === i ? 'auto' : 'none',
                  }}
                >
                  {/* Ghost title */}
                  <h2
                    className="font-display font-light leading-[0.85] whitespace-pre-line"
                    style={{
                      fontSize: 'clamp(56px, 10vw, 140px)',
                      color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.06)' : 'rgba(26,26,26,0.05)',
                      transition: 'color 0.7s ease',
                    }}
                  >
                    {service.title}
                  </h2>

                  {/* Content overlay */}
                  <div className="mt-[-40px] relative z-10 max-w-md md:mt-[-60px]">
                    <p
                      className="font-body text-[15px] leading-relaxed transition-colors duration-700"
                      style={{ color: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.6)' : 'rgba(26,26,26,0.6)' }}
                    >
                      {service.description}
                    </p>

                    {/* Sub-service list with hover interaction */}
                    <div className="mt-8 flex flex-col">
                      {service.items.map((item, itemIdx) => (
                        <a
                          key={item.label}
                          href={`/services#${service.id}`}
                          className="group flex items-center justify-between border-b py-4 transition-all duration-300"
                          style={{
                            borderColor: activeIndex % 2 === 0 ? 'rgba(245,240,235,0.06)' : 'rgba(26,26,26,0.06)',
                            paddingLeft: hoveredItem === itemIdx ? '12px' : '0px',
                            transition: 'padding-left 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s',
                          }}
                          onMouseEnter={() => handleItemHover(itemIdx)}
                          onMouseLeave={() => handleItemHover(null)}
                        >
                          {/* Hover indicator line */}
                          <div className="flex items-center gap-3">
                            <span
                              className="block h-[1px] bg-brushly-gold transition-all duration-400"
                              style={{
                                width: hoveredItem === itemIdx ? '20px' : '0px',
                                opacity: hoveredItem === itemIdx ? 1 : 0,
                              }}
                            />
                            <span
                              className="font-body text-[14px] transition-colors duration-300"
                              style={{
                                color: hoveredItem === itemIdx
                                  ? '#C8A96E'
                                  : activeIndex % 2 === 0
                                    ? 'rgba(245,240,235,0.7)'
                                    : 'rgba(26,26,26,0.7)',
                              }}
                            >
                              {item.label}
                            </span>
                          </div>
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            className="transition-all duration-300"
                            style={{
                              transform: hoveredItem === itemIdx ? 'translateX(0) rotate(-45deg)' : 'translateX(-4px) rotate(0deg)',
                              opacity: hoveredItem === itemIdx ? 1 : 0.3,
                            }}
                          >
                            <path
                              d="M4 12L12 4M12 4H5M12 4V11"
                              stroke={hoveredItem === itemIdx ? '#C8A96E' : (activeIndex % 2 === 0 ? 'rgba(245,240,235,0.3)' : 'rgba(26,26,26,0.3)')}
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

            {/* RIGHT IMAGE PANEL */}
            <div className="relative hidden w-1/2 overflow-hidden md:block">
              <div
                ref={imageContainerRef}
                className="absolute inset-[-30px]"
                style={{ willChange: 'transform' }}
              >
                {services.map((service, i) => (
                  <div key={service.id}>
                    {/* Full image (revealed underneath during split) */}
                    <div
                      className={`service-image-full-${i} absolute inset-0`}
                      style={{
                        opacity: activeIndex === i ? 1 : 0,
                        zIndex: activeIndex === i ? 2 : 1,
                        transition: activeIndex === i ? 'none' : 'opacity 0.1s ease 0.8s',
                      }}
                    >
                      <Image
                        src={service.image}
                        alt={service.title.replace('\n', ' ')}
                        fill
                        className="object-cover transition-all duration-700"
                        style={{
                          objectPosition: hoveredItem !== null && activeIndex === i
                            ? `${services[i].items[hoveredItem]?.focusX || 50}% ${services[i].items[hoveredItem]?.focusY || 50}%`
                            : '50% 50%',
                          transform: hoveredItem !== null && activeIndex === i ? 'scale(1.15)' : 'scale(1.05)',
                        }}
                        sizes="50vw"
                        priority={i === 0}
                      />
                    </div>

                    {/* Split left half (for curtain exit) */}
                    <div
                      className={`service-image-left-${i} absolute inset-0 overflow-hidden`}
                      style={{
                        clipPath: 'inset(0 50% 0 0)',
                        zIndex: prevIndex === i && isTransitioning ? 5 : 0,
                        opacity: prevIndex === i && isTransitioning ? 1 : 0,
                      }}
                    >
                      <Image
                        src={service.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                    </div>

                    {/* Split right half (for curtain exit) */}
                    <div
                      className={`service-image-right-${i} absolute inset-0 overflow-hidden`}
                      style={{
                        clipPath: 'inset(0 0 0 50%)',
                        zIndex: prevIndex === i && isTransitioning ? 5 : 0,
                        opacity: prevIndex === i && isTransitioning ? 1 : 0,
                      }}
                    >
                      <Image
                        src={service.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                    </div>
                  </div>
                ))}

                {/* Hover zoom indicator overlay */}
                <div
                  className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500"
                  style={{
                    background: hoveredItem !== null
                      ? 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.3) 100%)'
                      : 'none',
                    opacity: hoveredItem !== null ? 1 : 0,
                  }}
                />
              </div>

              {/* Animated service number */}
              <div className="absolute bottom-8 right-8 z-20 overflow-hidden">
                <span
                  ref={numberRef}
                  className="block font-display font-light leading-none text-white/8"
                  style={{ fontSize: '140px' }}
                >
                  0{activeIndex + 1}
                </span>
              </div>

              {/* Service name watermark on image */}
              <div className="absolute left-8 top-8 z-20">
                <span
                  className="font-body text-[10px] uppercase tracking-[0.3em] text-white/20 transition-opacity duration-500"
                >
                  {services[activeIndex].id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-brushly-cream/10">
          <div
            className="h-full bg-brushly-gold transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${((activeIndex + 1) / services.length) * 100}%` }}
          />
        </div>

        {/* VERTICAL PROGRESS right edge */}
        <div className="absolute bottom-12 right-0 top-12 z-20 hidden w-[2px] bg-brushly-cream/5 md:block">
          <div
            className="w-full bg-brushly-gold/40 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ height: `${((activeIndex + 1) / services.length) * 100}%` }}
          />
        </div>

        {/* Mobile counter */}
        <div className="absolute bottom-6 right-6 z-20 md:hidden">
          <span className="font-display text-[32px] font-light text-brushly-gold">
            0{activeIndex + 1}
          </span>
          <span className="font-body text-[12px] text-brushly-cream/30">/04</span>
        </div>
      </div>
    </section>
  )
}
