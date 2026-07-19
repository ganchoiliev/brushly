import type { Metadata, Viewport } from 'next'
import { cormorantGaramond, dmSans } from '@/lib/fonts'
import './globals.css'

/* Default metadata. The (marketing) layout re-declares this in full and the
   admin layout overrides it — it lives here too so the root-level 404 page
   keeps sane head output. metadataBase makes OG/canonical URLs absolute. */
export const metadata: Metadata = {
  metadataBase: new URL('https://brushly.uk'),
  title: 'Brushly — Premium Painter & Decorator in Reigate & Surrey',
  description:
    'Premium painting and decorating across Reigate, Redhill, Epsom and Surrey. Interior & exterior painting, wallpapering and specialist finishes — flawless results for homes that demand more than a coat of paint.',
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
