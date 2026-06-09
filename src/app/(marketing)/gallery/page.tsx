import type { Metadata } from 'next'
import GalleryHero from './GalleryHero'
import BeforeAfterSection from './BeforeAfterSection'
import GalleryGrid from './GalleryGrid'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Browse our portfolio of completed painting and decorating projects across Surrey, Epsom, and Reigate.',
}

export default function GalleryPage() {
  return (
    <>
      <GalleryHero />
      <BeforeAfterSection />
      <GalleryGrid />
      <CTASection />
    </>
  )
}
