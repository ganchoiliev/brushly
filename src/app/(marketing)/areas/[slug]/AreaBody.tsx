'use client'

import Link from 'next/link'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ScrollReveal from '@/components/animations/ScrollReveal'
import LineReveal from '@/components/animations/LineReveal'
import type { Area } from '@/lib/areas'

const services = [
  { label: 'Interior Painting', href: '/services#interior' },
  { label: 'Exterior Painting', href: '/services#exterior' },
  { label: 'Wallpapering', href: '/services#wallpapering' },
  { label: 'Specialist Finishes', href: '/services#specialist' },
]

interface AreaBodyProps {
  area: Area
  nearby: { name: string; slug: string }[]
}

export default function AreaBody({ area, nearby }: AreaBodyProps) {
  return (
    <>
      {/* Local narrative */}
      <section className="bg-brushly-charcoal py-24 md:py-32">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ScrollReveal>
                <Badge>Local knowledge</Badge>
                <h2
                  className="mt-4 font-display font-light text-brushly-cream"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}
                >
                  Decorating {area.name}&rsquo;s homes,{' '}
                  <span className="italic text-brushly-gold">properly</span>
                </h2>
              </ScrollReveal>
              {area.paragraphs.map((text, i) => (
                <ScrollReveal key={i} delay={0.1 + i * 0.1} y={40}>
                  <p className="mt-8 text-[16px] font-body font-light leading-relaxed text-brushly-cream/60">
                    {text}
                  </p>
                </ScrollReveal>
              ))}

              <ScrollReveal delay={0.2} y={30}>
                <p className="mt-8 text-[13px] font-body uppercase tracking-[0.2em] text-brushly-cream/40">
                  Also covering{' '}
                  <span className="text-brushly-cream/60">
                    {area.villages.join(' · ')}
                  </span>
                </p>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-5">
              <ScrollReveal delay={0.15}>
                <div className="border border-brushly-gold/15 bg-brushly-black/40 p-8 md:p-10">
                  <Badge>What you get</Badge>
                  <ul className="mt-6 flex flex-col gap-5">
                    {area.highlights.map((h) => (
                      <li key={h} className="flex gap-4">
                        <span
                          aria-hidden
                          className="mt-[9px] h-px w-6 shrink-0 bg-brushly-gold/60"
                        />
                        <span className="text-[15px] font-body font-light leading-relaxed text-brushly-cream/70">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button href="/contact" className="w-full">
                      Get a Free Quote
                    </Button>
                  </div>
                  <p className="mt-4 text-center text-[12px] font-body text-brushly-cream/40">
                    Free site visits &middot; Itemised written quotes &middot;
                    £2m insured
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.25}>
                <div className="mt-6 border border-brushly-cream/10 p-8 md:p-10">
                  <Badge>Services in {area.name}</Badge>
                  <ul className="mt-6 flex flex-col gap-3">
                    {services.map((s) => (
                      <li key={s.href}>
                        <Link
                          href={s.href}
                          className="group flex items-baseline justify-between gap-4 text-[15px] font-body text-brushly-cream/60 transition-colors hover:text-brushly-gold"
                        >
                          {s.label}
                          <span
                            aria-hidden
                            className="text-brushly-gold/50 transition-transform duration-300 group-hover:translate-x-1"
                          >
                            &rarr;
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </div>

          <div className="mt-20">
            <LineReveal />
          </div>
        </Container>
      </section>

      {/* Visualizer bridge — the differentiator no directory painter has */}
      <section className="bg-brushly-black py-20 md:py-28">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <ScrollReveal className="max-w-2xl">
              <Badge>Try before you decide</Badge>
              <h2
                className="mt-4 font-display font-light text-brushly-cream"
                style={{ fontSize: 'clamp(26px, 3.5vw, 42px)' }}
              >
                See your {area.name} home repainted{' '}
                <span className="italic text-brushly-gold">
                  before we lift a brush
                </span>
              </h2>
              <p className="mt-5 text-[15px] font-body font-light leading-relaxed text-brushly-cream/60">
                Photograph your room, pick a colour, and our free AI visualizer
                shows you the finished result in seconds — real paint shades on
                your actual walls.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <Button href="/visualizer" variant="outline">
                Open the Visualizer
              </Button>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Nearby areas — crawlable interlinking between location pages */}
      <section className="bg-brushly-charcoal pb-4 pt-20 md:pt-24">
        <Container>
          <ScrollReveal>
            <Badge>Nearby</Badge>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {nearby.map((n) => (
                <Link
                  key={n.slug}
                  href={`/areas/${n.slug}`}
                  className="font-display text-[20px] font-light italic text-brushly-cream/50 transition-colors hover:text-brushly-gold md:text-[24px]"
                >
                  {n.name}
                </Link>
              ))}
              <Link
                href="/areas"
                className="font-display text-[20px] font-light text-brushly-gold/70 transition-colors hover:text-brushly-gold md:text-[24px]"
              >
                All areas &rarr;
              </Link>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </>
  )
}
