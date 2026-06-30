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
  const [{ data: quote }, { data: settings }, { data: presets }] = await Promise.all([
    supabase
      .from('quotes')
      .select(
        '*, clients(id, name, phone, email, address_line1, address_line2, town, postcode), quote_items(*)'
      )
      .eq('id', id)
      .maybeSingle(),
    /* Full settings row: the builder's live preview mirrors the PDF and
       needs company/VAT/bank fields (v1.2 §3). */
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('item_presets').select('*').order('position').order('created_at'),
  ])
  if (!quote || !quote.clients) notFound()
  // Only draft/sent quotes can be edited; decided or expired ones are locked.
  if (quote.status !== 'draft' && quote.status !== 'sent') {
    redirect(`/admin/quotes/${id}`)
  }

  const items = [...(quote.quote_items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      description: item.description,
      note: item.note,
      qty: Number(item.qty),
      unit: item.unit as ItemUnit,
      unit_price_pence: item.unit_price_pence,
    }))

  return (
    <>
      <PageHeader title={`Edit ${quoteRef(quote.quote_number)}`} />
      <QuoteBuilder
        settings={settings}
        presets={presets ?? []}
        docMeta={{
          reference: quoteRef(quote.quote_number),
          issueDate: quote.issue_date,
          status: quote.status,
        }}
        quote={{
          id: quote.id,
          title: quote.title,
          site_address: quote.site_address,
          valid_until: quote.valid_until,
          vat_rate: Number(quote.vat_rate),
          notes: quote.notes,
          terms: quote.terms,
          client: quote.clients,
          items,
        }}
      />
    </>
  )
}
