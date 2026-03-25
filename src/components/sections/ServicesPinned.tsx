'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import Image from 'next/image'
import { blurDataURL } from '@/lib/shimmer'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from '@/components/animations/MagneticButton'
import PaintTexture from '@/components/ui/PaintTexture'
import { useTheme } from '@/lib/ThemeContext'

gsap.registerPlugin(ScrollTrigger)

const services = [
  {
    id: 'interior',
    title: 'Interior\nPainting',
    description: 'Transform your living spaces with precision colour application and flawless finishes. Our decorators combine meticulous preparation with premium paints from Farrow & Ball, Little Greene, and Dulux Trade.',
    items: [
      { label: 'Full Room Painting', focusX: 50, focusY: 50 },
      { label: 'Feature Walls', focusX: 30, focusY: 40 },
      { label: 'Ceiling & Woodwork', focusX: 50, focusY: 20 },
      { label: 'Colour Consultation', focusX: 70, focusY: 60 },
    ],
    image: '/img/interior.webp',
    fit: 'cover' as const,
  },
  {
    id: 'exterior',
    title: 'Exterior\nPainting',
    description: 'Protect and transform the outside of your property, safeguarding it against the British climate whilst enhancing kerb appeal. Every project begins with a thorough substrate assessment and meticulous preparation.',
    items: [
      { label: 'Masonry & Render', focusX: 40, focusY: 60 },
      { label: 'Window & Door Frames', focusX: 60, focusY: 40 },
      { label: 'Weather-Resistant Coatings', focusX: 50, focusY: 50 },
      { label: 'Full Exterior Refresh', focusX: 50, focusY: 30 },
    ],
    image: '/img/exterior.webp',
    fit: 'cover' as const,
    defaultPosition: '50% 40%',
  },
  {
    id: 'wallpapering',
    title: 'Wall-\npapering',
    description: 'From luxury designer papers to meticulous pattern alignment and surface preparation, we ensure a flawless finish that transforms your walls into a statement. Seamless, long-lasting results every time.',
    items: [
      { label: 'Designer Installation', focusX: 50, focusY: 50 },
      { label: 'Pattern Matching', focusX: 30, focusY: 30 },
      { label: 'Feature Walls', focusX: 70, focusY: 50 },
      { label: 'Wallpaper Removal', focusX: 50, focusY: 70 },
    ],
    image: '/img/wallpapering.webp',
    fit: 'cover' as const,
  },
  {
    id: 'specialist',
    title: 'Specialist\nFinishes',
    description: 'Artisan decorative techniques applied by hand using traditional methods. From the timeless lustre of Venetian plaster to the soft depth of limewash and the subtle shimmer of metallic effects.',
    items: [
      { label: 'Venetian Plaster', focusX: 40, focusY: 40 },
      { label: 'Limewash Finishes', focusX: 60, focusY: 50 },
      { label: 'Colour Washing', focusX: 50, focusY: 60 },
      { label: 'Metallic Effects', focusX: 70, focusY: 30 },
    ],
    image: '/img/finishes.webp',
    fit: 'cover' as const,
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
  const reduced = useReducedMotion()
  const { palette } = useTheme()

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
  // Skip when reduced motion preferred
  useEffect(() => {
    if (isMobile || !imageContainerRef.current || reduced) return
    const offsetX = hoveredItem !== null ? (imageFocus.x - 50) * 0.3 : mousePos.x * -20
    const offsetY = hoveredItem !== null ? (imageFocus.y - 50) * 0.3 : mousePos.y * -15

    gsap.to(imageContainerRef.current, {
      x: offsetX,
      y: offsetY,
      duration: hoveredItem !== null ? 0.8 : 1.2,
      ease: 'power3.out',
    })
  }, [mousePos, hoveredItem, imageFocus, isMobile])

  // Number counter animation (skip animation for reduced motion)
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
  // Light panels use theme palette, dark panels stay dark
  const textColor = isDark ? 'rgba(245,240,235,0.7)' : palette.textMuted
  const textMuted = isDark ? 'rgba(245,240,235,0.4)' : palette.textLabel
  const textSubtle = isDark ? 'rgba(245,240,235,0.06)' : `${palette.text}0D`
  const borderColor = isDark ? 'rgba(245,240,235,0.06)' : `${palette.text}0F`

  // Mobile layout
  if (isMobile) {
    return (
      <section>
        {/* Section header */}
        <div className="px-6 pt-20 pb-4" style={{ backgroundColor: palette.bg, transition: 'background-color 0.8s ease' }}>
          <div className="mb-4 h-px w-12" style={{ backgroundColor: `${palette.accent}4D` }} />
          <span className="font-body text-[11px] uppercase tracking-[0.3em]" style={{ color: palette.textLabel }}>
            What We Do
          </span>
          <h2 className="mt-3 font-display text-4xl font-light" style={{ color: palette.text }}>
            Our Services
          </h2>
        </div>

        {services.map((service, i) => {
          const isLight = i % 2 === 0
          const titleColor = isLight ? palette.text : '#F5F0EB'
          const descColor = isLight ? palette.textMuted : 'rgba(245,240,235,0.5)'
          const itemColor = isLight ? palette.textMuted : 'rgba(245,240,235,0.6)'
          const borderStyle = isLight ? `${palette.text}14` : 'rgba(245,240,235,0.08)'
          const arrowStroke = isLight ? `${palette.text}40` : `${palette.accent}66`
          const numberStroke = isLight ? `1px ${palette.accent}4D` : `1px ${palette.accent}66`

          return (
            <div key={service.id} className="relative px-6 py-12" style={{ backgroundColor: isLight ? palette.bg : '#1A1A1A', transition: 'background-color 0.8s ease' }}>
              {/* Image first — acts as visual anchor */}
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title.replace('\n', ' ')}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={i === 0}
                  placeholder="blur"
                  blurDataURL={blurDataURL}
                />
                {/* Dark gradient overlay for number readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {/* Number + title overlay on image */}
                <div className="absolute bottom-4 left-5 right-5">
                  <span
                    className="font-display text-[56px] font-light leading-none"
                    style={{ WebkitTextStroke: numberStroke, color: 'transparent' }}
                  >
                    0{i + 1}
                  </span>
                  <h3 className="mt-[-8px] font-display text-2xl font-light text-brushly-cream whitespace-pre-line">
                    {service.title.replace('\n', ' ')}
                  </h3>
                </div>
              </div>

              {/* Content below image */}
              <div className="mt-5">
                <p className="font-body text-[14px] leading-relaxed" style={{ color: descColor }}>
                  {service.description}
                </p>

                {/* Service items as clickable links */}
                <div className="mt-5 flex flex-col">
                  {service.items.map((item) => (
                    <a
                      key={item.label}
                      href={`/services#${service.id}`}
                      className="flex items-center justify-between border-b py-3"
                      style={{ borderColor: borderStyle }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="block h-[5px] w-[5px] rounded-full" style={{ backgroundColor: `${palette.accent}99` }} />
                        <span className="font-body text-[13px]" style={{ color: itemColor }}>
                          {item.label}
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 12L12 4M12 4H5M12 4V11"
                          stroke={arrowStroke}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  ))}
                </div>

                {/* Learn more link */}
                <a
                  href={`/services#${service.id}`}
                  className="mt-5 inline-flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: palette.accent }}
                >
                  Learn More
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M5 15L15 5M15 5H7M15 5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          )
        })}
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
          style={{ backgroundColor: isDark ? '#1A1A1A' : palette.bg }}
        />

        {/* Change 1: Grain texture overlay for depth */}
        <PaintTexture variant="grain" opacity={0.03} />

        {/* Section label + top line */}
        <div className="absolute left-[220px] lg:left-[280px] right-0 top-0 z-30">
          <div className="services-top-line h-px w-full origin-left" style={{ backgroundColor: `${palette.accent}4D`, transition: 'background-color 0.8s ease' }} />
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
          {/* LEFT SIDEBAR — Change 4: numbered nav + separators */}
          <div className="hidden w-[220px] flex-shrink-0 flex-col justify-between px-8 py-12 md:flex lg:w-[280px] lg:px-12">
            <div>
              <span
                className="font-body text-[11px] uppercase tracking-[0.3em] transition-colors duration-700"
                style={{ color: textMuted }}
              >
                Services:
              </span>
              <nav className="relative mt-8 flex flex-col">
                {/* Animated active line indicator */}
                <div
                  ref={sidebarLineRef}
                  className="absolute left-0 w-[2px] bg-brushly-gold"
                  style={{ top: 0, height: 20, transition: 'none' }}
                />
                {services.map((service, i) => (
                  <div key={service.id}>
                    <button
                      className={`service-sidebar-item service-nav-${i} flex items-baseline gap-3 text-left pl-4 py-3 transition-all duration-500`}
                      style={{
                        color: activeIndex === i
                          ? palette.accent
                          : isDark
                            ? 'rgba(245,240,235,0.35)'
                            : palette.textLabel,
                      }}
                    >
                      <span
                        className="font-body text-[10px] tracking-wider transition-colors duration-500"
                        style={{
                          color: activeIndex === i ? palette.accent : isDark ? 'rgba(245,240,235,0.2)' : `${palette.text}33`,
                        }}
                      >
                        0{i + 1}
                      </span>
                      <span
                        className="font-body text-[14px] transition-all duration-500"
                        style={{ fontWeight: activeIndex === i ? 600 : 400 }}
                      >
                        {service.title.replace('\n', ' ')}
                      </span>
                    </button>
                    {i < services.length - 1 && (
                      <div
                        className="ml-4 h-px w-8 transition-colors duration-700"
                        style={{ backgroundColor: borderColor }}
                      />
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <div
              className="transition-colors duration-700"
              style={{ color: isDark ? 'rgba(245,240,235,0.3)' : palette.textLabel }}
            >
              <span className="font-body text-[10px] uppercase tracking-[0.2em]">
                Surrey &middot; Epsom &middot; Reigate
              </span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="relative flex flex-1 flex-col md:flex-row">
            {/* Change 5: Elegant solid divider with gold gradient fade */}
            <div
              className="absolute left-1/2 top-[8%] bottom-[8%] z-20 hidden -translate-x-px md:block w-px"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.15) 20%, rgba(200,169,110,0.15) 80%, transparent)',
              }}
            />

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
                  {/* Ghost title — second word at bottom of panel */}
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      pointerEvents: 'none',
                      right: '1.5rem',
                      bottom: '2rem',
                      padding: '0.15em 0.05em',
                      textAlign: 'right',
                    }}
                  >
                    <span
                      className={`ghost-line-${i} block font-display font-light leading-[0.85]`}
                      style={{
                        fontSize: 'clamp(50px, 9vw, 130px)',
                        color: textSubtle,
                        WebkitTextStroke: isDark
                          ? '1px rgba(245,240,235,0.06)'
                          : `1px ${palette.text}0A`,
                        transition: 'color 0.7s ease, -webkit-text-stroke 0.7s ease',
                        willChange: 'clip-path',
                      }}
                    >
                      {service.title.split('\n')[1]}
                    </span>
                  </div>

                  {/* Change 3: Content overlay with more breathing room */}
                  <div className="relative z-10 max-w-md">
                    {/* Gold accent line */}
                    <div className={`accent-line-${i} mb-8 h-px w-12 origin-left`} style={{ backgroundColor: `${palette.accent}80` }} />

                    {/* Description — word spans for stagger */}
                    <p className="font-body text-[15px] leading-relaxed transition-colors duration-700"
                      style={{ color: isDark ? 'rgba(245,240,235,0.6)' : palette.textMuted }}>
                      {service.description.split(' ').map((word, wi) => (
                        <span key={wi} className="inline-block overflow-hidden" style={{ marginRight: '0.3em' }}>
                          <span className={`desc-word-${i} inline-block`}>{word}</span>
                        </span>
                      ))}
                    </p>

                    {/* Ghost title first word — between description and items */}
                    <div className="overflow-hidden my-6" style={{ padding: '0.15em 0.05em', margin: '1.5rem -0.05em' }}>
                      <span
                        className={`ghost-line-${i} block font-display font-light leading-[0.85]`}
                        style={{
                          fontSize: 'clamp(50px, 9vw, 130px)',
                          color: textSubtle,
                          WebkitTextStroke: isDark
                            ? '1px rgba(245,240,235,0.06)'
                            : '1px rgba(26,26,26,0.04)',
                          transition: 'color 0.7s ease, -webkit-text-stroke 0.7s ease',
                          willChange: 'clip-path',
                        }}
                      >
                        {service.title.split('\n')[0]}
                      </span>
                    </div>

                    {/* Change 6: Sub-service list with hover background wash */}
                    <div className="flex flex-col">
                      {service.items.map((item, itemIdx) => (
                        <a
                          key={item.label}
                          href={`/services#${service.id}`}
                          className={`sub-item-${i} group flex items-center justify-between border-b py-4 transition-all duration-300`}
                          style={{
                            borderColor: borderColor,
                            paddingLeft: hoveredItem === itemIdx && activeIndex === i ? '12px' : '0px',
                            backgroundColor: hoveredItem === itemIdx && activeIndex === i
                              ? (isDark ? `${palette.accent}0A` : `${palette.accent}0F`)
                              : 'transparent',
                            transition: 'padding-left 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s, background-color 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
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
                                  ? palette.accent
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
                              stroke={hoveredItem === itemIdx && activeIndex === i ? palette.accent : (isDark ? 'rgba(245,240,235,0.3)' : `${palette.text}4D`)}
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
                        className={`learn-more-${i} mt-8 inline-flex items-center gap-3 font-body text-[12px] uppercase tracking-[0.2em] transition-colors`}
                        style={{ color: palette.accent }}
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
                className="absolute inset-[-15px]"
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
                      className={`${service.fit === 'cover' ? 'object-cover' : 'object-cover'} transition-all duration-700`}
                      style={{
                        objectPosition: hoveredItem !== null && activeIndex === i
                          ? `${services[i].items[hoveredItem]?.focusX || 50}% ${services[i].items[hoveredItem]?.focusY || 50}%`
                          : (service.defaultPosition || '50% 50%'),
                        transform: hoveredItem !== null && activeIndex === i ? 'scale(1.06)' : 'scale(1.0)',
                      }}
                      sizes="50vw"
                      priority={i === 0}
                      placeholder="blur"
                      blurDataURL={blurDataURL}
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

              {/* Change 2: Cinematic vignette overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-[9]"
                style={{
                  background: `linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 40%),
                               linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 20%),
                               radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)`,
                }}
              />

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

              {/* Change 7: Refined service number + double rotating ring */}
              <div className="absolute bottom-8 right-8 z-20 overflow-hidden">
                <svg className="number-ring absolute inset-[-20px]" viewBox="0 0 200 200" style={{ width: 'calc(100% + 40px)', height: 'calc(100% + 40px)' }}>
                  <circle cx="100" cy="100" r="90" fill="none"
                    stroke="rgba(200,169,110,0.08)" strokeWidth="0.5"
                    strokeDasharray="8 12" />
                  <circle cx="100" cy="100" r="70" fill="none"
                    stroke="rgba(200,169,110,0.05)" strokeWidth="0.5"
                    strokeDasharray="4 8" />
                </svg>
                <span
                  ref={numberRef}
                  className="block font-display font-light leading-none"
                  style={{
                    fontSize: '140px',
                    color: 'transparent',
                    WebkitTextStroke: isDark ? '1px rgba(245,240,235,0.06)' : '1px rgba(26,26,26,0.06)',
                  }}
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
          <span className="font-display text-[32px] font-light" style={{ color: palette.accent }}>
            0{activeIndex + 1}
          </span>
          <span className="font-body text-[12px] text-brushly-cream/30">/04</span>
        </div>
      </div>
    </section>
  )
}
