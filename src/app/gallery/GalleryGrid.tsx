'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import ImageReveal from '@/components/animations/ImageReveal'

gsap.registerPlugin(ScrollTrigger)

const filters = ['All', 'Interior', 'Exterior', 'Wallpaper', 'Specialist']

const directions = ['left', 'up', 'right'] as const

const projects = [
  {
    title: 'Victorian Townhouse Revival',
    category: 'Interior',
    location: 'Epsom, Surrey',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    span: 'col-span-1 md:col-span-2 row-span-2',
  },
  {
    title: 'Modern Kitchen Refresh',
    category: 'Interior',
    location: 'Reigate, Surrey',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    span: 'col-span-1',
  },
  {
    title: 'Heritage Exterior',
    category: 'Exterior',
    location: 'Dorking, Surrey',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    span: 'col-span-1',
  },
  {
    title: 'Designer Wallpaper Feature',
    category: 'Wallpaper',
    location: 'Cobham, Surrey',
    image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800&q=80',
    span: 'col-span-1',
  },
  {
    title: 'Venetian Plaster Lounge',
    category: 'Specialist',
    location: 'Esher, Surrey',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
    span: 'col-span-1',
  },
  {
    title: 'Period Property Restoration',
    category: 'Interior',
    location: 'Leatherhead, Surrey',
    image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80',
    span: 'col-span-1 md:col-span-2',
  },
  {
    title: 'Contemporary Living Space',
    category: 'Interior',
    location: 'Guildford, Surrey',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    span: 'col-span-1',
  },
  {
    title: 'Cottage Exterior Refresh',
    category: 'Exterior',
    location: 'Banstead, Surrey',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    span: 'col-span-1',
  },
]

export default function GalleryGrid() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered =
    activeFilter === 'All'
      ? projects
      : projects.filter((p) => p.category === activeFilter)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gallery-item', {
        y: 50,
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
  }, [activeFilter])

  return (
    <section ref={sectionRef} className="bg-brushly-cream py-20 md:py-32">
      <Container>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-[13px] font-body font-medium uppercase tracking-[0.15em] transition-colors duration-300 ${
                activeFilter === filter
                  ? 'text-brushly-gold-dark'
                  : 'text-brushly-black/40 hover:text-brushly-black'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-12 grid auto-rows-[280px] grid-cols-1 gap-4 md:grid-cols-3">
          {filtered.map((project, i) => (
            <ImageReveal
              key={project.title}
              direction={directions[i % 3]}
              delay={i * 0.08}
              className={project.span}
            >
              <div
                className="gallery-item group relative h-full cursor-pointer overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  style={{ backgroundImage: `url(${project.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brushly-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-6 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="text-[11px] font-body uppercase tracking-[0.2em] text-brushly-gold">
                    {project.category}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-light text-brushly-cream">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-body text-brushly-cream/60">
                    {project.location}
                  </p>
                </div>
              </div>
            </ImageReveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
