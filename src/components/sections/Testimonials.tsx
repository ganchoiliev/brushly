'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

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
    <section className="bg-brushly-cream py-28 md:py-40">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="text-brushly-gold-dark">Testimonials</Badge>

          <div className="relative mt-12 min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <blockquote
                  className="font-display font-light italic leading-relaxed text-brushly-black"
                  style={{ fontSize: 'clamp(22px, 3vw, 36px)' }}
                >
                  &ldquo;{testimonials[current].quote}&rdquo;
                </blockquote>
                <div className="mt-8">
                  <p className="text-[15px] font-body font-medium text-brushly-black">
                    {testimonials[current].author}
                  </p>
                  <p className="mt-1 text-[13px] font-body uppercase tracking-[0.15em] text-brushly-gold-dark">
                    {testimonials[current].location}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot Indicators */}
          <div className="mt-10 flex items-center justify-center gap-3">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i === current
                    ? 'w-8 bg-brushly-gold-dark'
                    : 'w-2 bg-brushly-black/20 hover:bg-brushly-gold-dark/50'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
