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
import Script from 'next/script'
import { ADS_ID } from '@/lib/gtag'
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
        {/* Google tag (gtag.js) — Google Ads + Consent Mode v2. Loaded once
            site-wide via next/script; the dataLayer queue guarantees consent
            defaults are registered before the config call. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:['GB','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO']});
gtag('set','url_passthrough', true);
gtag('js', new Date());
gtag('config', '${ADS_ID}');`}
        </Script>
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
