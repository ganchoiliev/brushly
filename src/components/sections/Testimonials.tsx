'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ParallaxImage from '@/components/animations/ParallaxImage'

const testimonials = [
  {
    quote:
      'Brushly transformed our entire home with extraordinary attention to detail. The finish is absolutely immaculate — better than we ever imagined.',
    author: 'Sarah & James Mitchell',
    location: 'Epsom, Surrey',
  },
  {
    quote:
      'Professional from start to finish. The preparation work was meticulous and the final result speaks for itself. We would not hesitate to recommend.',
    author: 'David Thompson',
    location: 'Reigate, Surrey',
  },
  {
    quote:
      'We needed specialist finishes for our period property and Brushly delivered beyond expectations. True craftsmen who take pride in their work.',
    author: 'Eleanor & Richard Hughes',
    location: 'Leatherhead, Surrey',
  },
]

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 80 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80 }),
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const next = () => {
    setDirection(1)
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }

  const prev = () => {
    setDirection(-1)
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goTo = (index: number) => {
    if (index === current) return
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
  }

  return (
    <section className="relative py-28 md:py-40 overflow-hidden">
      {/* Background parallax image */}
      <div className="absolute inset-0">
        <ParallaxImage
          src="https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1920&q=80"
          alt="Interior finish detail"
          speed={0.1}
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 bg-brushly-black/70" />

      <Container>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Badge>Testimonials</Badge>

          {/* Decorative quotation mark */}
          <span className="mt-8 block font-display text-brushly-gold/20" style={{ fontSize: '120px', lineHeight: '0.8' }}>
            &ldquo;
          </span>

          <div className="relative mt-4 min-h-[200px] md:min-h-[280px]">
            {/* Navigation arrows — desktop only */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between md:flex">
              <button
                onClick={prev}
                className="pointer-events-auto -ml-16 flex h-10 w-10 items-center justify-center rounded-full border border-brushly-gold/20 text-brushly-gold transition-colors hover:border-brushly-gold/60 hover:bg-brushly-gold/10"
                aria-label="Previous testimonial"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={next}
                className="pointer-events-auto -mr-16 flex h-10 w-10 items-center justify-center rounded-full border border-brushly-gold/20 text-brushly-gold transition-colors hover:border-brushly-gold/60 hover:bg-brushly-gold/10"
                aria-label="Next testimonial"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_e, info) => {
                  const swipeThreshold = 50
                  const velocityThreshold = 300
                  if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                    next()
                  } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                    prev()
                  }
                }}
                data-cursor="drag"
                aria-live="polite"
              >
                <blockquote
                  className="font-display font-light italic leading-relaxed text-brushly-cream"
                  style={{ fontSize: 'clamp(22px, 3vw, 36px)' }}
                >
                  {testimonials[current].quote}
                </blockquote>
                <div className="mt-8">
                  <p className="text-[15px] font-body font-medium text-brushly-cream">
                    {testimonials[current].author}
                  </p>
                  <p className="mt-1 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-gold">
                    {testimonials[current].location}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot Indicators — 44px touch target with visual dot inside */}
          <div className="mt-10 flex items-center justify-center gap-1">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label={`Go to testimonial ${i + 1}`}
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-500 ${
                    i === current
                      ? 'w-8 bg-brushly-gold'
                      : 'w-2 bg-brushly-cream/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
