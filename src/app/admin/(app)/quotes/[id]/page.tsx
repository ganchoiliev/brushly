import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import StatusBadge, { QUOTE_STATUS } from '@/components/admin/StatusBadge'
import QuoteActions from '@/components/admin/quotes/QuoteActions'
import CreateInvoiceButton from '@/components/admin/quotes/CreateInvoiceButton'
import { requireUser } from '@/lib/admin/auth'
import {
  effectiveQuoteStatus,
  formatGBP,
  formatDate,
  quoteRef,
  invoiceRef,
  timeAgo,
} from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Quote',
}

const UNIT_LABEL: Record<string, string> = {
  job: 'job',
  day: 'day',
  room: 'room',
  m2: 'm²',
  item: 'item',
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(id, name, email, phone, address_line1, address_line2, town, postcode), quote_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (!quote) notFound()

  const { data: existingInvoice } =
    quote.status === 'accepted'
      ? await supabase
          .from('invoices')
          .select('id, invoice_number')
          .eq('quote_id', quote.id)
          .neq('status', 'void')
          .maybeSingle()
      : { data: null }

  const items = [...(quote.quote_items ?? [])].sort((a, b) => a.position - b.position)
  const effective = effectiveQuoteStatus(quote.status, quote.valid_until)
  const client = quote.clients
  const editable = quote.status === 'draft' || quote.status === 'sent'

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 md:px-8">
          <Link
            href="/admin/quotes"
            aria-label="Back to quotes"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate font-body text-[15px] font-medium tabular-nums text-brushly-cream/80">
            {quoteRef(quote.quote_number)}
          </h1>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {editable && (
              <Link
                href={`/admin/quotes/${quote.id}/edit`}
                aria-label="Edit quote"
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-white/10 text-brushly-cream/70 transition-colors hover:bg-admin-raised"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            )}
            <StatusBadge map={QUOTE_STATUS} status={effective} />
          </span>
        </div>
      </header>

      <div className="px-4 py-5 pb-28 md:px-8 md:pb-5">
        <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
          <div className="space-y-5">
            {/* Document-style header (§2.3): number set large in the
                display face, status beside it, client block below. */}
            <section className="rounded-sm border border-admin-hairline bg-admin-card p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <h2 className="font-display text-4xl font-light tabular-nums text-brushly-cream">
                  {quoteRef(quote.quote_number)}
                </h2>
                <StatusBadge map={QUOTE_STATUS} status={effective} />
              </div>
              <p className="mt-2 font-body text-[15px] font-medium text-brushly-cream">
                {quote.title}
              </p>
              <p className="mt-1 font-body text-[13px] text-admin-muted">
                Issued {formatDate(quote.issue_date)}
                {quote.valid_until && <> · valid until {formatDate(quote.valid_until)}</>}
                {quote.sent_at && <> · sent {timeAgo(quote.sent_at)}</>}
                {quote.decided_at && <> · decided {timeAgo(quote.decided_at)}</>}
              </p>
              {client && (
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="mt-4 block rounded-sm border border-admin-hairline bg-admin-canvas/40 p-3 transition-colors hover:bg-admin-raised"
                >
                  <p className="font-body text-[11px] uppercase tracking-wider text-admin-muted">
                    For
                  </p>
                  <p className="mt-0.5 font-body text-[14px] font-medium text-brushly-cream">
                    {client.name}
                  </p>
                  <p className="mt-0.5 font-body text-[13px] text-admin-muted">
                    {[client.address_line1, client.town, client.postcode]
                      .filter(Boolean)
                      .join(', ') || client.phone || client.email || ''}
                  </p>
                </Link>
              )}
            </section>

            {/* Actions: in flow on mobile, top-right column on desktop.
                For accepted quotes the invoice CTA also rides the mobile
                sticky bar below. */}
            <aside className="space-y-2 lg:hidden">
              {quote.status === 'accepted' && existingInvoice && (
                <ViewInvoiceLink invoice={existingInvoice} />
              )}
              {quote.status === 'accepted' && !existingInvoice && (
                <div className="hidden md:block">
                  <CreateInvoiceButton quoteId={quote.id} />
                </div>
              )}
              <QuoteActions
                quoteId={quote.id}
                status={quote.status}
                reference={quoteRef(quote.quote_number)}
                clientEmail={client?.email ?? null}
                clientName={client?.name ?? 'This client'}
              />
            </aside>
            {quote.status === 'accepted' && !existingInvoice && (
              <div className="fixed inset-x-0 bottom-16 z-30 border-t border-admin-hairline bg-admin-canvas/95 px-4 py-3 backdrop-blur-lg md:hidden">
                <CreateInvoiceButton quoteId={quote.id} />
              </div>
            )}

            <QuoteBody quote={quote} items={items} />
          </div>

          <aside className="hidden space-y-2 lg:sticky lg:top-20 lg:block">
            {quote.status === 'accepted' &&
              (existingInvoice ? (
                <ViewInvoiceLink invoice={existingInvoice} />
              ) : (
                <CreateInvoiceButton quoteId={quote.id} />
              ))}
            <QuoteActions
              quoteId={quote.id}
              status={quote.status}
              reference={quoteRef(quote.quote_number)}
              clientEmail={client?.email ?? null}
              clientName={client?.name ?? 'This client'}
            />
          </aside>
        </div>
      </div>
    </>
  )
}

function ViewInvoiceLink({
  invoice,
}: {
  invoice: { id: string; invoice_number: number }
}) {
  return (
    <Link
      href={`/admin/invoices/${invoice.id}`}
      className="flex h-14 items-center justify-center gap-2 rounded-sm border border-brushly-gold/50 font-body text-[15px] font-semibold text-brushly-gold transition-colors hover:bg-brushly-gold/10"
    >
      View invoice {invoiceRef(invoice.invoice_number)}
    </Link>
  )
}

function QuoteBody({
  quote,
  items,
}: {
  quote: {
    subtotal_pence: number
    vat_rate: number
    vat_pence: number
    total_pence: number
    notes: string | null
    terms: string | null
  }
  items: {
    id: string
    description: string
    qty: number
    unit: string
    unit_price_pence: number
    total_pence: number
  }[]
}) {
  return (
    <>
      <section className="overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-admin-hairline px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-body text-[14px] leading-snug text-brushly-cream">
                  {item.description}
                </p>
                <p className="mt-0.5 font-body text-[12px] tabular-nums text-admin-muted">
                  {item.qty} × {formatGBP(item.unit_price_pence)} / {UNIT_LABEL[item.unit] ?? item.unit}
                </p>
              </div>
              <span className="shrink-0 font-body text-[14px] font-medium tabular-nums text-brushly-cream">
                {formatGBP(item.total_pence)}
              </span>
            </div>
          ))}
          <div className="space-y-1 px-4 py-3 font-body text-[14px]">
            <div className="flex justify-between text-brushly-cream/70">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatGBP(quote.subtotal_pence)}</span>
            </div>
            {quote.vat_rate > 0 && (
              <div className="flex justify-between text-brushly-cream/70">
                <span>VAT {quote.vat_rate}%</span>
                <span className="tabular-nums">{formatGBP(quote.vat_pence)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-admin-hairline pt-2 text-[16px] font-semibold text-brushly-gold">
              <span>Total</span>
              <span className="tabular-nums">{formatGBP(quote.total_pence)}</span>
            </div>
          </div>
        </section>

      {quote.notes && (
        <section className="rounded-sm border border-admin-hairline bg-admin-card p-4">
          <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-brushly-cream">
            {quote.notes}
          </p>
        </section>
      )}
      {quote.terms && (
        <section className="rounded-sm border border-admin-hairline bg-admin-card p-4">
          <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            Terms
          </h2>
          <p className="mt-2 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-brushly-cream/80">
            {quote.terms}
          </p>
        </section>
      )}
    </>
  )
}
