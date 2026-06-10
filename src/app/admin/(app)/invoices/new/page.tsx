import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import QuoteBuilder from '@/components/admin/quotes/QuoteBuilder'
import { requireUser } from '@/lib/admin/auth'

export const metadata: Metadata = {
  title: 'New invoice',
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: clientId } = await searchParams
  const { supabase } = await requireUser()

  /* Full settings row: the builder's live preview mirrors the PDF and
     needs company/VAT/bank fields (v1.2 §3). */
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  let initialClient = null
  if (clientId && /^[0-9a-f-]{36}$/.test(clientId)) {
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, email, address_line1, address_line2, town, postcode')
      .eq('id', clientId)
      .maybeSingle()
    if (!data) notFound()
    initialClient = data
  }

  return (
    <>
      <PageHeader title="New invoice" />
      <QuoteBuilder kind="invoice" settings={settings} initialClient={initialClient} />
    </>
  )
}
