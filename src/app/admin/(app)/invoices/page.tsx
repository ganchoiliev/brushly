import type { Metadata } from 'next'
import Link from 'next/link'
import { Receipt } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import FilterTabs from '@/components/admin/FilterTabs'
import StatusBadge, { INVOICE_STATUS } from '@/components/admin/StatusBadge'
import { requireUser } from '@/lib/admin/auth'
import {
  formatGBP,
  invoiceRef,
  timeAgo,
  effectiveInvoiceStatus,
} from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Invoices',
}

const STATUSES = ['draft', 'sent', 'overdue', 'paid', 'void']

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
  const { supabase } = await requireUser()

  const { data: rows, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, title, status, due_date, total_pence, created_at, clients(name)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`Couldn't load invoices: ${error.message}`)

  const invoices = rows.map((inv) => ({
    ...inv,
    effective: effectiveInvoiceStatus(inv.status, inv.due_date),
  }))

  const tabs = [
    { value: 'all', label: 'All', count: invoices.length },
    ...STATUSES.map((s) => ({
      value: s,
      label: INVOICE_STATUS[s].label,
      count: invoices.filter((i) => i.effective === s).length,
    })),
  ]

  const visible =
    status === 'all'
      ? invoices.filter((i) => i.effective !== 'void')
      : invoices.filter((i) => i.effective === status)
  const visibleTotal = visible.reduce((sum, i) => sum + i.total_pence, 0)

  return (
    <>
      <PageHeader
        title="Invoices"
        action={{ href: '/admin/invoices/new', label: '+ Invoice' }}
      />
      <div className="px-4 py-4 md:px-8">
        <FilterTabs basePath="/admin/invoices" current={status} tabs={tabs} />

        {visible.length > 0 && (
          <p className="mt-3 font-body text-[13px] text-admin-muted">
            {visible.length} {visible.length === 1 ? 'invoice' : 'invoices'}
            {' · '}
            <span className="tabular-nums text-brushly-cream/80">
              {formatGBP(visibleTotal)}
            </span>
          </p>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={Receipt}
            message={
              status === 'all'
                ? 'No invoices yet — accept a quote and tap “Create invoice”.'
                : `No ${INVOICE_STATUS[status]?.label.toLowerCase() ?? status} invoices right now.`
            }
          />
        ) : (
          <ul className="mt-3 overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            {visible.map((inv) => (
              <li key={inv.id} className="border-b border-admin-hairline last:border-b-0">
                <Link
                  href={`/admin/invoices/${inv.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[15px] font-medium text-brushly-cream">
                      {inv.title || invoiceRef(inv.invoice_number)}
                    </p>
                    <p className="mt-0.5 truncate font-body text-[13px] tabular-nums text-admin-muted">
                      {invoiceRef(inv.invoice_number)} · {inv.clients?.name ?? '—'} ·{' '}
                      {timeAgo(inv.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 font-body text-[15px] font-semibold tabular-nums text-brushly-cream">
                    {formatGBP(inv.total_pence)}
                  </span>
                  <StatusBadge map={INVOICE_STATUS} status={inv.effective} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
