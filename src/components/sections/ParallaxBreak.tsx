'use client'

import ParallaxImage from '@/components/animations/ParallaxImage'
import TextReveal from '@/components/animations/TextReveal'
import LineReveal from '@/components/animations/LineReveal'
import ImageReveal from '@/components/animations/ImageReveal'
import ScrollReveal from '@/components/animations/ScrollReveal'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { useTheme } from '@/lib/ThemeContext'

export default function ParallaxBreak() {
  const { palette } = useTheme()
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden py-20 md:py-28">
      {/* Background parallax image */}
      <div className="absolute inset-0">
        <ImageReveal direction="up" className="h-full w-full">
          <ParallaxImage
            src="/img/details-bg.webp"
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
        <p className="mt-6 text-[14px] font-body uppercase tracking-[0.2em]" style={{ color: palette.accent, transition: 'color 0.8s ease' }}>
          — Brushly UK
        </p>
      </div>

      {/* Before/After Comparison */}
      <ScrollReveal delay={0.3} className="relative z-10 mx-auto mt-12 w-full max-w-3xl px-6 md:mt-16">
        <BeforeAfterSlider
          beforeSrc="/img/before.webp"
          afterSrc="/img/after.webp"
          beforeAlt="Room before painting"
          afterAlt="Room after painting"
          className="rounded-sm ring-1 ring-brushly-gold/20"
        />
      </ScrollReveal>
    </section>
  )
}
