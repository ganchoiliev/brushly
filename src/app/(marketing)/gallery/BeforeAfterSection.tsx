'use client'

import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/animations/ScrollReveal'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'

export default function BeforeAfterSection() {
  return (
    <section className="bg-brushly-cream py-20 md:py-32">
      <Container>
        <ScrollReveal>
          <Badge>Before &amp; After</Badge>
          <h2
            className="mt-4 max-w-xl font-display font-light text-brushly-black"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
          >
            The Brushly <span className="italic text-brushly-gold">difference</span>
          </h2>
          <p className="mt-4 max-w-lg text-[16px] font-body font-light leading-relaxed text-brushly-black/60">
            Drag the slider to see the transformation. Every project starts with
            meticulous preparation and ends with a flawless finish.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <ScrollReveal delay={0.1}>
            <BeforeAfterSlider
              beforeSrc="/img/before.webp"
              afterSrc="/img/after.webp"
              beforeAlt="Living room before renovation"
              afterAlt="Living room after Brushly transformation"
            />
            <p className="mt-4 text-center text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
              Living Room — Virginia Water, Surrey
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <BeforeAfterSlider
              beforeSrc="/img/cta-before.webp"
              afterSrc="/img/cta-after.webp"
              beforeAlt="Lounge before renovation"
              afterAlt="Lounge after Brushly transformation"
            />
            <p className="mt-4 text-center text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
              Lounge — Reigate, Surrey
            </p>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  )
}
