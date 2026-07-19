import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AREAS, getArea, getNearbyAreas } from '@/lib/areas'
import { breadcrumbSchema, faqSchema, jsonLdString } from '@/lib/seo'
import AreaHero from './AreaHero'
import AreaBody from './AreaBody'
import FAQSection from '@/components/sections/FAQSection'
import CTASection from '@/components/sections/CTASection'

/* All 10 canonical service areas prerender at build time; anything else 404s. */
export const dynamicParams = false

export function generateStaticParams() {
  return AREAS.map((area) => ({ slug: area.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const area = getArea(slug)
  if (!area) return {}

  return {
    title: area.metaTitle,
    description: area.metaDescription,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: {
      title: `${area.metaTitle} | Brushly`,
      description: area.metaDescription,
      url: `/areas/${area.slug}`,
    },
  }
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const area = getArea(slug)
  if (!area) notFound()

  const nearby = getNearbyAreas(area).map(({ name, slug }) => ({ name, slug }))

  const schema = jsonLdString(
    breadcrumbSchema([
      { name: 'Home', href: '/' },
      { name: 'Areas', href: '/areas' },
      { name: area.name, href: `/areas/${area.slug}` },
    ]),
    faqSchema(area.faqs),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />
      <AreaHero
        headline={area.headline}
        headlineAccent={area.headlineAccent}
        intro={area.intro}
        postcode={area.postcode}
        county={area.county}
      />
      <AreaBody area={area} nearby={nearby} />
      <FAQSection
        badge={`FAQs · ${area.name}`}
        title={`Decorating in ${area.name}, answered`}
        faqs={area.faqs}
      />
      <CTASection />
    </>
  )
}
