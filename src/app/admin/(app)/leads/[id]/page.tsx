import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import StatusBadge, { LEAD_STATUS } from '@/components/admin/StatusBadge'
import ContactActions from '@/components/admin/ContactActions'
import OutcomeButtons from '@/components/admin/leads/OutcomeButtons'
import LeadStatusButtons from '@/components/admin/leads/LeadStatusButtons'
import LeadNotes from '@/components/admin/leads/LeadNotes'
import LeadDetailsForm from '@/components/admin/leads/LeadDetailsForm'
import { requireUser } from '@/lib/admin/auth'
import { formatDate, timeAgo } from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Lead',
}

const SOURCE_LABEL: Record<string, string> = {
  website: 'from the website',
  ads: 'from Google Ads',
  referral: 'a referral',
  phone: 'from a phone call',
  manual: 'added by hand',
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const [{ data: lead }, { data: quotes }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('quotes')
      .select('id, quote_number, title, status, total_pence')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])
  if (!lead) notFound()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 md:px-8">
          <Link
            href="/admin/leads"
            aria-label="Back to leads"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate font-display text-2xl font-light">
            {lead.name}
          </h1>
          <span className="ml-auto shrink-0">
            <StatusBadge map={LEAD_STATUS} status={lead.status} />
          </span>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 md:max-w-2xl md:px-8">
        <p className="font-body text-[13px] text-admin-muted">
          Came in {timeAgo(lead.created_at)} — {SOURCE_LABEL[lead.source] ?? lead.source}
        </p>

        <ContactActions phone={lead.phone} email={lead.email} />

        {!['won', 'lost', 'spam'].includes(lead.status) && (
          <OutcomeButtons leadId={lead.id} followUpAt={lead.follow_up_at} />
        )}

        <LeadDetailsForm lead={lead} />

        {lead.message && (
          <section className="rounded-sm border border-admin-hairline bg-admin-card p-4">
            <h2 className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Their message
            </h2>
            <p className="mt-2 whitespace-pre-wrap font-body text-[15px] leading-relaxed text-brushly-cream">
              {lead.message}
            </p>
          </section>
        )}

        {quotes && quotes.length > 0 && (
          <section className="rounded-sm border border-admin-hairline bg-admin-card">
            <h2 className="border-b border-admin-hairline px-4 py-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
              Quotes for this lead
            </h2>
            {quotes.map((q) => (
              <Link
                key={q.id}
                href={`/admin/quotes/${q.id}`}
                className="flex h-14 items-center gap-3 border-b border-admin-hairline px-4 font-body text-[14px] last:border-b-0 hover:bg-admin-raised"
              >
                <FileText className="h-4 w-4 shrink-0 text-admin-muted" />
                <span className="truncate text-brushly-cream">{q.title}</span>
              </Link>
            ))}
          </section>
        )}

        <Link
          href={`/admin/quotes/new?lead=${lead.id}`}
          className="flex h-14 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          <FileText className="h-5 w-5" />
          Turn into quote
        </Link>

        <section>
          <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            What happens next
          </h2>
          <LeadStatusButtons leadId={lead.id} status={lead.status} />
        </section>

        <section>
          <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            Notes
          </h2>
          <LeadNotes leadId={lead.id} initialNotes={lead.notes} />
        </section>

        <p className="pb-4 font-body text-[12px] text-admin-muted/60">
          Added {formatDate(lead.created_at)} · status last changed{' '}
          {timeAgo(lead.status_changed_at)}
        </p>
      </div>
    </>
  )
}
