import type { Metadata } from 'next'
import AboutHero from './AboutHero'
import StorySection from './StorySection'
import ValuesSection from './ValuesSection'
import StatsCounter from '@/components/sections/StatsCounter'
import CredentialsStrip from '@/components/sections/CredentialsStrip'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'About Brushly — Decorators Based in Reigate, Surrey',
  description:
    'The story behind Brushly: a Reigate-based painting and decorating company built on meticulous preparation, premium paints and finishes that last. Fully insured, quotes always free.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <StatsCounter />
      <StorySection />
      <ValuesSection />
      <CredentialsStrip />
      <CTASection />
    </>
  )
}
