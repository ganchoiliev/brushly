'use client'

import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/animations/ScrollReveal'

export default function MapSection() {
  return (
    <section className="bg-brushly-cream py-20 md:py-32">
      <Container>
        <ScrollReveal>
          <div className="overflow-hidden rounded-sm" style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d80000!2d-0.26!3d51.33!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2suk"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Brushly service area — Surrey, Epsom, Reigate"
            />
          </div>
          <p className="mt-4 text-center text-[13px] font-body uppercase tracking-[0.15em] text-brushly-black/40">
            Proudly serving Surrey, Epsom, Reigate &amp; surrounding areas
          </p>
        </ScrollReveal>
      </Container>
    </section>
  )
}
