import type { Metadata } from 'next'
import { cormorantGaramond, dmSans } from '@/lib/fonts'
import SmoothScroll from '@/components/animations/SmoothScroll'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
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
          <Header />
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  )
}
