'use client'

import { useRef, useEffect, useState } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import Image from 'next/image'
import { blurDataURL } from '@/lib/shimmer'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    number: '01',
    title: 'Consultation',
    subtitle: 'Understanding your vision',
    description: 'We visit your property, discuss your vision, assess every surface, and provide a detailed, transparent quote. No hidden costs, no pressure — just honest advice on how to achieve the finish you want.',
    details: ['On-site property assessment', 'Colour & finish guidance', 'Transparent fixed-price quote', 'Timeline planning'],
    image: '/img/consultation.webp',
  },
  {
    number: '02',
    title: 'Preparation',
    subtitle: 'The foundation of perfection',
    description: 'We spend as much time preparing surfaces as painting them. Filling, sanding, priming, masking, protecting your furniture and floors. This invisible work is what separates a good finish from a flawless one.',
    details: ['Surface filling & sanding', 'Professional masking', 'Furniture & floor protection', 'Primer application'],
    image: '/img/preparation.webp',
  },
  {
    number: '03',
    title: 'Execution',
    subtitle: 'Precision in every stroke',
    description: 'Premium materials applied by skilled craftsmen. Multiple coats for depth and durability, cut lines so clean they look taped, and consistent coverage that transforms your space completely.',
    details: ['Premium paint application', 'Multiple coat system', 'Clean cutting-in', 'Consistent coverage'],
    image: '/img/execution.webp',
  },
  {
    number: '04',
    title: 'Inspection',
    subtitle: 'Nothing leaves imperfect',
    description: 'A thorough walkthrough with you under natural and artificial light. We check every edge, every corner, every surface. We don\'t consider a project complete until you are completely satisfied with every detail.',
    details: ['Full walkthrough with client', 'Natural & artificial light check', 'Touch-up & refinement', 'Complete clean-up'],
    image: '/img/inspection.webp',
  },
]

