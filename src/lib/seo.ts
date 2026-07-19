/**
 * Central SEO module — single source of truth for business identity (NAP),
 * canonical URLs, and JSON-LD structured-data builders.
 *
 * NAP consistency rule: name / phone / locality here MUST match the Google
 * Business Profile and the footer exactly. Change it in one place only.
 *
 * Brushly is a service-area business (SAB): schema publishes locality-level
 * address (Reigate, Surrey) + areaServed, never a street address.
 */

export const SITE_URL = 'https://brushly.uk'

export const BUSINESS = {
  name: 'Brushly',
  legalName: 'Brushly Ltd',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  image: `${SITE_URL}/og.jpg`,
  telephone: '+441737479161',
  telephoneDisplay: '01737 479 161',
  email: 'hello@brushly.uk',
  priceRange: '££',
  address: {
    locality: 'Reigate',
    region: 'Surrey',
    postalCode: 'RH2',
    country: 'GB',
  },
  geo: { latitude: 51.2362, longitude: -0.2054 },
  sameAs: [
    'https://www.instagram.com/brushly.uk/',
    'https://www.facebook.com/Brushlyuk/',
    'https://www.tiktok.com/@brushlyuk',
  ],
  description:
    'Premium painting and decorating company covering Reigate, Redhill, Epsom and the wider Surrey area. Interior and exterior painting, wallpapering and specialist finishes for homes and businesses.',
} as const

/**
 * Towns Brushly serves — mirrored by /areas pages and areaServed schema.
 * Canonical 10 — MUST stay in lockstep with the GBP service-area list
 * (suspension history: never let site and profile diverge). KT-belt
 * expansion is parked behind the 2026-07-06 triggers; do not add towns
 * here without updating GBP in the same change.
 */
export const SERVICE_AREAS = [
  'Reigate',
  'Redhill',
  'Epsom',
  'Banstead',
  'Tadworth',
  'Ashtead',
  'Leatherhead',
  'Dorking',
  'Horley',
  'Esher',
] as const

export interface FaqItem {
  question: string
  answer: string
}

export interface BreadcrumbItem {
  name: string
  href: string
}

type Schema = Record<string, unknown>

const areaServed = () =>
  SERVICE_AREAS.map((town) => ({
    '@type': 'City',
    name: town,
    address: { '@type': 'PostalAddress', addressCountry: 'GB' },
  }))

/**
 * Sitewide LocalBusiness entity. HousePainter is the schema.org subtype
 * Google maps to the painter category — keep it first.
 */
export function localBusinessSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'HousePainter',
    '@id': `${SITE_URL}/#business`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: BUSINESS.url,
    logo: BUSINESS.logo,
    image: BUSINESS.image,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    priceRange: BUSINESS.priceRange,
    description: BUSINESS.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    areaServed: areaServed(),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '17:00',
      },
    ],
    sameAs: [...BUSINESS.sameAs],
  }
}

export function webSiteSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Brushly',
    publisher: { '@id': `${SITE_URL}/#business` },
  }
}

export interface ServiceInput {
  name: string
  description: string
  slug: string
  url: string
}

export function serviceSchema(service: ServiceInput): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/services#${service.slug}`,
    name: service.name,
    description: service.description,
    url: service.url,
    serviceType: service.name,
    provider: { '@id': `${SITE_URL}/#business` },
    areaServed: areaServed(),
  }
}

export function faqSchema(faqs: readonly FaqItem[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  }
}

/**
 * Serialize schema for a <script type="application/ld+json"> tag.
 * `<` is escaped to prevent `</script>` breakout (XSS hygiene).
 */
export function jsonLdString(...schemas: Schema[]): string {
  const payload = schemas.length === 1 ? schemas[0] : schemas
  return JSON.stringify(payload).replace(/</g, '\\u003c')
}
