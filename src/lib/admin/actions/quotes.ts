'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import { addDays, todayLondon } from '@/lib/admin/format'
import type { ActionResult } from '@/lib/admin/actions/leads'
import type { ItemUnit } from '@/lib/supabase/types'

const optionalText = z
  .string()
  .trim()
  .max(10000)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Every line needs a description').max(500),
  /* Optional per-line detail (paint, colour, scope) — never affects price. */
  note: z.string().trim().max(500).nullable().optional().transform((v) => v || null),
  qty: z.number().positive('Quantity must be above zero').max(99999),
  unit: z.enum(['job', 'day', 'room', 'm2', 'item']),
  unit_price_pence: z.number().int().min(0).max(99_999_999),
})

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bad date')

const newClientSchema = z.object({
  mode: z.literal('new'),
  name: z.string().trim().min(1, 'Client name is required').max(200),
  phone: optionalText,
  email: optionalText,
  address_line1: optionalText,
  town: optionalText,
  postcode: optionalText,
})

const quoteInputSchema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  client: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), id: z.string().uuid() }),
    newClientSchema,
  ]),
  title: z.string().trim().min(1, 'Give the quote a title').max(300),
  valid_until: dateString.nullable().optional(),
  vat_rate: z.number().min(0).max(100),
  items: z.array(itemSchema).min(1, 'Add at least one line'),
  notes: optionalText,
  terms: optionalText,
})

/* Totals are always recomputed server-side — the client's numbers are a
   preview, never the record (§5.4). */
function computeTotals(items: z.infer<typeof itemSchema>[], vatRate: number) {
  const lines = items.map((item) => ({
    ...item,
    total_pence: Math.round(item.qty * item.unit_price_pence),
  }))
  const subtotal = lines.reduce((sum, l) => sum + l.total_pence, 0)
  const vat = Math.round((subtotal * vatRate) / 100)
  return { lines, subtotal, vat, total: subtotal + vat }
}

export async function createQuote(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = quoteInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const data = parsed.data

  // Resolve the client, creating it inline when needed.
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
      console.error('createQuote client insert failed:', error)
      return { ok: false, error: "Couldn't save the new client — try again." }
    }
    clientId = created.id
  }

  const { data: quoteNumber, error: numberError } = await supabase.rpc(
    'next_number',
    { kind: 'quote' }
  )
  if (numberError || typeof quoteNumber !== 'number') {
    console.error('createQuote next_number failed:', numberError)
    return { ok: false, error: "Couldn't get the next quote number — try again." }
  }

  const { lines, subtotal, vat, total } = computeTotals(data.items, data.vat_rate)

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      quote_number: quoteNumber,
      client_id: clientId,
      lead_id: data.lead_id ?? null,
      title: data.title,
      issue_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date()),
      valid_until: data.valid_until ?? null,
      vat_rate: data.vat_rate,
      subtotal_pence: subtotal,
      vat_pence: vat,
      total_pence: total,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
    })
    .select('id')
    .single()
  if (quoteError || !quote) {
    console.error('createQuote insert failed:', quoteError)
    return { ok: false, error: "Couldn't save the quote — try again." }
  }

  const { error: itemsError } = await supabase.from('quote_items').insert(
    lines.map((line, i) => ({
      quote_id: quote.id,
      position: i,
      description: line.description,
      note: line.note,
      qty: line.qty,
      unit: line.unit as ItemUnit,
      unit_price_pence: line.unit_price_pence,
      total_pence: line.total_pence,
    }))
  )
  if (itemsError) {
    console.error('createQuote items insert failed:', itemsError)
    // Compensate so a half-written quote never lingers (number gap is fine).
    await supabase.from('quotes').delete().eq('id', quote.id)
    return { ok: false, error: "Couldn't save the quote lines — try again." }
  }

  if (data.lead_id) {
    const { error: leadError } = await supabase
      .from('leads')
      .update({ status: 'quoted', status_changed_at: new Date().toISOString() })
      .eq('id', data.lead_id)
    if (leadError) console.error('createQuote lead sync failed:', leadError)
    revalidatePath(`/admin/leads/${data.lead_id}`)
    revalidatePath('/admin/leads')
  }

  revalidatePath('/admin/quotes')
  revalidatePath('/admin')
  return { ok: true, data: { id: quote.id } }
}