export default function ProcessTimeline() {
  const sectionRef = useRef<HTMLElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [isMobile, setIsMobile] = useState(true)
  const reduced = useReducedMotion()

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Drawing progress line + per-step reveals
  useEffect(() => {
    if (isMobile) return

    const ctx = gsap.context(() => {
      // --- Drawing line ---
      if (lineRef.current) {
        const lineLength = lineRef.current.getTotalLength()
        gsap.set(lineRef.current, {
          strokeDasharray: lineLength,
          strokeDashoffset: lineLength,
        })
        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            end: 'bottom 40%',
            scrub: 0.5,
          },
        })
      }

      // --- Per-step animations ---
      steps.forEach((_, i) => {
        const stepEl = stepRefs.current[i]
        const nodeEl = nodeRefs.current[i]
        if (!stepEl) return

        const isEven = i % 2 === 0
        const imageClipFrom = isEven
          ? 'inset(0% 100% 0% 0%)'
          : 'inset(0% 0% 0% 100%)'
        const imageClipTo = 'inset(0% 0% 0% 0%)'

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stepEl,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        })

        // Image wipe
        tl.fromTo(stepEl.querySelector('.step-image'),
          { clipPath: imageClipFrom },
          { clipPath: imageClipTo, duration: 1.0, ease: 'power3.inOut' }
        )

        // Step number
        tl.from(stepEl.querySelector('.step-number'), {
          yPercent: 100,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
        }, '-=0.7')

        // Subtitle
        tl.from(stepEl.querySelector('.step-subtitle'), {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: 'power3.out',
        }, '-=0.4')

        // Title clip reveal
        tl.fromTo(stepEl.querySelector('.step-title'),
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power3.out' },
          '-=0.3'
        )

        // Description words stagger
        tl.from(stepEl.querySelectorAll('.desc-word'), {
          yPercent: 60,
          opacity: 0,
          stagger: 0.015,
          duration: 0.5,
          ease: 'power3.out',
        }, '-=0.4')

        // Detail items stagger
        tl.from(stepEl.querySelectorAll('.detail-item'), {
          x: -20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power3.out',
        }, '-=0.3')

        // Node on the line
        if (nodeEl) {
          tl.from(nodeEl, {
            scale: 0,
            duration: 0.5,
            ease: 'elastic.out(1, 0.5)',
          }, '-=0.6')
        }

        // Image parallax
        const img = stepEl.querySelector('.step-image-inner')
        if (img) {
          gsap.to(img, {
            y: -40,
            ease: 'none',
            scrollTrigger: {
              trigger: stepEl,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.3,
            },
          })
        }
      })

      // Section header entrance
      const headerTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      })
      headerTl.fromTo('.process-top-line',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.0, ease: 'power3.inOut' }
      )
      headerTl.from('.process-label', {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      }, '-=0.6')
      headerTl.from('.process-ghost', {
        yPercent: 30,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      }, '-=0.5')

    }, sectionRef)

    return () => ctx.revert()
  }, [isMobile])

  // Mobile layout
  if (isMobile) {
    return (
      <section className="bg-brushly-cream">
        <div className="px-6 pt-20 pb-4">
          <span className="font-body text-[11px] uppercase tracking-[0.3em] text-brushly-black/30">
            How We Work
          </span>
          <h2 className="mt-3 font-display text-4xl font-light text-brushly-black">
            Our Process
          </h2>
        </div>
        {steps.map((step, i) => (
          <div key={step.number} className="relative px-6 py-16">
            <div className="overflow-hidden">
              <span className="block font-display text-[72px] font-light leading-none" style={{ WebkitTextStroke: '1px rgba(200,169,110,0.3)', color: 'transparent' }}>
                {step.number}
              </span>
            </div>
            <span className="mt-2 block font-body text-[11px] uppercase tracking-[0.2em] text-brushly-gold-dark">
              {step.subtitle}
            </span>
            <h3 className="mt-2 font-display text-3xl font-light text-brushly-black">
              {step.title}
            </h3>
            <p className="mt-4 font-body text-[14px] leading-relaxed text-brushly-black/50">
              {step.description}
            </p>
            <div className="mt-6 aspect-[3/4] overflow-hidden">
              <Image
                src={step.image}
                alt={step.title}
                width={800}
                height={1067}
                className="h-full w-full object-cover"
                placeholder="blur"
                blurDataURL={blurDataURL}
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {step.details.map((detail) => (
                <div key={detail} className="flex items-center gap-2">
                  <span className="block h-[5px] w-[5px] rounded-full bg-brushly-gold" />
                  <span className="font-body text-[12px] text-brushly-black/45">{detail}</span>
                </div>
              ))}
            </div>
            {i < steps.length - 1 && (
              <div className="mx-auto mt-16 h-[1px] w-16 bg-brushly-gold/20" />
            )}
          </div>
        ))}
      </section>
    )
  }

  // Desktop flowing layout
  return (
    <section ref={sectionRef} className="relative bg-brushly-cream overflow-hidden">
      {/* Section header */}
      <div className="relative px-12 pt-32 pb-8 lg:px-20">
        <div className="process-top-line mx-auto mb-8 h-px w-24 origin-center" style={{ backgroundColor: 'rgba(200,169,110,0.4)' }} />
        <div className="text-center">
          <span className="process-label block font-body text-[11px] uppercase tracking-[0.3em] text-brushly-black/60">
            How We Work
          </span>
        </div>
        <div className="relative mt-4 text-center overflow-hidden">
          <span
            className="process-ghost block font-display font-light leading-none"
            style={{
              fontSize: 'clamp(60px, 10vw, 120px)',
              WebkitTextStroke: '2px rgba(200,169,110,0.6)',
              color: 'transparent',
            }}
          >
            Process
          </span>
        </div>
      </div>

      {/* Center drawing line (SVG) */}
      <div className="absolute left-1/2 top-[280px] bottom-[120px] z-10 hidden -translate-x-px md:block" style={{ width: '2px' }}>
        <svg className="h-full w-full" viewBox="0 0 2 1000" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <line
            ref={lineRef}
            x1="1" y1="0" x2="1" y2="1000"
            stroke="rgba(200,169,110,0.25)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Steps */}
      <div className="relative z-20 pb-32">
        {steps.map((step, i) => {
          const isEven = i % 2 === 0
          return (
            <div
              key={step.number}
              ref={el => { stepRefs.current[i] = el }}
              className="relative py-12 lg:py-20"
            >
              {/* Node on center line */}
              <div
                ref={el => { nodeRefs.current[i] = el }}
                className="absolute left-1/2 top-1/2 z-30 hidden -translate-x-1/2 -translate-y-1/2 md:block"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brushly-gold/30 bg-brushly-cream">
                  <div className="h-3 w-3 rounded-full bg-brushly-gold" />
                </div>
              </div>

              {/* Content row */}
              <div className={`mx-auto flex max-w-[1400px] items-center gap-8 px-8 lg:gap-16 lg:px-16 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Text side */}
                <div className={`w-[42%] ${isEven ? 'pr-12 text-right' : 'pl-12 text-left'}`}>
                  <div className="overflow-hidden">
                    <span
                      className="step-number block font-display font-light leading-none"
                      style={{
                        fontSize: 'clamp(64px, 8vw, 110px)',
                        WebkitTextStroke: '1.5px rgba(200,169,110,0.25)',
                        color: 'transparent',
                      }}
                    >
                      {step.number}
                    </span>
                  </div>
                  <span className="step-subtitle mt-3 block font-body text-[11px] uppercase tracking-[0.2em] text-brushly-gold-dark">
                    {step.subtitle}
                  </span>
                  <div className="overflow-hidden">
                    <h3
                      className="step-title mt-2 font-display font-light text-brushly-black"
                      style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className={`mt-5 font-body text-[15px] leading-relaxed text-brushly-black/55 ${isEven ? 'ml-auto max-w-md' : 'max-w-md'}`}>
                    {step.description.split(' ').map((word, wi) => (
                      <span key={wi} className="inline-block overflow-hidden" style={{ marginRight: '0.3em' }}>
                        <span className="desc-word inline-block">{word}</span>
                      </span>
                    ))}
                  </p>
                  <div className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-2 ${isEven ? 'ml-auto max-w-md' : 'max-w-md'}`}>
                    {step.details.map((detail) => (
                      <div key={detail} className={`detail-item flex items-center gap-2 ${isEven ? 'justify-end' : ''}`}>
                        {isEven && <span className="font-body text-[13px] text-brushly-black/45">{detail}</span>}
                        <span className="block h-[5px] w-[5px] flex-shrink-0 rounded-full bg-brushly-gold" />
                        {!isEven && <span className="font-body text-[13px] text-brushly-black/45">{detail}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image side */}
                <div className="w-[50%]">
                  <div className="step-image relative overflow-hidden" style={{ aspectRatio: '3/4', willChange: 'clip-path' }}>
                    <div className="step-image-inner absolute inset-[-20px]">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover"
                        sizes="50vw"
                        priority={i === 0}
                        placeholder="blur"
                        blurDataURL={blurDataURL}
                      />
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/10 to-transparent" />
                    {/* Corner brackets */}
                    {[
                      { pos: 'top-3 left-3', rotate: 0 },
                      { pos: 'top-3 right-3', rotate: 90 },
                      { pos: 'bottom-3 right-3', rotate: 180 },
                      { pos: 'bottom-3 left-3', rotate: 270 },
                    ].map((corner, ci) => (
                      <div key={ci} className={`absolute ${corner.pos} z-10`}
                        style={{ transform: `rotate(${corner.rotate}deg)` }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M0 10V0H10" stroke="rgba(200,169,110,0.25)" strokeWidth="1" />
                        </svg>
                      </div>
                    ))}
                    {/* Step number watermark */}
                    <div className="absolute bottom-4 right-6">
                      <span className="font-display text-[80px] font-light leading-none text-white/5">
                        {step.number}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
