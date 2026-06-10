import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Sun, Phone, FileText, Receipt } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import StatCard from '@/components/admin/dashboard/StatCard'
import { requireUser } from '@/lib/admin/auth'
import {
  formatGBP,
  quoteRef,
  invoiceRef,
  timeAgo,
  todayLondon,
} from '@/lib/admin/format'
import { telHref } from '@/lib/admin/phone'

export const metadata: Metadata = {
  title: 'Today',
}

/* Kept out of the component body so the linter's purity rule doesn't flag
   the unavoidable clock read — this is a request-time server component. */
function timeBounds() {
  const now = Date.now()
  const today = todayLondon()
  const monthStart = `${today.slice(0, 7)}-01`
  const lastMonth = new Date(`${monthStart}T12:00:00Z`)
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1)
  return {
    dayAgo: new Date(now - 24 * 3600 * 1000).toISOString(),
    weekAgo: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    twoWeeksAgo: new Date(now - 14 * 24 * 3600 * 1000).toISOString(),
    today,
    monthStart,
    lastMonthStart: lastMonth.toISOString().slice(0, 10),
  }
}

export default async function DashboardPage() {
  const { supabase } = await requireUser()

  const { dayAgo, weekAgo, twoWeeksAgo, today, monthStart, lastMonthStart } =
    timeBounds()

  const [
    staleLeads,
    staleQuotes,
    overdueInvoices,
    newLeads7d,
    openQuotes,
    acceptedMonth,
    unpaidInvoices,
    newLeadsPrior7d,
    openQuotesLastWeek,
    acceptedLastMonth,
    unpaidLastWeek,
    recentLeads,
    recentQuotes,
    recentInvoices,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, phone, created_at')
      .eq('status', 'new')
      .lt('created_at', dayAgo)
      .order('created_at')
      .limit(20),
    supabase
      .from('quotes')
      .select('id, quote_number, title, total_pence, sent_at, clients(phone)')
      .eq('status', 'sent')
      .lt('sent_at', weekAgo)
      .order('sent_at')
      .limit(20),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, total_pence, due_date')
      .eq('status', 'sent')
      .lt('due_date', today)
      .order('due_date')
      .limit(20),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .neq('status', 'spam'),
    supabase
      .from('quotes')
      .select('id')
      .in('status', ['draft', 'sent']),
    supabase
      .from('quotes')
      .select('total_pence')
      .eq('status', 'accepted')
      .gte('decided_at', `${monthStart}T00:00:00Z`),
    supabase.from('invoices').select('total_pence').eq('status', 'sent'),
    /* Prior periods for the trend deltas (§2.2). The two stock metrics
       (open quotes, unpaid invoices) reconstruct last week's snapshot from
       timestamps: open = created but not yet decided at that moment;
       unpaid = sent but not yet paid. */
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', weekAgo)
      .neq('status', 'spam'),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .lte('created_at', weekAgo)
      .or(`decided_at.is.null,decided_at.gt.${weekAgo}`),
    supabase
      .from('quotes')
      .select('total_pence')
      .eq('status', 'accepted')
      .gte('decided_at', `${lastMonthStart}T00:00:00Z`)
      .lt('decided_at', `${monthStart}T00:00:00Z`),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .lte('sent_at', weekAgo)
      .neq('status', 'void')
      .or(`paid_at.is.null,paid_at.gt.${weekAgo}`),
    supabase
      .from('leads')
      .select('id, name, status, created_at, status_changed_at')
      .order('status_changed_at', { ascending: false })
      .limit(10),
    supabase
      .from('quotes')
      .select('id, quote_number, title, status, created_at, sent_at, decided_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, created_at, paid_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const needsAttention: {
    href: string
    icon: React.ReactNode
    text: string
    sub: string
    /* When the right move is a call, the row carries a tap-to-call button. */
    phone: string | null
  }[] = [
    ...(overdueInvoices.data ?? []).map((inv) => ({
      href: `/admin/invoices/${inv.id}`,
      icon: <Receipt className="h-4 w-4 text-status-red" />,
      text: `${invoiceRef(inv.invoice_number)} is overdue — ${formatGBP(inv.total_pence)}`,
      sub: `was due ${timeAgo(`${inv.due_date}T12:00:00Z`)}`,
      phone: null,
    })),
    ...(staleLeads.data ?? []).map((lead) => ({
      href: `/admin/leads/${lead.id}`,
      icon: <Phone className="h-4 w-4 text-status-amber" />,
      text: `${lead.name} hasn't been contacted`,
      sub: `came in ${timeAgo(lead.created_at)}`,
      phone: lead.phone,
    })),
    ...(staleQuotes.data ?? []).map((q) => ({
      href: `/admin/quotes/${q.id}`,
      icon: <FileText className="h-4 w-4 text-status-amber" />,
      text: `${quoteRef(q.quote_number)} has no answer — worth a call?`,
      sub: `sent ${timeAgo(q.sent_at!)} · ${formatGBP(q.total_pence)}`,
      phone: q.clients?.phone ?? null,
    })),
  ]

  const acceptedTotal = (acceptedMonth.data ?? []).reduce((s, q) => s + q.total_pence, 0)
  const lastMonthTotal = (acceptedLastMonth.data ?? []).reduce((s, q) => s + q.total_pence, 0)
  const unpaidTotal = (unpaidInvoices.data ?? []).reduce((s, i) => s + i.total_pence, 0)

  const activity = [
    ...(recentLeads.data ?? []).map((lead) => ({
      ts: lead.status_changed_at > lead.created_at ? lead.status_changed_at : lead.created_at,
      href: `/admin/leads/${lead.id}`,
      icon: <Phone className="h-4 w-4 text-admin-muted" />,
      text:
        lead.status === 'new'
          ? `New lead — ${lead.name}`
          : `${lead.name} → ${lead.status}`,
    })),
    ...(recentQuotes.data ?? []).map((q) => {
      const ts = q.decided_at ?? q.sent_at ?? q.created_at
      const verb =
        q.status === 'draft' ? 'drafted' : q.status === 'sent' ? 'sent' : q.status
      return {
        ts,
        href: `/admin/quotes/${q.id}`,
        icon: <FileText className="h-4 w-4 text-admin-muted" />,
        text: `${quoteRef(q.quote_number)} ${verb} — ${q.title}`,
      }
    }),
    ...(recentInvoices.data ?? []).map((inv) => ({
      ts: inv.paid_at ?? inv.created_at,
      href: `/admin/invoices/${inv.id}`,
      icon: <Receipt className="h-4 w-4 text-admin-muted" />,
      text: `${invoiceRef(inv.invoice_number)} ${inv.status === 'paid' ? 'paid' : inv.status}${inv.title ? ` — ${inv.title}` : ''}`,
    })),
  ]
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 10)

  return (
    <>
      <PageHeader title="Today" />
      {/* Desktop ≥1024px: left 2/3 = act (Add lead, Needs attention,
          activity), right 1/3 = the 2×2 stat grid. Mobile: compact stats
          first so the 2×2 grid sits above the fold at 390px, then Add lead
          with Needs attention immediately under it. */}
      <div className="px-4 py-5 md:px-8">
        <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
          <section className="grid grid-cols-2 gap-3 lg:sticky lg:top-20 lg:order-2">
            <StatCard
              title="New leads"
              subtitle="last 7 days"
              icon="phone"
              kind="count"
              value={newLeads7d.count ?? 0}
              prior={newLeadsPrior7d.count ?? 0}
              deltaLabel="vs last week"
              href="/admin/leads?status=new"
            />
            <StatCard
              title="Open quotes"
              subtitle="awaiting answer"
              icon="quote"
              kind="count"
              value={(openQuotes.data ?? []).length}
              prior={openQuotesLastWeek.count ?? 0}
              deltaLabel="vs last week"
              href="/admin/quotes?status=sent"
            />
            <StatCard
              title="Booked this month"
              subtitle="accepted quotes"
              icon="trophy"
              kind="money"
              value={acceptedTotal}
              prior={lastMonthTotal}
              deltaLabel="vs last month"
              gold
              href="/admin/quotes?status=accepted"
            />
            <StatCard
              title="Unpaid invoices"
              subtitle={`${formatGBP(unpaidTotal)} outstanding`}
              icon="invoice"
              kind="count"
              value={(unpaidInvoices.data ?? []).length}
              prior={unpaidLastWeek.count ?? 0}
              deltaLabel="vs last week"
              href="/admin/invoices?status=sent"
            />
          </section>

          <div className="mt-6 space-y-6 lg:order-1 lg:col-span-2 lg:mt-0">
            <Link
              href="/admin/leads/new"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light md:max-w-sm"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              Add lead
            </Link>

            <section>
              <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
                Needs attention
              </h2>
              {needsAttention.length === 0 ? (
                <div className="flex items-center gap-3 rounded-sm border border-admin-hairline bg-admin-card px-4 py-5">
                  <Sun className="h-5 w-5 shrink-0 text-brushly-gold" />
                  <p className="font-body text-[14px] text-brushly-cream/80">
                    All caught up — nothing waiting on you.
                  </p>
                </div>
              ) : (
                <ul className="overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
                  {needsAttention.slice(0, 8).map((item, i) => (
                    <li
                      key={i}
                      className="flex items-stretch border-b border-admin-hairline last:border-b-0"
                    >
                      <Link
                        href={item.href}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-admin-raised"
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate font-body text-[14px] text-brushly-cream">
                            {item.text}
                          </p>
                          <p className="font-body text-[12px] text-admin-muted">
                            {item.sub}
                          </p>
                        </div>
                      </Link>
                      {item.phone && (
                        <a
                          href={telHref(item.phone)}
                          aria-label={`Call about: ${item.text}`}
                          className="flex w-14 shrink-0 items-center justify-center border-l border-admin-hairline text-brushly-gold transition-colors hover:bg-admin-raised"
                        >
                          <Phone className="h-[18px] w-[18px]" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {activity.length > 0 && (
              <section>
                <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
                  Recent activity
                </h2>
                <ul className="overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
                  {activity.map((item, i) => (
                    <li key={i} className="border-b border-admin-hairline last:border-b-0">
                      <Link
                        href={item.href}
                        className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-admin-raised"
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <p className="min-w-0 flex-1 truncate font-body text-[13px] text-brushly-cream/90">
                          {item.text}
                        </p>
                        <span className="shrink-0 font-body text-[12px] tabular-nums text-admin-muted">
                          {timeAgo(item.ts)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
