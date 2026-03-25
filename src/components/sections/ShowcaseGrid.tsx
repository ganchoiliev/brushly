'use client'

import Image from 'next/image'
import { blurDataURL } from '@/lib/shimmer'
import Link from 'next/link'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import TextReveal from '@/components/animations/TextReveal'
import ImageReveal from '@/components/animations/ImageReveal'
import ScrollReveal from '@/components/animations/ScrollReveal'

const projects = [
  {
    title: 'Victorian Townhouse Revival',
    location: 'Epsom, Surrey',
    category: 'Interior',
    image: '/img/townhouse.webp',
  },
  {
    title: 'Modern Kitchen Refresh',
    location: 'Reigate, Surrey',
    category: 'Interior',
    image: '/img/modern_kitchen.webp',
  },
  {
    title: 'Heritage Exterior Restoration',
    location: 'Dorking, Surrey',
    category: 'Exterior',
    image: '/img/heritage.webp',
  },
  {
    title: 'Venetian Plaster Feature Wall',
    location: 'Esher, Surrey',
    category: 'Specialist',
    image: '/img/plaster.webp',
  },
  {
    title: 'Period Property Hallway',
    location: 'Leatherhead, Surrey',
    category: 'Interior',
    image: '/img/hallway.webp',
  },
  {
    title: 'Designer Wallpaper Installation',
    location: 'Cobham, Surrey',
    category: 'Wallpaper',
    image: '/img/designer-wall.webp',
  },
]

const cardConfigs: {
  grid: string
  aspect: string
  dir: 'left' | 'right' | 'up' | 'down'
  delay: number
  sizes: string
}[] = [
  { grid: 'col-span-1 md:[grid-column:span_7]',  aspect: 'aspect-[4/3]',                   dir: 'left',  delay: 0,    sizes: '(max-width: 768px) 50vw, 58vw' },
  { grid: 'col-span-1 md:[grid-column:span_5]',  aspect: 'aspect-[4/3] md:aspect-[3/4]',   dir: 'right', delay: 0.15, sizes: '(max-width: 768px) 50vw, 42vw' },
  { grid: 'col-span-1 md:[grid-column:span_4]',  aspect: 'aspect-[4/3]',                   dir: 'up',    delay: 0,    sizes: '(max-width: 768px) 50vw, 33vw' },
  { grid: 'col-span-1 md:[grid-column:span_4]',  aspect: 'aspect-[4/3]',                   dir: 'up',    delay: 0.12, sizes: '(max-width: 768px) 50vw, 33vw' },
  { grid: 'col-span-2 md:[grid-column:span_4]',  aspect: 'aspect-[16/9] md:aspect-[4/3]',  dir: 'up',    delay: 0.24, sizes: '(max-width: 768px) 100vw, 33vw' },
  { grid: 'col-span-2 md:[grid-column:span_12]', aspect: 'aspect-[16/9] md:aspect-[21/9]', dir: 'up',    delay: 0,    sizes: '100vw' },
]

const cornerBrackets = [
  { pos: 'top-4 left-4', rotate: 0 },
  { pos: 'top-4 right-4', rotate: 90 },
  { pos: 'bottom-4 right-4', rotate: 180 },
  { pos: 'bottom-4 left-4', rotate: 270 },
]

export default function ShowcaseGrid() {
  return (
    <section className="bg-brushly-black overflow-hidden">
      {/* Header */}
      <div className="py-16 md:py-24">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <ScrollReveal>
                <Badge>Selected Work</Badge>
              </ScrollReveal>
              <TextReveal
                as="h2"
                className="mt-4 font-display font-light text-brushly-cream"
                style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
                staggerDelay={0.04}
              >
                Recent Projects
              </TextReveal>
            </div>
            <ScrollReveal delay={0.3}>
              <a
                href="/gallery"
                className="text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-gold transition-colors hover:text-brushly-gold-light"
              >
                View All Work &rarr;
              </a>
            </ScrollReveal>
          </div>
        </Container>
      </div>

      {/* Bento Grid */}
      <Container>
        <div className="grid grid-cols-2 gap-3 pb-16 md:grid-cols-12 md:gap-4 md:pb-24">
          {projects.map((project, i) => {
            const config = cardConfigs[i]
            return (
              <Link
                key={project.title}
                href="/gallery"
                className={`group relative block overflow-hidden ring-1 ring-white/0 transition-all duration-500 hover:ring-brushly-gold/20 ${config.grid} ${config.aspect}`}
              >
                <div className="absolute inset-0">
                  {/* Image with clipPath reveal */}
                  <ImageReveal
                    direction={config.dir}
                    delay={config.delay}
                    className="absolute inset-0"
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                        sizes={config.sizes}
                        priority={i === 0}
                        placeholder="blur"
                        blurDataURL={blurDataURL}
                      />
                    </div>
                  </ImageReveal>
                </div>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-brushly-black/80 via-brushly-black/30 to-transparent opacity-100 transition-opacity duration-500 md:opacity-0 md:group-hover:opacity-100" />

                {/* Corner brackets — appear on hover */}
                {cornerBrackets.map((corner, ci) => (
                  <div
                    key={ci}
                    className={`absolute ${corner.pos} z-20 opacity-0 transition-opacity duration-500 delay-100 group-hover:opacity-100`}
                    style={{ transform: `rotate(${corner.rotate}deg)` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M0 10V0H10" stroke="rgba(200,169,110,0.4)" strokeWidth="1" />
                    </svg>
                  </div>
                ))}

                {/* Text overlay — slides up on hover */}
                <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-0 opacity-100 p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:p-8">
                  <span className="text-[11px] font-body uppercase tracking-[0.2em] text-brushly-gold">
                    {project.category}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-light text-brushly-cream md:text-2xl">
                    {project.title}
                  </h3>
                  <p className="mt-1 text-[12px] font-body uppercase tracking-[0.15em] text-brushly-cream/60">
                    {project.location}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>

      {/* Bottom CTA */}
      <div className="pb-20 md:pb-28">
        <ScrollReveal className="flex justify-center" delay={0.2}>
          <Button href="/gallery" variant="outline">
            View All Work
          </Button>
        </ScrollReveal>
      </div>
    </section>
  )
}
