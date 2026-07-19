import type { Metadata } from 'next'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'
import MapSection from './MapSection'

export const metadata: Metadata = {
  title: 'Contact — Free Painting & Decorating Quote',
  description:
    'Call 01737 479 161 or send the form for a free, itemised painting and decorating quote anywhere in our Surrey coverage area. Site visits are free; the quote is in writing.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactForm />
      <MapSection />
    </>
  )
}
