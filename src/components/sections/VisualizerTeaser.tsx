'use client'

import { motion } from 'framer-motion'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'

export default function VisualizerTeaser() {
  return (
    <section className="relative overflow-hidden bg-brushly-black py-24 md:py-36">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="font-body text-[12px] uppercase tracking-[0.3em] text-brushly-gold/70">
            New · AI Paint Visualizer
          </span>
          <h2 className="mt-5 font-display text-4xl font-light leading-[1.05] text-brushly-cream md:text-6xl">
            See your room before we lift a brush.
          </h2>
          <p className="mx-auto mt-6 max-w-xl font-body text-[15px] leading-relaxed text-brushly-cream/60">
            Snap a photo, pick a colour or finish, and watch it appear on your own walls in
            seconds — interior, exterior, wallpaper or specialist finishes. Free to try.
          </p>
          <div className="mt-10 flex justify-center">
            <Button href="/visualizer">Try the visualizer</Button>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
