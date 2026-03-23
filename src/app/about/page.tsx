import type { Metadata } from 'next'
import AboutHero from './AboutHero'
import StorySection from './StorySection'
import ValuesSection from './ValuesSection'
import StatsCounter from '@/components/sections/StatsCounter'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'About',
  description:
    'The story behind Brushly UK. Learn about our commitment to premium craftsmanship and exceptional decorating services.',
}

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <StatsCounter />
      <StorySection />
      <ValuesSection />
      <CTASection />
    </>
  )
}
