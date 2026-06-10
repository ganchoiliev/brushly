import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import QuoteBuilder from '@/components/admin/quotes/QuoteBuilder'
import { requireUser } from '@/lib/admin/auth'
import { quoteRef } from '@/lib/admin/format'
import type { ItemUnit } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Edit quote',
}

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const [{ data: quote }, { data: settings }] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, clients(id, name), quote_items(*)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('settings')
      .select('vat_registered, default_terms')
      .eq('id', 1)
      .maybeSingle(),
  ])
  if (!quote || !quote.clients) notFound()
  if (quote.status === 'accepted' || quote.status === 'declined') {
    redirect(`/admin/quotes/${id}`)
  }

  const items = [...(quote.quote_items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      description: item.description,
      qty: Number(item.qty),
      unit: item.unit as ItemUnit,
      unit_price_pence: item.unit_price_pence,
    }))

  return (
    <>
      <PageHeader title={`Edit ${quoteRef(quote.quote_number)}`} />
      <QuoteBuilder
        settings={settings ?? { vat_registered: false, default_terms: null }}
        quote={{
          id: quote.id,
          title: quote.title,
          valid_until: quote.valid_until,
          vat_rate: Number(quote.vat_rate),
          notes: quote.notes,
          terms: quote.terms,
          client: { id: quote.clients.id, name: quote.clients.name },
          items,
        }}
      />
    </>
  )
}
