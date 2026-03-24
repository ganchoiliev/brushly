'use client'

import { useState, useEffect, useCallback } from 'react'
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

export default function Testimonials() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }, [])

  useEffect(() => {
    const interval = setInterval(next, 5000)
    return () => clearInterval(interval)
  }, [next])

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
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
                onClick={() => setCurrent(i)}
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
