import type { Metadata } from 'next'
import Link from 'next/link'
import { BookUser } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'
import LeadSearch from '@/components/admin/leads/LeadSearch'
import { requireUser } from '@/lib/admin/auth'

export const metadata: Metadata = {
  title: 'Clients',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const { supabase } = await requireUser()

  let query = supabase
    .from('clients')
    .select('id, name, phone, town, postcode')
    .order('name')
    .limit(300)
  const term = q.replace(/[%_,]/g, ' ').trim()
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,town.ilike.%${term}%,postcode.ilike.%${term}%`
    )
  }
  const { data: clients, error } = await query
  if (error) throw new Error(`Couldn't load clients: ${error.message}`)

  return (
    <>
      <PageHeader title="Clients" action={{ href: '/admin/clients/new', label: '+ Client' }} />
      <div className="px-4 py-4 md:px-8">
        <LeadSearch placeholder="Search name, phone, town…" />
        {clients.length === 0 ? (
          <EmptyState
            icon={BookUser}
            message={
              q
                ? 'Nothing matches that search.'
                : "No clients yet — they're created automatically when you turn a lead into a quote."
            }
          />
        ) : (
          <ul className="mt-4 overflow-hidden rounded-sm border border-admin-hairline bg-admin-card">
            {clients.map((client) => (
              <li key={client.id} className="border-b border-admin-hairline last:border-b-0">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-admin-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-[15px] font-medium text-brushly-cream">
                      {client.name}
                    </p>
                    <p className="mt-0.5 truncate font-body text-[13px] text-admin-muted">
                      {[client.town, client.postcode, client.phone].filter(Boolean).join(' · ') || '—'}
                    </p>
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
