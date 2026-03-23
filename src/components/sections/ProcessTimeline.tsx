'use client'

import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/animations/ScrollReveal'
import ParallaxImage from '@/components/animations/ParallaxImage'
import LineReveal from '@/components/animations/LineReveal'

const steps = [
  {
    number: '01',
    title: 'Consultation',
    description:
      'We visit your property, discuss your vision, and provide a transparent quote.',
  },
  {
    number: '02',
    title: 'Preparation',
    description:
      'Meticulous surface prep. Filling, sanding, priming — the foundation of every flawless finish.',
  },
  {
    number: '03',
    title: 'Execution',
    description:
      'Premium materials applied by skilled craftsmen. Multiple coats, clean lines, every time.',
  },
  {
    number: '04',
    title: 'Inspection',
    description:
      "A thorough walkthrough with you. We don't finish until you're completely satisfied.",
  },
]

export default function ProcessTimeline() {
  return (
    <section className="bg-brushly-cream py-28 md:py-40">
      <Container>
        <ScrollReveal>
          <Badge className="text-brushly-gold-dark">How We Work</Badge>
          <h2
            className="mt-4 font-display font-light text-brushly-black"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            Our Process
          </h2>
        </ScrollReveal>

        <div className="relative mt-20">
          {/* Vertical connecting line — desktop only */}
          <div className="absolute left-1/2 top-0 hidden h-full w-[1px] -translate-x-1/2 bg-brushly-gold/20 md:block" />

          {steps.map((step, i) => (
            <div key={step.number}>
              <ScrollReveal delay={i * 0.15}>
                <div
                  className={`relative grid grid-cols-1 gap-8 py-12 md:grid-cols-2 md:gap-20 md:py-16 ${
                    i % 2 === 0 ? '' : 'md:direction-rtl'
                  }`}
                >
                  <div
                    className={`${i % 2 !== 0 ? 'md:order-2 md:text-left' : ''}`}
                  >
                    <span className="font-display font-light text-brushly-gold-dark/40" style={{ fontSize: '64px' }}>
                      {step.number}
                    </span>
                    <h3 className="mt-2 font-display text-3xl font-light text-brushly-black md:text-4xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-md text-[15px] font-body leading-relaxed text-brushly-black/60">
                      {step.description}
                    </p>
                  </div>
                  <div
                    className={`flex items-center ${
                      i % 2 !== 0 ? 'md:order-1 md:justify-end' : 'md:justify-start'
                    }`}
                  >
                    {/* Gold dot on center line */}
                    <div className="absolute left-1/2 top-1/2 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brushly-gold md:block" />
                  </div>
                </div>
              </ScrollReveal>

              {/* Parallax image between steps 2 and 3 */}
              {i === 1 && (
                <ScrollReveal>
                  <div className="my-8 overflow-hidden md:my-16" style={{ height: '400px' }}>
                    <ParallaxImage
                      src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                      alt="Paint preparation work"
                      speed={0.15}
                      className="h-full w-full"
                    />
                  </div>
                </ScrollReveal>
              )}

              {i < steps.length - 1 && <LineReveal />}
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
