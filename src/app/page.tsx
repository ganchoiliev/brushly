import HeroSplit from '@/components/sections/HeroSplit'
import ServicesPinned from '@/components/sections/ServicesPinned'
import StatsCounter from '@/components/sections/StatsCounter'
import ProcessTimeline from '@/components/sections/ProcessTimeline'
import ParallaxBreak from '@/components/sections/ParallaxBreak'
import ShowcaseGrid from '@/components/sections/ShowcaseGrid'
import BrandMarquee from '@/components/sections/BrandMarquee'
import Testimonials from '@/components/sections/Testimonials'
import CTASection from '@/components/sections/CTASection'

export default function HomePage() {
  return (
    <>
      <HeroSplit />
      <ServicesPinned />
      <StatsCounter />
      <ProcessTimeline />
      <ParallaxBreak />
      <ShowcaseGrid />
      <BrandMarquee />
      <Testimonials />
      <CTASection />
    </>
  )
}
