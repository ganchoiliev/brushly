import type { Metadata } from 'next'
import ServicesHero from './ServicesHero'
import ServiceDetails from './ServiceDetails'
import ProcessSection from './ProcessSection'
import FAQSection from '@/components/sections/FAQSection'
import CTASection from '@/components/sections/CTASection'
import {
  SITE_URL,
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
  jsonLdString,
  type FaqItem,
} from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Painting & Decorating Services in Surrey',
  description:
    'Interior painting, exterior painting, wallpapering and specialist finishes across Reigate, Epsom and Surrey. Premium preparation, premium paints, itemised free quotes.',
  alternates: { canonical: '/services' },
}

/* Mirrors the four services rendered by ServiceDetails — keep in sync. */
const SERVICES = [
  {
    slug: 'interior',
    name: 'Interior Painting',
    description:
      'Precision interior painting with meticulous preparation and premium paints from Farrow & Ball, Little Greene and Dulux Trade — walls, ceilings and specialist woodwork finishing.',
  },
  {
    slug: 'exterior',
    name: 'Exterior Painting',
    description:
      'Weather-resistant exterior painting for Surrey homes: substrate assessment, fungicidal treatment, breathable masonry systems and full timber and uPVC finishing.',
  },
  {
    slug: 'wallpapering',
    name: 'Wallpapering',
    description:
      'Expert hanging of luxury and designer wallpapers with full surface preparation, lining and precise pattern matching — from single feature walls to whole properties.',
  },
  {
    slug: 'specialist',
    name: 'Specialist Finishes',
    description:
      'Hand-applied artisan finishes: Venetian and Marmorino polished plaster, traditional limewash, colour washing and metallic glazes.',
  },
]

const FAQS: FaqItem[] = [
  {
    question: 'How do Brushly quotes work?',
    answer:
      'Every job starts with a free site visit. We measure, assess surface condition, and talk through colours and finishes — then send a written, itemised quote so you can see exactly what preparation, materials and labour are included. No day-rate ambiguity, and the price we agree is the price you pay.',
  },
  {
    question: 'Which paint brands do you use?',
    answer:
      'We supply and apply premium trade systems — Farrow & Ball, Little Greene and Dulux Trade among them — chosen for the surface and the room rather than habit. If you already have a colour in mind from any brand, we can colour-match or source it.',
  },
  {
    question: 'Are you insured?',
    answer:
      'Yes — Brushly Ltd carries £2m public liability insurance alongside employers’ liability cover. Documentation is available with your quote.',
  },
  {
    question: 'How long will my project take?',
    answer:
      'It depends on scope and surface condition, which is why the written quote includes a schedule: a single room is typically days, a whole-house or exterior redecoration is planned in phases. We agree working hours up front and leave spaces clean and usable at the end of each day.',
  },
  {
    question: 'Do you cover my area?',
    answer:
      'We work across ten Surrey towns from our Reigate base: Reigate, Redhill, Epsom, Banstead, Tadworth, Ashtead, Leatherhead, Dorking, Horley and Esher — plus the villages between. See the Areas page for local detail.',
  },
  {
    question: 'Can I preview colours before deciding?',
    answer:
      'Yes — our free AI visualizer shows your own room repainted in real paint colours in seconds. Shortlist shades there, then we confirm with physical sample pots on your walls before any full application.',
  },
]

export default function ServicesPage() {
  const schema = jsonLdString(
    breadcrumbSchema([
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
    ]),
    faqSchema(FAQS),
    ...SERVICES.map((s) =>
      serviceSchema({
        name: s.name,
        description: s.description,
        slug: s.slug,
        url: `${SITE_URL}/services#${s.slug}`,
      }),
    ),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schema }}
      />
      <ServicesHero />
      <ServiceDetails />
      <ProcessSection />
      <FAQSection faqs={FAQS} />
      <CTASection />
    </>
  )
}
