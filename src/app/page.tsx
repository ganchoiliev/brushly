import HeroVideo from '@/components/sections/HeroVideo'
import ServicesGrid from '@/components/sections/ServicesGrid'
import ShowcaseGrid from '@/components/sections/ShowcaseGrid'
import Testimonials from '@/components/sections/Testimonials'
import CTASection from '@/components/sections/CTASection'

export default function HomePage() {
  return (
    <>
      <HeroVideo />
      <ServicesGrid />
      <ShowcaseGrid />
      <Testimonials />
      <CTASection />
    </>
  )
}
