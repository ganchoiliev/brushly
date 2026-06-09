import type { Metadata, Viewport } from 'next'
import { cormorantGaramond, dmSans } from '@/lib/fonts'
import './globals.css'

/* Default metadata. The (marketing) layout re-declares this in full and the
   admin layout overrides it — it lives here too so the root-level 404 page
   keeps the exact head output it had before the route-group split. */
export const metadata: Metadata = {
  title: 'Brushly UK | Premium Painting & Decorating',
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
        {children}
      </body>
    </html>
  )
}
