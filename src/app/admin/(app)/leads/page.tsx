import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import FilterTabs from '@/components/admin/FilterTabs'
import StatusBadge, { LEAD_STATUS } from '@/components/admin/StatusBadge'
import LeadSearch from '@/components/admin/leads/LeadSearch'
import { requireUser } from '@/lib/admin/auth'
import { timeAgo } from '@/lib/admin/format'
import type { LeadStatus } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Leads',
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'spam', label: 'Spam' },
]

const SOURCE_LABEL: Record<string, string> = {
  website: 'Website',
  ads: 'Ads',
  referral: 'Referral',
  phone: 'Phone',
  manual: 'Other',
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status = 'all', q = '' } = await searchParams
  const { supabase } = await requireUser()

  let query = supabase
    .from('leads')
    .select('id, name, phone, service, source, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all' && status in LEAD_STATUS) {
    query = query.eq('status', status as LeadStatus)
  }
  if (q) {
    const term = q.replace(/[%_,]/g, ' ').trim()
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,service.ilike.%${term}%`
      )
    }
  }

  const { data: leads, error } = await query
  if (error) throw new Error(`Couldn't load leads: ${error.message}`)

  return (
    <>
      <PageHeader title="Leads" action={{ href: '/admin/leads/new', label: '+ Lead' }} />
      <div className="px-4 py-4 md:px-8">
        <LeadSearch placeholder="Search name, phone, email…" />
        <div className="mt-4">
          <FilterTabs basePath="/admin/leads" current={status} tabs={TABS} searchQuery={q} />
        </div>

        {leads.length === 0 ? (
          <EmptyState
            icon={Phone}
            message={
              q
                ? 'Nothing matches that search.'
                : status === 'all'
                  ? 'No leads yet — tap + when someone calls.'
                  : `No ${LEAD_STATUS[status]?.label.toLowerCase() ?? status} leads right now.`
            }
            action={
              !q && status === 'all'
                ? { href: '/admin/leads/new', label: '+ Add lead' }
                : undefined
            }
          />
        ) : (
          <ul className="mt-4 overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            {leads.map((lead) => (
              <li key={lead.id} className="border-b border-admin-hairline last:border-b-0">
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[15px] font-medium text-brushly-cream">
                      {lead.name}
                    </p>
                    <p className="mt-0.5 truncate font-body text-[13px] text-admin-muted">
                      {[lead.service, SOURCE_LABEL[lead.source]]
                        .filter(Boolean)
                        .join(' · ') || lead.phone || '—'}
                    </p>
                  </div>
                  <span className="shrink-0 font-body text-[12px] tabular-nums text-admin-muted">
                    {timeAgo(lead.created_at)}
                  </span>
                  <StatusBadge map={LEAD_STATUS} status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
