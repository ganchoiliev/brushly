import type { Metadata } from 'next'
import GalleryHero from './GalleryHero'
import BeforeAfterSection from './BeforeAfterSection'
import GalleryGrid from './GalleryGrid'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'Our Work — Painting & Decorating Gallery',
  description:
    'Before-and-after transformations and finished projects from Brushly decorators across Reigate, Epsom and Surrey — interiors, exteriors, wallpaper and specialist finishes.',
  alternates: { canonical: '/gallery' },
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
