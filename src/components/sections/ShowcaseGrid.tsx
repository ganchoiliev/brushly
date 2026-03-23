'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

const projects = [
  {
    title: 'Victorian Townhouse Revival',
    location: 'Epsom, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    span: 'md:col-span-2',
  },
  {
    title: 'Modern Kitchen Refresh',
    location: 'Reigate, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    span: '',
  },
  {
    title: 'Heritage Exterior Restoration',
    location: 'Dorking, Surrey',
    category: 'Exterior',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    span: '',
  },
  {
    title: 'Venetian Plaster Feature Wall',
    location: 'Esher, Surrey',
    category: 'Specialist',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    span: '',
  },
  {
    title: 'Period Property Hallway',
    location: 'Leatherhead, Surrey',
    category: 'Interior',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    span: '',
  },
  {
    title: 'Designer Wallpaper Installation',
    location: 'Cobham, Surrey',
    category: 'Wallpaper',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
    span: 'md:col-span-2',
  },
]

export default function ShowcaseGrid() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.showcase-card', {
        y: 80,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 65%',
          toggleActions: 'play none none none',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="bg-brushly-black py-28 md:py-40">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Badge>Selected Work</Badge>
            <h2
              className="mt-4 font-display font-light text-brushly-cream"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              Recent Projects
            </h2>
          </div>
          <a
            href="/gallery"
            className="text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-gold transition-colors hover:text-brushly-gold-light"
          >
            View All Work &rarr;
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.title}
              className={`showcase-card will-animate group relative cursor-pointer overflow-hidden ${project.span}`}
              style={{ aspectRatio: project.span ? '16/9' : '4/5' }}
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                sizes={project.span ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
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
      </Container>
    </section>
  )
}
