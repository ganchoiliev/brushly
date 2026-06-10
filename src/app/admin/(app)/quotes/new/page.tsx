import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import QuoteBuilder from '@/components/admin/quotes/QuoteBuilder'
import { requireUser } from '@/lib/admin/auth'

export const metadata: Metadata = {
  title: 'New quote',
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; client?: string }>
}) {
  const { lead: leadId, client: clientId } = await searchParams
  const { supabase } = await requireUser()

  /* Full settings row: the builder's live preview mirrors the PDF and
     needs company/VAT/bank fields (v1.2 §3). */
  const [{ data: settings }, { data: presets }] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('item_presets').select('*').order('position').order('created_at'),
  ])

  const clientColumns =
    'id, name, phone, email, address_line1, address_line2, town, postcode'

  let lead = null
  let candidateClients: {
    id: string
    name: string
    phone: string | null
    email: string | null
    address_line1: string | null
    address_line2: string | null
    town: string | null
    postcode: string | null
  }[] = []
  if (leadId && /^[0-9a-f-]{36}$/.test(leadId)) {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, email, service')
      .eq('id', leadId)
      .maybeSingle()
    if (!data) notFound()
    lead = data
    // Dedupe prompt: existing clients sharing the lead's phone or email.
    const matchers = []
    if (lead.phone) matchers.push(`phone.eq.${lead.phone.replace(/[,()]/g, '')}`)
    if (lead.email) matchers.push(`email.eq.${lead.email.replace(/[,()]/g, '')}`)
    if (matchers.length) {
      const { data: matches } = await supabase
        .from('clients')
        .select(clientColumns)
        .or(matchers.join(','))
        .limit(5)
      candidateClients = matches ?? []
    }
  }

  let initialClient = null
  if (clientId && /^[0-9a-f-]{36}$/.test(clientId)) {
    const { data } = await supabase
      .from('clients')
      .select(clientColumns)
      .eq('id', clientId)
      .maybeSingle()
    if (!data) notFound()
    initialClient = data
  }

  return (
    <>
      <PageHeader title="New quote" />
      <QuoteBuilder
        settings={settings}
        lead={lead}
        candidateClients={candidateClients}
        initialClient={initialClient}
        presets={presets ?? []}
      />
    </>
  )
}
