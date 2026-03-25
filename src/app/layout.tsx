import type { Metadata, Viewport } from 'next'
import { cormorantGaramond, dmSans } from '@/lib/fonts'
import SmoothScroll from '@/components/animations/SmoothScroll'
import PageLoader from '@/components/layout/PageLoader'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CustomCursor from '@/components/animations/CustomCursor'
import GrainOverlay from '@/components/animations/GrainOverlay'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Brushly UK | Premium Painting & Decorating',
    template: '%s | Brushly UK',
  },
  description:
    'Premium painting and decorating services in Surrey, Epsom & Reigate. Flawless finishes for homes and businesses that demand more than just a coat of paint.',
  keywords: [
    'painting',
    'decorating',
    'premium',
    'Surrey',
    'Epsom',
    'Reigate',
    'interior painting',
    'exterior painting',
    'wallpapering',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${dmSans.variable} antialiased`}
    >
      <body className="min-h-screen bg-brushly-charcoal text-brushly-cream font-body">
        <SmoothScroll>
          <PageLoader />
          <Header />
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
        <CustomCursor />
        <GrainOverlay />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
