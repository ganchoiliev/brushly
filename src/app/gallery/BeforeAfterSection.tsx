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
              beforeSrc="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80"
              afterSrc="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
              beforeAlt="Living room before renovation"
              afterAlt="Living room after Brushly transformation"
            />
            <p className="mt-4 text-center text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
              Living Room — Epsom, Surrey
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <BeforeAfterSlider
              beforeSrc="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80"
              afterSrc="https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80"
              beforeAlt="Kitchen before renovation"
              afterAlt="Kitchen after Brushly transformation"
            />
            <p className="mt-4 text-center text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
              Kitchen — Reigate, Surrey
            </p>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  )
}
