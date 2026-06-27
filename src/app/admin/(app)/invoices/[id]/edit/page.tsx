import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import QuoteBuilder from '@/components/admin/quotes/QuoteBuilder'
import { requireUser } from '@/lib/admin/auth'
import { invoiceRef } from '@/lib/admin/format'
import type { ItemUnit } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Edit invoice',
}

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()

  const { supabase } = await requireUser()
  const [{ data: invoice }, { data: settings }, { data: presets }] = await Promise.all([
    supabase
      .from('invoices')
      .select(
        '*, clients(id, name, phone, email, address_line1, address_line2, town, postcode), invoice_items(*)'
      )
      .eq('id', id)
      .maybeSingle(),
    /* Full settings row: the builder's live preview mirrors the PDF and
       needs company/VAT/bank fields (v1.2 §3). */
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('item_presets').select('*').order('position').order('created_at'),
  ])
  if (!invoice || !invoice.clients) notFound()
  // Only draft/sent invoices can be edited; paid or void ones are locked.
  if (invoice.status !== 'draft' && invoice.status !== 'sent') {
    redirect(`/admin/invoices/${id}`)
  }

  const items = [...(invoice.invoice_items ?? [])]
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
      <PageHeader title={`Edit ${invoiceRef(invoice.invoice_number)}`} />
      <QuoteBuilder
        kind="invoice"
        settings={settings}
        presets={presets ?? []}
        docMeta={{
          reference: invoiceRef(invoice.invoice_number),
          issueDate: invoice.issue_date,
          status: invoice.status,
        }}
        /* The builder is shared with quotes; for invoices its `quote` prop
           carries the prefill — due_date rides in as valid_until, no terms. */
        quote={{
          id: invoice.id,
          title: invoice.title ?? '',
          valid_until: invoice.due_date,
          vat_rate: Number(invoice.vat_rate),
          notes: invoice.notes,
          terms: null,
          client: invoice.clients,
          items,
        }}
      />
    </>
  )
}
