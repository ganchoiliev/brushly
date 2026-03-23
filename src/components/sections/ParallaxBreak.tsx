'use client'

import ParallaxImage from '@/components/animations/ParallaxImage'
import TextReveal from '@/components/animations/TextReveal'
import LineReveal from '@/components/animations/LineReveal'
import ImageReveal from '@/components/animations/ImageReveal'

export default function ParallaxBreak() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background parallax image */}
      <div className="absolute inset-0">
        <ImageReveal direction="up" className="h-full w-full">
          <ParallaxImage
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80"
            alt="Beautiful interior"
            speed={0.2}
            className="h-full w-full"
          />
        </ImageReveal>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-brushly-black/50" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <TextReveal
          as="h2"
          className="font-display font-light italic leading-tight text-brushly-cream"
          staggerDelay={0.08}
          duration={1}
        >
          The difference is in the details
        </TextReveal>
        <div className="mx-auto mt-8 max-w-[200px]">
          <LineReveal />
        </div>
        <p className="mt-6 text-[14px] font-body uppercase tracking-[0.2em] text-brushly-gold">
          — Brushly UK
        </p>
      </div>
    </section>
  )
}
