import type { Metadata } from 'next'
import QuoteLanding from './QuoteLanding'

/* Paid-search landing page (Google Ads final URL from 2026-08-30).
   Design contract: no intro loader (PageLoader skips every non-home route),
   no pinned/scroll-driven sections, call + WhatsApp + a three-field form in
   the first viewport on a phone, and only claims we can document. */

export const metadata: Metadata = {
  title: 'Free Fixed-Price Painting & Decorating Quote — Reigate, Epsom & Surrey',
  description:
    'Owner-led painter and decorator covering Reigate, Redhill, Epsom and Surrey. Free site visit, itemised fixed-price quote in writing, £2m public liability cover. Call 01737 479 161.',
  alternates: { canonical: '/quote' },
}

export default function QuotePage() {
  return <QuoteLanding />
}
