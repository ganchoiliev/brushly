import type { Metadata } from 'next'
import { AREAS } from '@/lib/areas'
import { breadcrumbSchema, jsonLdString } from '@/lib/seo'
import AreasIndex from './AreasIndex'
import CTASection from '@/components/sections/CTASection'

export const metadata: Metadata = {
  title: 'Areas We Cover — Surrey Painters & Decorators',
  description:
    'Brushly covers ten Surrey towns from its Reigate base: Reigate, Redhill, Epsom, Banstead, Tadworth, Ashtead, Leatherhead, Dorking, Horley and Esher. Premium painting and decorating, free quotes.',
  alternates: { canonical: '/areas' },
}

export default function AreasPage() {
  const areas = AREAS.map(({ slug, name, postcode, intro }) => ({
    slug,
    name,
    postcode,
    intro,
  }))

  const schema = jsonLdString(
    breadcrumbSchema([
      { name: 'Home', href: '/' },
      { name: 'Areas', href: '/areas' },
    ]),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />
      <AreasIndex areas={areas} />
      <CTASection />
    </>
  )
}
