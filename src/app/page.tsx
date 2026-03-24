import HeroCinematic from '@/components/sections/HeroCinematic'
import ServicesPinned from '@/components/sections/ServicesPinned'
import StatsCounter from '@/components/sections/StatsCounter'
import ProcessTimeline from '@/components/sections/ProcessTimeline'
import ShowcaseGrid from '@/components/sections/ShowcaseGrid'
import BrandMarquee from '@/components/sections/BrandMarquee'
import Testimonials from '@/components/sections/Testimonials'
import CTASection from '@/components/sections/CTASection'
import ParallaxBreak from '@/components/sections/ParallaxBreak'

export default function HomePage() {
  return (
    <>
      <HeroCinematic />
      <ServicesPinned />
      <StatsCounter />
      <ProcessTimeline />
      <ShowcaseGrid />
      <ParallaxBreak />
      <BrandMarquee />
      <Testimonials />
      <CTASection />
    </>
  )
}
