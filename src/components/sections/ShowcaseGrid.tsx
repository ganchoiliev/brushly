'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import TextReveal from '@/components/animations/TextReveal'

gsap.registerPlugin(ScrollTrigger)

const projects = [
  {
    title: 'Victorian Townhouse Revival',
    location: 'Epsom, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  },
  {
    title: 'Modern Kitchen Refresh',
    location: 'Reigate, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
  },
  {
    title: 'Heritage Exterior Restoration',
    location: 'Dorking, Surrey',
    category: 'Exterior',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  },
  {
    title: 'Venetian Plaster Feature Wall',
    location: 'Esher, Surrey',
    category: 'Specialist',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
  },
  {
    title: 'Period Property Hallway',
    location: 'Leatherhead, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
  },
  {
    title: 'Designer Wallpaper Installation',
    location: 'Cobham, Surrey',
    category: 'Wallpaper',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
  },
]

export default function ShowcaseGrid() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Horizontal scroll on desktop
  useEffect(() => {
    if (isMobile || !trackRef.current || !sectionRef.current) return

    const track = trackRef.current
    const totalScroll = track.scrollWidth - window.innerWidth

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${totalScroll}`,
          pin: true,
          scrub: 1,
          refreshPriority: -1,
          invalidateOnRefresh: true,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [isMobile])

  return (
    <section ref={sectionRef} className="bg-brushly-black overflow-hidden">
      {/* Header */}
      <div className="py-16 md:py-20">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge>Selected Work</Badge>
              <TextReveal
                as="h2"
                className="mt-4 font-display font-light text-brushly-cream"
                style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
                staggerDelay={0.04}
              >
                Recent Projects
              </TextReveal>
            </div>
            <a
              href="/gallery"
              className="text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-gold transition-colors hover:text-brushly-gold-light"
            >
              View All Work &rarr;
            </a>
          </div>
        </Container>
      </div>

      {/* Horizontal Track (desktop) / Vertical Grid (mobile) */}
      {isMobile ? (
        <div className="px-6 pb-20">
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <div
                key={project.title}
                className="group relative overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brushly-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="text-[11px] font-body uppercase tracking-[0.2em] text-brushly-gold">
                    {project.category}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-light text-brushly-cream">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-[12px] font-body uppercase tracking-[0.15em] text-brushly-cream/60">
                    {project.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex gap-6 pl-16 pb-20"
          style={{ width: 'max-content' }}
          data-cursor="drag"
        >
          {projects.map((project) => (
            <div
              key={project.title}
              className="group relative flex-shrink-0 overflow-hidden"
              style={{ width: '45vw', aspectRatio: '3/2' }}
              data-cursor="view"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                sizes="45vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brushly-black/80 via-brushly-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-8 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                <span className="text-[11px] font-body uppercase tracking-[0.2em] text-brushly-gold">
                  {project.category}
                </span>
                <h3 className="mt-1 font-display text-2xl font-light text-brushly-cream">
                  {project.title}
                </h3>
                <p className="mt-1 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-cream/60">
                  {project.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