const quoteUpdateSchema = quoteInputSchema
  .omit({ client: true, lead_id: true })
  .extend({ id: z.string().uuid() })

export async function updateQuote(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = quoteUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const data = parsed.data

  const { data: existing } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', data.id)
    .maybeSingle()
  if (!existing) return { ok: false, error: "Couldn't find that quote — go back and refresh." }
  if (existing.status !== 'draft' && existing.status !== 'sent') {
    return { ok: false, error: 'This quote is locked — create a new one instead.' }
  }

  const { lines, subtotal, vat, total } = computeTotals(data.items, data.vat_rate)

  const { error: quoteError } = await supabase
    .from('quotes')
    .update({
      title: data.title,
      valid_until: data.valid_until ?? null,
      vat_rate: data.vat_rate,
      subtotal_pence: subtotal,
      vat_pence: vat,
      total_pence: total,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
    })
    .eq('id', data.id)
  if (quoteError) {
    console.error('updateQuote failed:', quoteError)
    return { ok: false, error: "Couldn't save — try again." }
  }

  // Replace the lines wholesale — simplest correct way to handle edits,
  // removals and reordering in one go.
  const { error: deleteError } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', data.id)
  if (deleteError) {
    console.error('updateQuote item delete failed:', deleteError)
    return { ok: false, error: "Couldn't save the quote lines — try again." }
  }
  const { error: itemsError } = await supabase.from('quote_items').insert(
    lines.map((line, i) => ({
      quote_id: data.id,
      position: i,
      description: line.description,
      note: line.note,
      qty: line.qty,
      unit: line.unit as ItemUnit,
      unit_price_pence: line.unit_price_pence,
      total_pence: line.total_pence,
    }))
  )
  if (itemsError) {
    console.error('updateQuote items insert failed:', itemsError)
    return { ok: false, error: "Couldn't save the quote lines — try again." }
  }

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${data.id}`)
  revalidatePath('/admin')
  return { ok: true }
}

/* Duplicate quote (§4, repeat clients): same client, title, items and
   terms into a fresh draft with the next number and fresh dates.
   Nothing else carried — no lead link, no notes, no status history. */
const duplicateSchema = z.object({ id: z.string().uuid() })

export async function duplicateQuote(
  input: unknown
): Promise<ActionResult<{ id: string; quote_number: number }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: "You've been signed out — sign in and try again." }
  }

  const parsed = duplicateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }

  const { data: source } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!source) return { ok: false, error: "Couldn't find that quote — go back and refresh." }

  const { data: quoteNumber, error: numberError } = await supabase.rpc('next_number', {
    kind: 'quote',
  })
  if (numberError || typeof quoteNumber !== 'number') {
    console.error('duplicateQuote counter failed:', numberError)
    return { ok: false, error: "Couldn't get the next quote number — try again." }
  }

  const today = todayLondon()
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      quote_number: quoteNumber,
      client_id: source.client_id,
      title: source.title,
      status: 'draft',
      issue_date: today,
      valid_until: addDays(today, 30),
      vat_rate: source.vat_rate,
      subtotal_pence: source.subtotal_pence,
      vat_pence: source.vat_pence,
      total_pence: source.total_pence,
      terms: source.terms,
    })
    .select('id')
    .single()
  if (quoteError || !quote) {
    console.error('duplicateQuote insert failed:', quoteError)
    return { ok: false, error: "Couldn't create the copy — try again." }
  }

  const items = [...(source.quote_items ?? [])].sort((a, b) => a.position - b.position)
  const { error: itemsError } = await supabase.from('quote_items').insert(
    items.map((item, i) => ({
      quote_id: quote.id,
      position: i,
      description: item.description,
      note: item.note,
      qty: item.qty,
      unit: item.unit,
      unit_price_pence: item.unit_price_pence,
      total_pence: item.total_pence,
    }))
  )
  if (itemsError) {
    console.error('duplicateQuote items failed:', itemsError)
    return { ok: false, error: "Couldn't copy the quote lines — try again." }
  }

  revalidatePath('/admin/quotes')
  return { ok: true, data: { id: quote.id, quote_number: quoteNumber } }
}
