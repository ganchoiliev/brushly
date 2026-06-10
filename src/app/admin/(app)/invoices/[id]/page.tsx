import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import StatusBadge, { INVOICE_STATUS } from '@/components/admin/StatusBadge'
import InvoiceActions from '@/components/admin/invoices/InvoiceActions'
import { requireUser } from '@/lib/admin/auth'
import {
  formatGBP,
  formatDate,
  invoiceRef,
  quoteRef,
  timeAgo,
  effectiveInvoiceStatus,
} from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Invoice',
}

const UNIT_LABEL: Record<string, string> = {
  job: 'job',
  day: 'day',
  room: 'room',
  m2: 'm²',
  item: 'item',
}

const PAYMENT_LABEL: Record<string, string> = {
  bank_transfer: 'bank transfer',
  cash: 'cash',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      '*, clients(id, name, email, phone, address_line1, address_line2, town, postcode), invoice_items(*), quotes(id, quote_number)'
    )
    .eq('id', id)
    .maybeSingle()
  if (!invoice) notFound()

  const items = [...(invoice.invoice_items ?? [])].sort(
    (a, b) => a.position - b.position
  )
  const client = invoice.clients
  const effective = effectiveInvoiceStatus(invoice.status, invoice.due_date)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 md:px-8">
          <Link
            href="/admin/invoices"
            aria-label="Back to invoices"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate font-display text-2xl font-light tabular-nums">
            {invoiceRef(invoice.invoice_number)}
          </h1>
          <span className="ml-auto shrink-0">
            <StatusBadge map={INVOICE_STATUS} status={effective} />
          </span>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 md:max-w-2xl md:px-8">
        <div>
          {invoice.title && (
            <h2 className="font-display text-xl font-light text-brushly-cream">
              {invoice.title}
            </h2>
          )}
          <p className="mt-1 font-body text-[13px] text-admin-muted">
            Issued {formatDate(invoice.issue_date)}
            {invoice.due_date && <> · due {formatDate(invoice.due_date)}</>}
            {invoice.paid_at && (
              <>
                {' '}
                · paid {timeAgo(invoice.paid_at)}
                {invoice.payment_method && (
                  <> by {PAYMENT_LABEL[invoice.payment_method]}</>
                )}
              </>
            )}
          </p>
          {invoice.quotes && (
            <Link
              href={`/admin/quotes/${invoice.quotes.id}`}
              className="mt-1 inline-flex items-center gap-1 font-body text-[13px] text-brushly-gold"
            >
              <FileText className="h-3.5 w-3.5" />
              From quote {quoteRef(invoice.quotes.quote_number)}
            </Link>
          )}
        </div>

        <InvoiceActions
          invoiceId={invoice.id}
          status={effective}
          reference={invoiceRef(invoice.invoice_number)}
          clientEmail={client?.email ?? null}
          clientName={client?.name ?? 'This client'}
        />

        {client && (
          <Link
            href={`/admin/clients/${client.id}`}
            className="block rounded-sm border border-admin-hairline bg-admin-card p-4 transition-colors hover:bg-admin-raised"
          >
            <p className="font-body text-[12px] uppercase tracking-wider text-admin-muted">
              Billed to
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
                  {item.qty} × {formatGBP(item.unit_price_pence)} /{' '}
                  {UNIT_LABEL[item.unit] ?? item.unit}
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
              <span className="tabular-nums">{formatGBP(invoice.subtotal_pence)}</span>
            </div>
            {invoice.vat_rate > 0 && (
              <div className="flex justify-between text-brushly-cream/70">
                <span>VAT {invoice.vat_rate}%</span>
                <span className="tabular-nums">{formatGBP(invoice.vat_pence)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-admin-hairline pt-2 text-[16px] font-semibold text-brushly-gold">
              <span>Total</span>
              <span className="tabular-nums">{formatGBP(invoice.total_pence)}</span>
            </div>
          </div>
        </section>

        {invoice.notes && (
          <section className="rounded-sm border border-admin-hairline bg-admin-card p-4">
            <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Notes
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-body text-[14px] leading-relaxed text-brushly-cream">
              {invoice.notes}
            </p>
          </section>
        )}
      </div>
    </>
  )
}
