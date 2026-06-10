import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, Receipt } from 'lucide-react'
import ContactActions from '@/components/admin/ContactActions'
import ClientEditCard from '@/components/admin/clients/ClientEditCard'
import StatusBadge, { QUOTE_STATUS, INVOICE_STATUS } from '@/components/admin/StatusBadge'
import { requireUser } from '@/lib/admin/auth'
import { formatGBP, quoteRef, invoiceRef } from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Client',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const [{ data: client }, { data: quotes }, { data: invoices }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('quotes')
        .select('id, quote_number, title, status, total_pence')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, title, status, total_pence')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ])
  if (!client) notFound()

  const lifetime = (invoices ?? [])
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total_pence, 0)
  const outstanding = (invoices ?? [])
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total_pence, 0)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 md:px-8">
          <Link
            href="/admin/clients"
            aria-label="Back to clients"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate font-display text-2xl font-light">
            {client.name}
          </h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 md:max-w-2xl md:px-8">
        <ContactActions phone={client.phone} email={client.email} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-admin-hairline bg-admin-card p-4">
            <p className="font-body text-[12px] uppercase tracking-wider text-admin-muted">
              Paid so far
            </p>
            <p className="mt-1 font-body text-xl font-semibold tabular-nums text-brushly-gold">
              {formatGBP(lifetime)}
            </p>
          </div>
          <div className="rounded-sm border border-admin-hairline bg-admin-card p-4">
            <p className="font-body text-[12px] uppercase tracking-wider text-admin-muted">
              Waiting on
            </p>
            <p className="mt-1 font-body text-xl font-semibold tabular-nums text-brushly-cream">
              {formatGBP(outstanding)}
            </p>
          </div>
        </div>

        <ClientEditCard client={client} />

        <Link
          href={`/admin/quotes/new?client=${client.id}`}
          className="flex h-14 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          <FileText className="h-5 w-5" />
          New quote for {client.name.split(' ')[0]}
        </Link>

        {(quotes ?? []).length > 0 && (
          <section className="overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            <h2 className="border-b border-admin-hairline px-4 py-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Quotes
            </h2>
            {quotes!.map((q) => (
              <Link
                key={q.id}
                href={`/admin/quotes/${q.id}`}
                className="flex min-h-14 items-center gap-3 border-b border-admin-hairline px-4 py-2 font-body text-[14px] last:border-b-0 hover:bg-admin-raised"
              >
                <FileText className="h-4 w-4 shrink-0 text-admin-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-brushly-cream">{q.title}</p>
                  <p className="text-[12px] tabular-nums text-admin-muted">
                    {quoteRef(q.quote_number)} · {formatGBP(q.total_pence)}
                  </p>
                </div>
                <StatusBadge map={QUOTE_STATUS} status={q.status} />
              </Link>
            ))}
          </section>
        )}

        {(invoices ?? []).length > 0 && (
          <section className="overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            <h2 className="border-b border-admin-hairline px-4 py-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Invoices
            </h2>
            {invoices!.map((inv) => (
              <Link
                key={inv.id}
                href={`/admin/invoices/${inv.id}`}
                className="flex min-h-14 items-center gap-3 border-b border-admin-hairline px-4 py-2 font-body text-[14px] last:border-b-0 hover:bg-admin-raised"
              >
                <Receipt className="h-4 w-4 shrink-0 text-admin-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-brushly-cream">
                    {inv.title || invoiceRef(inv.invoice_number)}
                  </p>
                  <p className="text-[12px] tabular-nums text-admin-muted">
                    {invoiceRef(inv.invoice_number)} · {formatGBP(inv.total_pence)}
                  </p>
                </div>
                <StatusBadge map={INVOICE_STATUS} status={inv.status} />
              </Link>
            ))}
          </section>
        )}
      </div>
    </>
  )
}
