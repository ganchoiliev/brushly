import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Sun, Phone, FileText, Receipt } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { requireUser } from '@/lib/admin/auth'
import {
  formatGBP,
  quoteRef,
  invoiceRef,
  timeAgo,
  todayLondon,
} from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Today',
}

/* Kept out of the component body so the linter's purity rule doesn't flag
   the unavoidable clock read — this is a request-time server component. */
function timeBounds() {
  const now = Date.now()
  const today = todayLondon()
  return {
    dayAgo: new Date(now - 24 * 3600 * 1000).toISOString(),
    weekAgo: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    today,
    monthStart: `${today.slice(0, 7)}-01`,
  }
}

export default async function DashboardPage() {
  const { supabase } = await requireUser()

  const { dayAgo, weekAgo, today, monthStart } = timeBounds()

  const [
    staleLeads,
    staleQuotes,
    overdueInvoices,
    newLeads7d,
    openQuotes,
    acceptedMonth,
    unpaidInvoices,
    recentLeads,
    recentQuotes,
    recentInvoices,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, created_at')
      .eq('status', 'new')
      .lt('created_at', dayAgo)
      .order('created_at')
      .limit(20),
    supabase
      .from('quotes')
      .select('id, quote_number, title, total_pence, sent_at')
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
  }[] = [
    ...(overdueInvoices.data ?? []).map((inv) => ({
      href: `/admin/invoices/${inv.id}`,
      icon: <Receipt className="h-4 w-4 text-status-red" />,
      text: `${invoiceRef(inv.invoice_number)} is overdue — ${formatGBP(inv.total_pence)}`,
      sub: `was due ${timeAgo(`${inv.due_date}T12:00:00Z`)}`,
    })),
    ...(staleLeads.data ?? []).map((lead) => ({
      href: `/admin/leads/${lead.id}`,
      icon: <Phone className="h-4 w-4 text-status-amber" />,
      text: `${lead.name} hasn't been contacted`,
      sub: `came in ${timeAgo(lead.created_at)}`,
    })),
    ...(staleQuotes.data ?? []).map((q) => ({
      href: `/admin/quotes/${q.id}`,
      icon: <FileText className="h-4 w-4 text-status-amber" />,
      text: `${quoteRef(q.quote_number)} has no answer — worth a call?`,
      sub: `sent ${timeAgo(q.sent_at!)} · ${formatGBP(q.total_pence)}`,
    })),
  ]

  const acceptedTotal = (acceptedMonth.data ?? []).reduce((s, q) => s + q.total_pence, 0)
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
      <div className="space-y-6 px-4 py-5 md:max-w-3xl md:px-8">
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
                <li key={i} className="border-b border-admin-hairline last:border-b-0">
                  <Link
                    href={item.href}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-admin-raised"
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate font-body text-[14px] text-brushly-cream">
                        {item.text}
                      </p>
                      <p className="font-body text-[12px] text-admin-muted">{item.sub}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            title="New leads"
            subtitle="last 7 days"
            value={String(newLeads7d.count ?? 0)}
            href="/admin/leads?status=new"
          />
          <Stat
            title="Open quotes"
            subtitle="awaiting answer"
            value={`${(openQuotes.data ?? []).length}`}
            href="/admin/quotes?status=sent"
          />
          <Stat
            title="Booked this month"
            subtitle="accepted quotes"
            value={formatGBP(acceptedTotal)}
            gold
            href="/admin/quotes?status=accepted"
          />
          <Stat
            title="Unpaid invoices"
            subtitle={`${formatGBP(unpaidTotal)} outstanding`}
            value={`${(unpaidInvoices.data ?? []).length}`}
            href="/admin/invoices?status=sent"
          />
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
    </>
  )
}

function Stat({
  title,
  subtitle,
  value,
  gold,
  href,
}: {
  title: string
  subtitle: string
  value: string
  gold?: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-sm border border-admin-hairline bg-admin-card p-4 transition-colors hover:bg-admin-raised"
    >
      <p className="font-body text-[11px] uppercase tracking-wider text-admin-muted">
        {title}
      </p>
      <p className="font-body text-[12px] tabular-nums text-admin-muted">
        {subtitle}
      </p>
      <p
        className={`mt-1 font-body text-xl font-semibold tabular-nums ${
          gold ? 'text-brushly-gold' : 'text-brushly-cream'
        }`}
      >
        {value}
      </p>
    </Link>
  )
}
