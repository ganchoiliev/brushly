import type { Metadata } from 'next'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Brushly UK. Request a free quote for premium painting and decorating services in Surrey.',
}

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactForm />
    </>
  )
}
