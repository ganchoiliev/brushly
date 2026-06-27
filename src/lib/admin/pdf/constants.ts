import { formatGBP, formatSortCode } from '@/lib/admin/format'

/* Single source of truth for the printed document's look and language.
   BrushlyDocument (react-pdf) AND the builder's live HTML preview both
   import from here — if the preview could define its own constants it
   could lie about the PDF, so it isn't allowed to (v1.2 §3). This file
   must stay importable from client components: no node APIs, no
   react-pdf, no server-only. */

export const PDF_COLORS = {
  gold: '#C8A96E',
  charcoal: '#151515',
  cream: '#F5F0EB',
  ink: '#1A1A1A',
  muted: '#6B6B66',
  rule: '#E5E0D8',
  card: '#FAF8F4',
  bandDate: '#A8A299',
} as const

/* A4 geometry in pt (react-pdf) — the HTML preview renders 1px = 1pt
   and scales the whole page down to fit its pane. */
export const PAGE = {
  width: 595.28,
  height: 841.89,
  bandH: 96,
  padX: 48,
  padTop: 24,
  padBottom: 136,
} as const

/* Items table column widths (pt). Description takes the rest. */
export const COLS = {
  qty: 36,
  unit: 44,
  price: 76,
  total: 84,
  descPadRight: 16,
} as const

export const TOTALS_CARD_W = 248

export const UNIT_LABEL: Record<string, string> = {
  job: 'job',
  day: 'day',
  room: 'room',
  m2: 'm²',
  item: 'item',
}

/* The PDF's money formatter IS the app's money formatter. */
export const money = formatGBP

export const dateGB = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
      })
    : ''

/* "2" not "2.00"; "1.5" stays "1.5" (§3.1). */
export const qtyLabel = (qty: number) => String(qty)

/* "204455" → "20-44-55"; passes through anything already formatted. */
export const sortCode = (raw: string | null) => {
  if (!raw) return '—'
  return formatSortCode(raw)
}

export const dash = (value: string | null | undefined) =>
  value && value.trim() !== '' ? value : '—'

export function clientAddressLines(client: {
  address_line1: string | null
  address_line2: string | null
  town: string | null
  postcode: string | null
}): string[] {
  return [
    client.address_line1,
    client.address_line2,
    [client.town, client.postcode].filter(Boolean).join(' '),
  ].filter((line): line is string => !!line && line.trim() !== '')
}

export type PdfInput = {
  docType: 'QUOTE' | 'INVOICE'
  reference: string
  /* Drafts carry a diagonal watermark; sent/accepted/paid render clean. */
  draft: boolean
  title: string | null
  issueDate: string | null
  secondaryDate: { label: string; value: string } | null // valid until / due date
  company: {
    name: string
    companyNumber: string
    address: string
    phone: string
    email: string
    vatNumber: string | null
  }
  client: {
    name: string
    addressLines: string[]
    email: string | null
    phone: string | null
  }
  items: {
    description: string
    /* Optional per-line detail (paint, colour, scope) printed under the
       description; never affects pricing. */
    note: string | null
    qty: number
    unit: string
    unitPricePence: number
    totalPence: number
  }[]
  subtotalPence: number
  vatRate: number
  vatPence: number
  totalPence: number
  notes: string | null
  terms: string | null
  payment: { bankName: string | null; sortCode: string | null; accountNo: string | null } | null
}
