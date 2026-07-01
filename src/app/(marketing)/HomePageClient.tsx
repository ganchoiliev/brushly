'use client'

import { ThemeProvider } from '@/lib/ThemeContext'
import HeroCinematic from '@/components/sections/HeroCinematic'
import ServicesPinned from '@/components/sections/ServicesPinned'
import StatsCounter from '@/components/sections/StatsCounter'
import ProcessTimeline from '@/components/sections/ProcessTimeline'
import ShowcaseGrid from '@/components/sections/ShowcaseGrid'
import BrandMarquee from '@/components/sections/BrandMarquee'
import Testimonials from '@/components/sections/Testimonials'
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
      <Testimonials />
      <CredentialsStrip />
      <CTASection />
    </ThemeProvider>
  )
}
