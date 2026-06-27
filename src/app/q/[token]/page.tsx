import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentPreview from '@/components/admin/quotes/DocumentPreview'
import { quoteRef } from '@/lib/admin/format'
import { clientAddressLines, type PdfInput } from '@/lib/admin/pdf/constants'
import AcceptQuote from './AcceptQuote'

/* A token page is per-recipient and changes when they accept — never cache. */
export const dynamic = 'force-dynamic'

/* Keep these out of search indexes — the link is meant to be private. */
export const metadata: Metadata = {
  title: 'Your Brushly quote',
  robots: { index: false, follow: false },
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: 'Awaiting your decision', className: 'border-brushly-gold/40 text-brushly-gold' },
  sent: { text: 'Awaiting your decision', className: 'border-brushly-gold/40 text-brushly-gold' },
  accepted: { text: 'Accepted', className: 'border-status-green/40 text-status-green' },
  declined: { text: 'Declined', className: 'border-status-red/40 text-status-red' },
  expired: { text: 'Expired', className: 'border-white/15 text-admin-muted' },
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token })
  if (error || !data) notFound()

  const { quote: q, items, client, company } = data
  const ref = quoteRef(q.quote_number)

  const input: PdfInput = {
    docType: 'QUOTE',
    reference: ref,
    /* Never stamp DRAFT on a client-facing copy — the link is the send. */
    draft: false,
    title: q.title,
    issueDate: q.issue_date,
    secondaryDate: q.valid_until ? { label: 'Valid until', value: q.valid_until } : null,
    company: {
      name: company.company_name,
      companyNumber: company.company_number,
      address: company.address,
      phone: company.phone,
      email: company.email,
      vatNumber: company.vat_registered ? company.vat_number : null,
    },
    client: {
      name: client.name,
      addressLines: clientAddressLines({ ...client, address_line2: client.address_line2 }),
      email: null,
      phone: null,
    },
    items: items.map((it) => ({
      description: it.description,
      note: it.note,
      qty: Number(it.qty),
      unit: it.unit,
      unitPricePence: it.unit_price_pence,
      totalPence: it.total_pence,
    })),
    subtotalPence: q.subtotal_pence,
    vatRate: Number(q.vat_rate),
    vatPence: q.vat_pence,
    totalPence: q.total_pence,
    notes: q.notes,
    terms: q.terms ?? company.default_terms,
    payment: null,
  }

  const status = STATUS_LABEL[q.status] ?? STATUS_LABEL.sent
  const acceptable = q.status === 'draft' || q.status === 'sent'

  return (
    /* admin-cursor: this page mounts no CustomCursor, so it must re-assert
       the native cursor that globals.css hides on pointer-fine devices. */
    <main className="admin-cursor min-h-screen bg-admin-canvas px-4 py-8 md:py-12">
      <div className="mx-auto max-w-[640px] space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-body text-[13px] text-admin-muted">
            Quote <span className="tabular-nums text-brushly-cream/80">{ref}</span> from {company.company_name}
          </p>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 font-body text-[12px] font-medium ${status.className}`}
          >
            {status.text}
          </span>
        </div>

        <DocumentPreview chromeless input={input} pdfHref={null} />

        {acceptable && <AcceptQuote token={q.public_token} reference={ref} />}

        {q.status === 'accepted' && (
          <div className="rounded-sm border border-status-green/40 bg-status-green/10 px-4 py-4">
            <p className="font-body text-[14px] text-brushly-cream">
              You&apos;ve accepted this quote — thank you. We&apos;ll be in touch shortly to book you in.
            </p>
          </div>
        )}

        <footer className="pt-2 text-center font-body text-[12px] text-admin-muted">
          {company.company_name} · {company.phone} · {company.email}
        </footer>
      </div>
    </main>
  )
}
