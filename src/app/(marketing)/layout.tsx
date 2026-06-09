import type { Metadata } from 'next'
import MarketingChrome from '@/components/layout/MarketingChrome'

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

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <MarketingChrome>{children}</MarketingChrome>
}
