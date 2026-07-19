'use client'

import Link from 'next/link'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/animations/ScrollReveal'
import LineReveal from '@/components/animations/LineReveal'
import type { Area } from '@/lib/areas'

interface AreasIndexProps {
  areas: Pick<Area, 'slug' | 'name' | 'postcode' | 'intro'>[]
}

export default function AreasIndex({ areas }: AreasIndexProps) {
  return (
    <section className="bg-brushly-charcoal pb-24 pt-40 md:pb-32">
      <Container>
        <div className="max-w-3xl">
          <ScrollReveal>
            <Badge>Areas we cover</Badge>
            <h1
              className="mt-4 font-display font-light text-brushly-cream"
              style={{ fontSize: 'clamp(38px, 6vw, 76px)' }}
            >
              Painters &amp; decorators
              <br />
              <span className="italic text-brushly-gold">across Surrey</span>
            </h1>
            <p className="mt-6 text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
              Brushly works from Reigate across ten Surrey towns and the
              villages between them. Choose your area for local detail, or call
              us — if you are close to our patch, the answer is usually yes.
            </p>
          </ScrollReveal>
        </div>

        <div className="mt-16">
          <LineReveal />
        </div>

        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2">
          {areas.map((area, i) => (
            <li key={area.slug} className="border-b border-brushly-cream/10">
              <ScrollReveal delay={Math.min(i * 0.05, 0.25)} y={30}>
                <Link
                  href={`/areas/${area.slug}`}
                  className="group flex items-baseline justify-between gap-6 py-8 md:pr-12"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-display text-[28px] font-light text-brushly-cream transition-colors duration-300 group-hover:text-brushly-gold md:text-[36px]">
                      {area.name}
                    </span>
                    <span className="text-[12px] font-body uppercase tracking-[0.2em] text-brushly-cream/40">
                      {area.postcode}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="font-display text-[24px] text-brushly-gold/50 transition-all duration-300 group-hover:translate-x-2 group-hover:text-brushly-gold"
                  >
                    &rarr;
                  </span>
                </Link>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
