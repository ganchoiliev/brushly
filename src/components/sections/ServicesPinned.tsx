'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '@/components/animations/MagneticButton'

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
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const sidebarLineRef = useRef<HTMLDivElement>(null)
  const textTlRef = useRef<gsap.core.Timeline | null>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(true)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)
  const [imageFocus, setImageFocus] = useState({ x: 50, y: 50 })

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

  // Build text entrance animation for a given index
  const buildTextEntrance = useCallback((index: number) => {
    const tl = gsap.timeline()

    // Ghost title lines clip in
    tl.fromTo(`.ghost-line-${index}`,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.out', stagger: 0.12 }
    )

    // Accent line scales in
    tl.fromTo(`.accent-line-${index}`,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.6, ease: 'power3.out', transformOrigin: 'left center' },
      '-=0.4'
    )

    // Description words stagger in
    tl.fromTo(`.desc-word-${index}`,
      { yPercent: 80, opacity: 0 },
      { yPercent: 0, opacity: 1, stagger: 0.015, duration: 0.5, ease: 'power3.out' },
      '-=0.4'
    )

    // Sub-service items stagger from left
    tl.fromTo(`.sub-item-${index}`,
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out' },
      '-=0.3'
    )

    // Learn More link
    tl.fromTo(`.learn-more-${index}`,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      '-=0.2'
    )

    return tl
  }, [])

  // Handle service change — cinematic clip-path image + staggered text
  useEffect(() => {
    if (activeIndex === prevIndex) return

    // Kill previous text timeline
    if (textTlRef.current) {
      textTlRef.current.kill()
    }

    const masterTl = gsap.timeline()
    textTlRef.current = masterTl

    // --- Image transition ---
    const outgoing = imageRefs.current[prevIndex]
    const incoming = imageRefs.current[activeIndex]
    const goingForward = activeIndex > prevIndex

    if (outgoing && incoming) {
      // Outgoing: Ken Burns drift + fade
      gsap.to(outgoing, {
        scale: 1.15,
        opacity: 0,
        duration: 1.0,
        ease: 'power2.inOut',
      })

      // Incoming: diagonal clip-path wipe (alternating direction)
      const startClip = goingForward
        ? 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
        : 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)'
      const endClip = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'

      gsap.set(incoming, { opacity: 1, scale: 1.2, zIndex: 5 })
      gsap.fromTo(incoming,
        { clipPath: startClip, scale: 1.2 },
        {
          clipPath: endClip,
          scale: 1.05,
          duration: 1.1,
          ease: 'power3.inOut',
          onComplete: () => {
            gsap.set(outgoing, { opacity: 0, scale: 1.05, zIndex: 1, clipPath: endClip })
            gsap.set(incoming, { zIndex: 2 })
            setPrevIndex(activeIndex)
          }
        }
      )
    } else {
      setPrevIndex(activeIndex)
    }

    // --- Text transition ---
    // Exit old text
    masterTl.to(`.text-panel-${prevIndex}`, {
      opacity: 0,
      y: -40,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(`.text-panel-${prevIndex}`, { y: 0 })
      }
    })

    // Set new panel visible but elements hidden
    masterTl.set(`.text-panel-${activeIndex}`, { opacity: 1, y: 0 })

    // Staggered entrance for new text
    masterTl.add(buildTextEntrance(activeIndex), '-=0.1')

  }, [activeIndex, prevIndex, buildTextEntrance])

  // Sidebar line position
  useEffect(() => {
    if (!sidebarLineRef.current || isMobile) return
    const activeBtn = document.querySelector(`.service-nav-${activeIndex}`) as HTMLElement
    if (!activeBtn) return

    gsap.to(sidebarLineRef.current, {
      top: activeBtn.offsetTop,
      height: activeBtn.offsetHeight,
      duration: 0.5,
      ease: 'power3.out',
    })
  }, [activeIndex, isMobile])

  // ScrollTrigger pinning + entrance animation + decoratives
  useEffect(() => {
    if (isMobile) return

    const ctx = gsap.context(() => {
      // Pin the section
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

      // --- Section entrance animation ---
      const entranceTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      })

      // Gold line draws across top
      entranceTl.fromTo('.services-top-line',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.2, ease: 'power3.inOut' }
      )

      // Section label slides up
      entranceTl.from('.services-section-label', {
        yPercent: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.8')

      // Sidebar items stagger in
      entranceTl.from('.service-sidebar-item', {
        x: -30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.6')

      // Image panel clips in from right
      entranceTl.fromTo('.image-panel-wrapper',
        { clipPath: 'inset(0 0 0 100%)' },
        { clipPath: 'inset(0 0 0 0%)', duration: 1.0, ease: 'power3.inOut' },
        '-=0.6'
      )

      // First text panel entrance
      entranceTl.add(buildTextEntrance(0), '-=0.5')

      // --- Ambient decorative animations ---

      // Corner brackets breathing
      gsap.to('.corner-bracket', {
        opacity: 0.15,
        scale: 0.92,
        duration: 2.5,
        stagger: { each: 0.4, repeat: -1, yoyo: true },
        ease: 'sine.inOut',
      })

      // Dashed divider line flowing
      gsap.to('.divider-line line', {
        strokeDashoffset: -18,
        duration: 3,
        ease: 'none',
        repeat: -1,
      })

      // Number ring rotation
      gsap.to('.number-ring', {
        rotation: 360,
        duration: 40,
        ease: 'none',
        repeat: -1,
        transformOrigin: 'center center',
      })

    }, sectionRef)

    return () => ctx.revert()
  }, [isMobile, buildTextEntrance])

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

  const isDark = activeIndex % 2 === 0
  const textColor = isDark ? 'rgba(245,240,235,0.7)' : 'rgba(26,26,26,0.7)'
  const textMuted = isDark ? 'rgba(245,240,235,0.4)' : 'rgba(26,26,26,0.4)'
  const textSubtle = isDark ? 'rgba(245,240,235,0.06)' : 'rgba(26,26,26,0.05)'
  const borderColor = isDark ? 'rgba(245,240,235,0.06)' : 'rgba(26,26,26,0.06)'

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
    <section ref={sectionRef} className="relative" style={{ height: '220vh' }}>
      <div ref={pinnedRef} className="relative h-screen w-full overflow-hidden">
        {/* Background color transition */}
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{ backgroundColor: isDark ? '#1A1A1A' : '#F5F0EB' }}
        />

        {/* Section label + top line */}
        <div className="absolute left-[220px] lg:left-[280px] right-0 top-0 z-30">
          <div className="services-top-line h-px w-full origin-left" style={{ backgroundColor: 'rgba(200,169,110,0.3)' }} />
          <div className="overflow-hidden px-6 pt-4 md:px-12 lg:px-16">
            <span
              className="services-section-label block font-body text-[10px] uppercase tracking-[0.3em] transition-colors duration-700"
              style={{ color: textMuted }}
            >
              What We Do
            </span>
          </div>
        </div>

        <div className="relative z-10 flex h-full">
          {/* LEFT SIDEBAR */}
          <div className="hidden w-[220px] flex-shrink-0 flex-col justify-between px-8 py-12 md:flex lg:w-[280px] lg:px-12">
            <div>
              <span
                className="font-body text-[11px] uppercase tracking-[0.3em] transition-colors duration-700"
                style={{ color: textMuted }}
              >
                Services:
              </span>
              <nav className="relative mt-8 flex flex-col gap-4">
                {/* Animated active line indicator */}
                <div
                  ref={sidebarLineRef}
                  className="absolute left-0 w-[2px] bg-brushly-gold"
                  style={{ top: 0, height: 20, transition: 'none' }}
                />
                {services.map((service, i) => (
                  <button
                    key={service.id}
                    className={`service-sidebar-item service-nav-${i} text-left font-body text-[14px] pl-4 transition-all duration-500`}
                    style={{
                      color: activeIndex === i
                        ? '#C8A96E'
                        : isDark
                          ? 'rgba(245,240,235,0.35)'
                          : 'rgba(26,26,26,0.35)',
                      fontWeight: activeIndex === i ? 600 : 400,
                    }}
                  >
                    {service.title.replace('\n', ' ')}
                  </button>
                ))}
              </nav>
            </div>

            <div
              className="transition-colors duration-700"
              style={{ color: isDark ? 'rgba(245,240,235,0.3)' : 'rgba(26,26,26,0.3)' }}
            >
              <span className="font-body text-[10px] uppercase tracking-[0.2em]">
                Surrey &middot; Epsom &middot; Reigate
              </span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="relative flex flex-1 flex-col md:flex-row">
            {/* Animated dashed divider between text and image */}
            <div className="absolute left-1/2 top-[10%] bottom-[10%] z-20 hidden -translate-x-px md:block">
              <svg className="divider-line h-full w-px" viewBox="0 0 1 100" preserveAspectRatio="none">
                <line x1="0.5" y1="0" x2="0.5" y2="100"
                  stroke="rgba(200,169,110,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />
              </svg>
            </div>

            {/* Left text panel */}
            <div className="relative flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-16">
              {services.map((service, i) => (
                <div
                  key={service.id}
                  className={`text-panel-${i} absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16`}
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    pointerEvents: activeIndex === i ? 'auto' : 'none',
                  }}
                >
                  {/* Ghost title — split per line, asymmetric indent */}
                  {service.title.split('\n').map((line, li) => (
                    <div key={li} className="overflow-hidden"
                      style={{ marginLeft: li === 1 ? 'clamp(30px, 5vw, 80px)' : '0' }}>
                      <span
                        className={`ghost-line-${i} block font-display font-light leading-[0.85]`}
                        style={{
                          fontSize: 'clamp(60px, 11vw, 150px)',
                          color: textSubtle,
                          WebkitTextStroke: isDark
                            ? '1px rgba(245,240,235,0.04)'
                            : '1px rgba(26,26,26,0.03)',
                          transition: 'color 0.7s ease',
                          willChange: 'clip-path',
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  ))}

                  {/* Content overlay */}
                  <div className="mt-[-40px] relative z-10 max-w-md md:mt-[-60px]">
                    {/* Gold accent line */}
                    <div className={`accent-line-${i} mb-6 h-px w-12 origin-left`} style={{ backgroundColor: 'rgba(200,169,110,0.5)' }} />

                    {/* Description — word spans for stagger */}
                    <p className="font-body text-[15px] leading-relaxed transition-colors duration-700"
                      style={{ color: isDark ? 'rgba(245,240,235,0.6)' : 'rgba(26,26,26,0.6)' }}>
                      {service.description.split(' ').map((word, wi) => (
                        <span key={wi} className="inline-block overflow-hidden" style={{ marginRight: '0.3em' }}>
                          <span className={`desc-word-${i} inline-block`}>{word}</span>
                        </span>
                      ))}
                    </p>

                    {/* Sub-service list with hover interaction */}
                    <div className="mt-8 flex flex-col">
                      {service.items.map((item, itemIdx) => (
                        <a
                          key={item.label}
                          href={`/services#${service.id}`}
                          className={`sub-item-${i} group flex items-center justify-between border-b py-4 transition-all duration-300`}
                          style={{
                            borderColor: borderColor,
                            paddingLeft: hoveredItem === itemIdx && activeIndex === i ? '12px' : '0px',
                            transition: 'padding-left 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s',
                          }}
                          onMouseEnter={() => handleItemHover(itemIdx)}
                          onMouseLeave={() => handleItemHover(null)}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="block h-[1px] bg-brushly-gold transition-all"
                              style={{
                                width: hoveredItem === itemIdx && activeIndex === i ? '20px' : '0px',
                                opacity: hoveredItem === itemIdx && activeIndex === i ? 1 : 0,
                                transitionDuration: '0.4s',
                              }}
                            />
                            <span
                              className="font-body text-[14px] transition-colors duration-300"
                              style={{
                                color: hoveredItem === itemIdx && activeIndex === i
                                  ? '#C8A96E'
                                  : textColor,
                              }}
                            >
                              {item.label}
                            </span>
                          </div>
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            className="transition-all duration-300"
                            style={{
                              transform: hoveredItem === itemIdx && activeIndex === i ? 'translateX(0) rotate(-45deg)' : 'translateX(-4px) rotate(0deg)',
                              opacity: hoveredItem === itemIdx && activeIndex === i ? 1 : 0.3,
                            }}
                          >
                            <path
                              d="M4 12L12 4M12 4H5M12 4V11"
                              stroke={hoveredItem === itemIdx && activeIndex === i ? '#C8A96E' : (isDark ? 'rgba(245,240,235,0.3)' : 'rgba(26,26,26,0.3)')}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      ))}
                    </div>

                    <MagneticButton strength={0.2}>
                      <a
                        href={`/services#${service.id}`}
                        className={`learn-more-${i} mt-8 inline-flex items-center gap-3 font-body text-[12px] uppercase tracking-[0.2em] text-brushly-gold transition-colors hover:text-brushly-gold-light`}
                      >
                        Learn More
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M5 15L15 5M15 5H7M15 5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </MagneticButton>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT IMAGE PANEL */}
            <div className="image-panel-wrapper relative hidden w-1/2 overflow-hidden md:block" style={{ willChange: 'clip-path' }}>
              <div
                ref={imageContainerRef}
                className="absolute inset-[-30px]"
                style={{ willChange: 'transform' }}
              >
                {services.map((service, i) => (
                  <div
                    key={service.id}
                    ref={el => { imageRefs.current[i] = el }}
                    className="absolute inset-0"
                    style={{
                      opacity: i === 0 ? 1 : 0,
                      zIndex: i === 0 ? 2 : 1,
                      willChange: 'clip-path, transform',
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

              {/* Corner brackets */}
              {[
                { pos: 'top-4 left-4', rotate: 0 },
                { pos: 'top-4 right-4', rotate: 90 },
                { pos: 'bottom-4 right-4', rotate: 180 },
                { pos: 'bottom-4 left-4', rotate: 270 },
              ].map((corner, ci) => (
                <div key={ci} className={`corner-bracket absolute ${corner.pos} z-20`}
                  style={{ transform: `rotate(${corner.rotate}deg)` }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M0 12V0H12" stroke="rgba(200,169,110,0.3)" strokeWidth="1" />
                  </svg>
                </div>
              ))}

              {/* Animated service number + rotating ring */}
              <div className="absolute bottom-8 right-8 z-20 overflow-hidden">
                <svg className="number-ring absolute inset-[-20px]" viewBox="0 0 200 200" style={{ width: 'calc(100% + 40px)', height: 'calc(100% + 40px)' }}>
                  <circle cx="100" cy="100" r="90" fill="none"
                    stroke="rgba(200,169,110,0.08)" strokeWidth="0.5"
                    strokeDasharray="8 12" />
                </svg>
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

        {/* PROGRESS BAR bottom with glow dot */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-brushly-cream/10">
          <div
            className="relative h-full bg-brushly-gold transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${((activeIndex + 1) / services.length) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[8px] w-[8px] rounded-full bg-brushly-gold"
              style={{ boxShadow: '0 0 12px 3px rgba(200,169,110,0.4)' }} />
          </div>
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
