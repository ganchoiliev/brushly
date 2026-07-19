import type { Metadata } from 'next'
import MarketingChrome from '@/components/layout/MarketingChrome'
import {
  SITE_URL,
  localBusinessSchema,
  webSiteSchema,
  jsonLdString,
} from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Brushly — Premium Painter & Decorator in Reigate & Surrey',
    template: '%s | Brushly',
  },
  description:
    'Premium painting and decorating across Reigate, Redhill, Epsom and Surrey. Interior & exterior painting, wallpapering and specialist finishes — flawless results for homes that demand more than a coat of paint.',
  openGraph: {
    type: 'website',
    siteName: 'Brushly',
    locale: 'en_GB',
    url: SITE_URL,
    title: 'Brushly — Premium Painter & Decorator in Reigate & Surrey',
    description:
      'Premium painting and decorating across Reigate, Redhill, Epsom and Surrey. Interior & exterior painting, wallpapering and specialist finishes.',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Brushly — premium painting and decorating in Surrey',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brushly — Premium Painter & Decorator in Reigate & Surrey',
    description:
      'Premium painting and decorating across Reigate, Redhill, Epsom and Surrey.',
    images: ['/og.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {/* Sitewide entity graph: HousePainter LocalBusiness + WebSite.
          Page-level schemas (Service, FAQPage, BreadcrumbList) reference
          the business via @id — keep this the single source of truth. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(localBusinessSchema(), webSiteSchema()),
        }}
      />
      <MarketingChrome>{children}</MarketingChrome>
    </>
  )
}
