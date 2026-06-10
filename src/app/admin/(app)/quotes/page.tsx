import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import FilterTabs from '@/components/admin/FilterTabs'
import StatusBadge, { QUOTE_STATUS } from '@/components/admin/StatusBadge'
import { requireUser } from '@/lib/admin/auth'
import {
  effectiveQuoteStatus,
  formatGBP,
  quoteRef,
  timeAgo,
} from '@/lib/admin/format'
import type { QuoteStatus } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Quotes',
}

const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'declined', 'expired']

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
  const { supabase } = await requireUser()

  const { data: rawQuotes, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, title, status, total_pence, created_at, valid_until, clients(name)'
    )
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`Couldn't load quotes: ${error.message}`)

  /* A sent quote past its valid-until shows as expired everywhere —
     computed at read time, mirroring the overdue-invoice pattern (§4). */
  const quotes = rawQuotes.map((q) => ({
    ...q,
    effective: effectiveQuoteStatus(q.status, q.valid_until),
  }))

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      {
        count: quotes.filter((q) => q.effective === s).length,
        total: quotes
          .filter((q) => q.effective === s)
          .reduce((sum, q) => sum + q.total_pence, 0),
      },
    ])
  )

  const tabs = [
    { value: 'all', label: 'All', count: quotes.length },
    ...STATUSES.map((s) => ({
      value: s,
      label: QUOTE_STATUS[s].label,
      count: byStatus[s].count,
    })),
  ]

  const visible =
    status === 'all' ? quotes : quotes.filter((q) => q.effective === status)
  const visibleTotal = visible.reduce((sum, q) => sum + q.total_pence, 0)

  return (
    <>
      <PageHeader title="Quotes" action={{ href: '/admin/quotes/new', label: '+ Quote' }} />
      <div className="px-4 py-4 md:px-8">
        <FilterTabs basePath="/admin/quotes" current={status} tabs={tabs} />

        {visible.length > 0 && (
          <p className="mt-3 font-body text-[13px] text-admin-muted">
            {visible.length} {visible.length === 1 ? 'quote' : 'quotes'}
            {' · '}
            <span className="tabular-nums text-brushly-cream/80">
              {formatGBP(visibleTotal)}
            </span>
          </p>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            message={
              status === 'all'
                ? 'No quotes yet — open a lead and tap “Turn into quote”, or start one here.'
                : `No ${QUOTE_STATUS[status]?.label.toLowerCase() ?? status} quotes right now.`
            }
            action={
              status === 'all'
                ? { href: '/admin/quotes/new', label: '+ New quote' }
                : undefined
            }
          />
        ) : (
          <ul className="mt-3 overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            {visible.map((q) => (
              <li key={q.id} className="border-b border-admin-hairline last:border-b-0">
                <Link
                  href={`/admin/quotes/${q.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-raised active:bg-admin-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[15px] font-medium text-brushly-cream">
                      {q.title}
                    </p>
                    <p className="mt-0.5 truncate font-body text-[13px] tabular-nums text-admin-muted">
                      {quoteRef(q.quote_number)} · {q.clients?.name ?? '—'} ·{' '}
                      {timeAgo(q.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-body text-[15px] font-semibold tabular-nums text-brushly-cream">
                      {formatGBP(q.total_pence)}
                    </span>
                    <StatusBadge map={QUOTE_STATUS} status={q.effective} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
