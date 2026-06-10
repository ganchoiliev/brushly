'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import type { LeadSource, LeadStatus } from '@/lib/supabase/types'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const leadCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().min(5, 'Phone is required').max(50),
  email: optionalText,
  service: optionalText,
  notes: optionalText,
  source: z.enum(['website', 'ads', 'referral', 'phone', 'manual']).default('phone'),
})

export async function createLead(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = leadCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const { name, phone, email, service, notes, source } = parsed.data

  const { data, error } = await supabase
    .from('leads')
    .insert({
      name,
      phone,
      email: email ?? null,
      service: service ?? null,
      notes: notes ?? null,
      source: source as LeadSource,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('createLead failed:', error)
    return { ok: false, error: "Couldn't save the lead — try again." }
  }

  revalidatePath('/admin/leads')
  revalidatePath('/admin')
  return { ok: true, data: { id: data.id } }
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'contacted', 'quoted', 'won', 'lost', 'spam']),
})

export async function updateLeadStatus(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Something went wrong — refresh the page and try again.' }

  /* A decided lead doesn't need a call-back reminder — clear it. */
  const decided = ['won', 'lost', 'spam'].includes(parsed.data.status)
  const { error } = await supabase
    .from('leads')
    .update({
      status: parsed.data.status as LeadStatus,
      status_changed_at: new Date().toISOString(),
      ...(decided ? { follow_up_at: null } : {}),
    })
    .eq('id', parsed.data.id)

  if (error) {
    console.error('updateLeadStatus failed:', error)
    return { ok: false, error: "Couldn't update — try again." }
  }

  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${parsed.data.id}`)
  revalidatePath('/admin')
  return { ok: true }
}

const detailsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: optionalText,
  email: optionalText,
  service: optionalText,
})

export async function updateLeadDetails(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = detailsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const { id, name, phone, email, service } = parsed.data

  const { error } = await supabase
    .from('leads')
    .update({
      name,
      phone: phone ?? null,
      email: email ?? null,
      service: service ?? null,
    })
    .eq('id', id)

  if (error) {
    console.error('updateLeadDetails failed:', error)
    return { ok: false, error: "Couldn't save — try again." }
  }

  revalidatePath('/admin/leads')
  revalidatePath(`/admin/leads/${id}`)
  return { ok: true }
}

const notesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(10000),
})

export async function updateLeadNotes(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = notesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Check the form and try again.' }

  const { error } = await supabase
    .from('leads')
    .update({ notes: parsed.data.notes || null })
    .eq('id', parsed.data.id)

  if (error) {
    console.error('updateLeadNotes failed:', error)
    return { ok: false, error: "Couldn't save — try again." }
  }

  revalidatePath(`/admin/leads/${parsed.data.id}`)
  return { ok: true }
}
