import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { quoteRef, invoiceRef } from '@/lib/admin/format'
import type { PdfInput } from '@/lib/admin/pdf/BrushlyDocument'

type DB = SupabaseClient<Database>

function clientAddressLines(client: {
  address_line1: string | null
  address_line2: string | null
  town: string | null
  postcode: string | null
}): string[] {
  return [
    client.address_line1,
    client.address_line2,
    [client.town, client.postcode].filter(Boolean).join(' '),
  ].filter((line): line is string => !!line && line.trim() !== '')
}

async function getSettings(supabase: DB) {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  return data
}

export async function buildQuotePdfInput(supabase: DB, id: string) {
  const [{ data: quote }, settings] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, clients(*), quote_items(*)')
      .eq('id', id)
      .maybeSingle(),
    getSettings(supabase),
  ])
  if (!quote || !quote.clients || !settings) return null

  const items = [...(quote.quote_items ?? [])].sort((a, b) => a.position - b.position)
  const input: PdfInput = {
    docType: 'QUOTE',
    reference: quoteRef(quote.quote_number),
    draft: quote.status === 'draft',
    title: quote.title,
    issueDate: quote.issue_date,
    secondaryDate: quote.valid_until
      ? { label: 'Valid until', value: quote.valid_until }
      : null,
    company: {
      name: settings.company_name,
      companyNumber: settings.company_number,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      vatNumber: settings.vat_registered ? settings.vat_number : null,
    },
    client: {
      name: quote.clients.name,
      addressLines: clientAddressLines(quote.clients),
      email: quote.clients.email,
      phone: quote.clients.phone,
    },
    items: items.map((item) => ({
      description: item.description,
      qty: Number(item.qty),
      unit: item.unit,
      unitPricePence: item.unit_price_pence,
      totalPence: item.total_pence,
    })),
    subtotalPence: quote.subtotal_pence,
    vatRate: Number(quote.vat_rate),
    vatPence: quote.vat_pence,
    totalPence: quote.total_pence,
    notes: quote.notes,
    terms: quote.terms ?? settings.default_terms,
    payment: null,
  }
  return { input, quote }
}

export async function buildInvoicePdfInput(supabase: DB, id: string) {
  const [{ data: invoice }, settings] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(*), invoice_items(*)')
      .eq('id', id)
      .maybeSingle(),
    getSettings(supabase),
  ])
  if (!invoice || !invoice.clients || !settings) return null

  const items = [...(invoice.invoice_items ?? [])].sort((a, b) => a.position - b.position)
  const input: PdfInput = {
    docType: 'INVOICE',
    reference: invoiceRef(invoice.invoice_number),
    draft: invoice.status === 'draft',
    title: invoice.title,
    issueDate: invoice.issue_date,
    secondaryDate: invoice.due_date ? { label: 'Due', value: invoice.due_date } : null,
    company: {
      name: settings.company_name,
      companyNumber: settings.company_number,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      vatNumber: settings.vat_registered ? settings.vat_number : null,
    },
    client: {
      name: invoice.clients.name,
      addressLines: clientAddressLines(invoice.clients),
      email: invoice.clients.email,
      phone: invoice.clients.phone,
    },
    items: items.map((item) => ({
      description: item.description,
      qty: Number(item.qty),
      unit: item.unit,
      unitPricePence: item.unit_price_pence,
      totalPence: item.total_pence,
    })),
    subtotalPence: invoice.subtotal_pence,
    vatRate: Number(invoice.vat_rate),
    vatPence: invoice.vat_pence,
    totalPence: invoice.total_pence,
    notes: invoice.notes,
    terms: settings.default_terms,
    payment: {
      bankName: settings.bank_name,
      sortCode: settings.bank_sort_code,
      accountNo: settings.bank_account_no,
    },
  }
  return { input, invoice }
}
