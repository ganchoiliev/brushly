'use client'

import { useState } from 'react'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import ScrollReveal from '@/components/animations/ScrollReveal'
import LineReveal from '@/components/animations/LineReveal'
import type { FaqItem } from '@/lib/seo'

interface FAQSectionProps {
  title?: string
  badge?: string
  faqs: readonly FaqItem[]
}

/*
 * SEO note: every answer is rendered in the DOM on the server — the
 * accordion only animates height/opacity. Never gate answer text behind
 * conditional rendering, or crawlers lose the FAQPage content.
 */
export default function FAQSection({
  title = 'Questions, answered',
  badge = 'FAQs',
  faqs,
}: FAQSectionProps) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-brushly-charcoal py-24 md:py-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <Badge>{badge}</Badge>
            <h2
              className="mt-4 font-display font-light text-brushly-cream"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)' }}
            >
              {title}
            </h2>
          </ScrollReveal>

          <div className="mt-12">
            {faqs.map((faq, i) => {
              const isOpen = open === i
              return (
                <ScrollReveal key={faq.question} delay={Math.min(i * 0.06, 0.3)} y={30}>
                  <div className="border-b border-brushly-cream/10">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between gap-6 py-6 text-left"
                    >
                      <span className="font-display text-[19px] font-light leading-snug text-brushly-cream md:text-[22px]">
                        {faq.question}
                      </span>
                      <span
                        aria-hidden
                        className={`mt-1 shrink-0 font-display text-[22px] leading-none text-brushly-gold transition-transform duration-500 ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                        style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
                      >
                        +
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-500"
                      style={{
                        gridTemplateRows: isOpen ? '1fr' : '0fr',
                        transitionTimingFunction: 'var(--ease-out-expo)',
                      }}
                    >
                      <div className="overflow-hidden">
                        <p className="pb-6 pr-10 text-[15px] font-body font-light leading-relaxed text-brushly-cream/60">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>

          <div className="mt-16">
            <LineReveal />
          </div>
        </div>
      </Container>
    </section>
  )
}
