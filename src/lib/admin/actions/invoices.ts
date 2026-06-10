'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import { todayLondon, addDays } from '@/lib/admin/format'
import type { ActionResult } from '@/lib/admin/actions/leads'
import type { ItemUnit, PaymentMethod } from '@/lib/supabase/types'

const optionalText = z
  .string()
  .trim()
  .max(10000)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Every line needs a description').max(500),
  qty: z.number().positive().max(99999),
  unit: z.enum(['job', 'day', 'room', 'm2', 'item']),
  unit_price_pence: z.number().int().min(0).max(99_999_999),
})

function computeTotals(items: z.infer<typeof itemSchema>[], vatRate: number) {
  const lines = items.map((item) => ({
    ...item,
    total_pence: Math.round(item.qty * item.unit_price_pence),
  }))
  const subtotal = lines.reduce((sum, l) => sum + l.total_pence, 0)
  const vat = Math.round((subtotal * vatRate) / 100)
  return { lines, subtotal, vat, total: subtotal + vat }
}

/* One tap on an accepted quote: copy everything into a draft invoice. */
export async function createInvoiceFromQuote(
  rawId: unknown
): Promise<ActionResult<{ id: string }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'Not authorised' }
  }
  const parsed = z.string().uuid().safeParse(rawId)
  if (!parsed.success) return { ok: false, error: 'Invalid quote' }

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', parsed.data)
    .maybeSingle()
  if (!quote) return { ok: false, error: 'Quote not found' }
  if (quote.status !== 'accepted') {
    return { ok: false, error: 'Only accepted quotes become invoices.' }
  }

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('quote_id', quote.id)
    .neq('status', 'void')
    .maybeSingle()
  if (existing) {
    return { ok: true, data: { id: existing.id } } // already there — just go to it
  }

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    'next_number',
    { kind: 'invoice' }
  )
  if (numberError || typeof invoiceNumber !== 'number') {
    console.error('createInvoiceFromQuote next_number failed:', numberError)
    return { ok: false, error: "Couldn't get the next invoice number — try again." }
  }

  const today = todayLondon()
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      quote_id: quote.id,
      client_id: quote.client_id,
      title: quote.title,
      issue_date: today,
      due_date: addDays(today, 14),
      vat_rate: quote.vat_rate,
      subtotal_pence: quote.subtotal_pence,
      vat_pence: quote.vat_pence,
      total_pence: quote.total_pence,
      notes: quote.notes,
    })
    .select('id')
    .single()
  if (invoiceError || !invoice) {
    console.error('createInvoiceFromQuote insert failed:', invoiceError)
    return { ok: false, error: "Couldn't create the invoice — try again." }
  }

  const items = [...(quote.quote_items ?? [])].sort((a, b) => a.position - b.position)
  const { error: itemsError } = await supabase.from('invoice_items').insert(
    items.map((item, i) => ({
      invoice_id: invoice.id,
      position: i,
      description: item.description,
      qty: item.qty,
      unit: item.unit as ItemUnit,
      unit_price_pence: item.unit_price_pence,
      total_pence: item.total_pence,
    }))
  )
  if (itemsError) {
    console.error('createInvoiceFromQuote items failed:', itemsError)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { ok: false, error: "Couldn't copy the quote lines — try again." }
  }

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/quotes/${quote.id}`)
  revalidatePath('/admin')
  return { ok: true, data: { id: invoice.id } }
}

const newClientSchema = z.object({
  mode: z.literal('new'),
  name: z.string().trim().min(1, 'Client name is required').max(200),
  phone: optionalText,
  email: optionalText,
  address_line1: optionalText,
  town: optionalText,
  postcode: optionalText,
})

const invoiceInputSchema = z.object({
  client: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), id: z.string().uuid() }),
    newClientSchema,
  ]),
  title: z.string().trim().min(1, 'Give the invoice a title').max(300),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  vat_rate: z.number().min(0).max(100),
  items: z.array(itemSchema).min(1, 'Add at least one line'),
  notes: optionalText,
})

/* Standalone invoice (no quote) — e.g. extra work agreed on the job. */
export async function createInvoice(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'Not authorised' }
  }

  const parsed = invoiceInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' }
  }
  const data = parsed.data

  let clientId: string
  if (data.client.mode === 'existing') {
    clientId = data.client.id
  } else {
    const { data: created, error } = await supabase
      .from('clients')
      .insert({
        name: data.client.name,
        phone: data.client.phone ?? null,
        email: data.client.email ?? null,
        address_line1: data.client.address_line1 ?? null,
        town: data.client.town ?? null,
        postcode: data.client.postcode ?? null,
      })
      .select('id')
      .single()
    if (error || !created) {
      console.error('createInvoice client insert failed:', error)
      return { ok: false, error: "Couldn't save the new client — try again." }
    }
    clientId = created.id
  }

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    'next_number',
    { kind: 'invoice' }
  )
  if (numberError || typeof invoiceNumber !== 'number') {
    console.error('createInvoice next_number failed:', numberError)
    return { ok: false, error: "Couldn't get the next invoice number — try again." }
  }

  const { lines, subtotal, vat, total } = computeTotals(data.items, data.vat_rate)

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      client_id: clientId,
      title: data.title,
      issue_date: todayLondon(),
      due_date: data.due_date ?? null,
      vat_rate: data.vat_rate,
      subtotal_pence: subtotal,
      vat_pence: vat,
      total_pence: total,
      notes: data.notes ?? null,
    })
    .select('id')
    .single()
  if (invoiceError || !invoice) {
    console.error('createInvoice insert failed:', invoiceError)
    return { ok: false, error: "Couldn't save the invoice — try again." }
  }

  const { error: itemsError } = await supabase.from('invoice_items').insert(
    lines.map((line, i) => ({
      invoice_id: invoice.id,
      position: i,
      description: line.description,
      qty: line.qty,
      unit: line.unit as ItemUnit,
      unit_price_pence: line.unit_price_pence,
      total_pence: line.total_pence,
    }))
  )
  if (itemsError) {
    console.error('createInvoice items failed:', itemsError)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { ok: false, error: "Couldn't save the invoice lines — try again." }
  }

  revalidatePath('/admin/invoices')
  revalidatePath('/admin')
  return { ok: true, data: { id: invoice.id } }
}

const paidSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(['bank_transfer', 'cash']),
})

export async function markInvoicePaid(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'Not authorised' }
  }
  const parsed = paidSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { ok: false, error: 'Already marked as paid.' }
  if (invoice.status === 'void') return { ok: false, error: 'This invoice is void.' }

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: parsed.data.method as PaymentMethod,
    })
    .eq('id', parsed.data.id)
  if (error) {
    console.error('markInvoicePaid failed:', error)
    return { ok: false, error: "Couldn't update — try again." }
  }

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${parsed.data.id}`)
  revalidatePath('/admin')
  return { ok: true }
}

export async function voidInvoice(rawId: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'Not authorised' }
  }
  const parsed = z.string().uuid().safeParse(rawId)
  if (!parsed.success) return { ok: false, error: 'Invalid invoice' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', parsed.data)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') {
    return { ok: false, error: "Paid invoices can't be voided." }
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'void' })
    .eq('id', parsed.data)
  if (error) {
    console.error('voidInvoice failed:', error)
    return { ok: false, error: "Couldn't update — try again." }
  }

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${parsed.data}`)
  revalidatePath('/admin')
  return { ok: true }
}
