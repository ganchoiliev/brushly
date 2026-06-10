'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import type { ActionResult } from '@/lib/admin/actions/leads'

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: optionalText,
  phone: optionalText,
  address_line1: optionalText,
  address_line2: optionalText,
  town: optionalText,
  postcode: optionalText,
  notes: optionalText,
})

export async function createClientRecord(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = clientSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address_line1: parsed.data.address_line1 ?? null,
      address_line2: parsed.data.address_line2 ?? null,
      town: parsed.data.town ?? null,
      postcode: parsed.data.postcode ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('createClientRecord failed:', error)
    return { ok: false, error: "Couldn't save the client — try again." }
  }

  revalidatePath('/admin/clients')
  return { ok: true, data: { id: data.id } }
}

const clientUpdateSchema = clientSchema.extend({ id: z.string().uuid() })

export async function updateClientRecord(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = clientUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const { id, ...fields } = parsed.data

  const { error } = await supabase
    .from('clients')
    .update({
      name: fields.name,
      email: fields.email ?? null,
      phone: fields.phone ?? null,
      address_line1: fields.address_line1 ?? null,
      address_line2: fields.address_line2 ?? null,
      town: fields.town ?? null,
      postcode: fields.postcode ?? null,
      notes: fields.notes ?? null,
    })
    .eq('id', id)

  if (error) {
    console.error('updateClientRecord failed:', error)
    return { ok: false, error: "Couldn't save — try again." }
  }

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${id}`)
  return { ok: true }
}

/* Client picker search — server action so the anon key never does table
   reads from the browser (§1.6). Returns full address detail so the
   builder's live preview can render the client block honestly (v1.2 §3). */
export async function searchClients(
  term: string
): Promise<
  ActionResult<
    {
      id: string
      name: string
      phone: string | null
      email: string | null
      address_line1: string | null
      address_line2: string | null
      town: string | null
      postcode: string | null
    }[]
  >
> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const cleaned = term.replace(/[%_,]/g, ' ').trim()
  let query = supabase
    .from('clients')
    .select('id, name, phone, email, address_line1, address_line2, town, postcode')
    .order('created_at', { ascending: false })
    .limit(8)
  if (cleaned) {
    query = query.or(
      `name.ilike.%${cleaned}%,phone.ilike.%${cleaned}%,email.ilike.%${cleaned}%,town.ilike.%${cleaned}%`
    )
  }
  const { data, error } = await query
  if (error) {
    console.error('searchClients failed:', error)
    return { ok: false, error: "Search didn't work — try again." }
  }
  return { ok: true, data: data ?? [] }
}
