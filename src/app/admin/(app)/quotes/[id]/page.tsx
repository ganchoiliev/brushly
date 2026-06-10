import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import StatusBadge, { QUOTE_STATUS } from '@/components/admin/StatusBadge'
import { requireUser } from '@/lib/admin/auth'
import { formatGBP, formatDate, quoteRef } from '@/lib/admin/format'

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

  const items = [...(quote.quote_items ?? [])].sort((a, b) => a.position - b.position)
  const client = quote.clients
  const editable = quote.status === 'draft' || quote.status === 'sent'

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/8 bg-brushly-charcoal/95 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 md:px-8">
          <Link
            href="/admin/quotes"
            aria-label="Back to quotes"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate font-display text-2xl font-light tabular-nums">
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
            <StatusBadge map={QUOTE_STATUS} status={quote.status} />
          </span>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 md:max-w-2xl md:px-8">
        <div>
          <h2 className="font-display text-xl font-light text-brushly-cream">
            {quote.title}
          </h2>
          <p className="mt-1 font-body text-[13px] text-admin-muted">
            Issued {formatDate(quote.issue_date)}
            {quote.valid_until && <> · valid until {formatDate(quote.valid_until)}</>}
          </p>
        </div>

        {client && (
          <Link
            href={`/admin/clients/${client.id}`}
            className="block rounded-sm border border-white/8 bg-admin-card p-4 transition-colors hover:bg-admin-raised"
          >
            <p className="font-body text-[12px] uppercase tracking-wider text-admin-muted">
              For
            </p>
            <p className="mt-1 font-body text-[15px] font-medium text-brushly-cream">
              {client.name}
            </p>
            <p className="mt-0.5 font-body text-[13px] text-admin-muted">
              {[client.address_line1, client.town, client.postcode]
                .filter(Boolean)
                .join(', ') || client.phone || client.email || ''}
            </p>
          </Link>
        )}

        <section className="overflow-hidden rounded-sm border border-white/8 bg-admin-card">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3 last:border-b-0"
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
            <div className="flex justify-between border-t border-white/8 pt-2 text-[16px] font-semibold text-brushly-gold">
              <span>Total</span>
              <span className="tabular-nums">{formatGBP(quote.total_pence)}</span>
            </div>
          </div>
        </section>

        {quote.notes && (
          <section className="rounded-sm border border-white/8 bg-admin-card p-4">
            <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Notes
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-brushly-cream">
              {quote.notes}
            </p>
          </section>
        )}
        {quote.terms && (
          <section className="rounded-sm border border-white/8 bg-admin-card p-4">
            <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Terms
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-brushly-cream/80">
              {quote.terms}
            </p>
          </section>
        )}
      </div>
    </>
  )
}
