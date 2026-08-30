'use client'

import { ThemeProvider } from '@/lib/ThemeContext'
import HeroCinematic from '@/components/sections/HeroCinematic'
import ServicesPinned from '@/components/sections/ServicesPinned'
import StatsCounter from '@/components/sections/StatsCounter'
import ProcessTimeline from '@/components/sections/ProcessTimeline'
import ShowcaseGrid from '@/components/sections/ShowcaseGrid'
import BrandMarquee from '@/components/sections/BrandMarquee'
import CTASection from '@/components/sections/CTASection'
import CredentialsStrip from '@/components/sections/CredentialsStrip'
import ParallaxBreak from '@/components/sections/ParallaxBreak'
import VisualizerTeaser from '@/components/sections/VisualizerTeaser'

export default function HomePageClient() {
  return (
    <ThemeProvider>
      <HeroCinematic />
      <ServicesPinned />
      <StatsCounter />
      <ProcessTimeline />
      <ShowcaseGrid />
      <VisualizerTeaser />
      <ParallaxBreak />
      <BrandMarquee />
      {/* Testimonials removed 2026-08-30: the three quotes were placeholder
          copy, not real clients. Re-add once real Google reviews exist and
          the component reads them verbatim. */}
      <CredentialsStrip />
      <CTASection />
    </ThemeProvider>
  )
}
