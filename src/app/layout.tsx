import type { Metadata } from 'next'
import { cormorantGaramond, dmSans } from '@/lib/fonts'
import SmoothScroll from '@/components/animations/SmoothScroll'
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
          {/* Header — placeholder until Header component is built */}
          <header className="fixed top-0 left-0 right-0 z-50" />
          <main>{children}</main>
          {/* Footer — placeholder until Footer component is built */}
          <footer />
        </SmoothScroll>
      </body>
    </html>
  )
}
