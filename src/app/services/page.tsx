import type { Metadata } from 'next'
import ServicesHero from './ServicesHero'
import ServiceDetails from './ServiceDetails'
import ProcessSection from './ProcessSection'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Interior painting, exterior painting, wallpapering, and specialist finishes. Explore our full range of premium decorating services.',
}

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <ServiceDetails />
      <ProcessSection />
      <CTASection />
    </>
  )
}
