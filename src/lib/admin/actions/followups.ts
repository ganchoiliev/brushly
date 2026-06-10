'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import type { ActionResult } from '@/lib/admin/actions/leads'

/* Follow-up reminders (§4): one timestamp per lead/quote; due rows feed
   "Needs attention", clearing marks the call as done. */

const setSchema = z.object({
  kind: z.enum(['lead', 'quote']),
  id: z.string().uuid(),
  when: z.string().datetime({ offset: true }),
})

export async function setFollowUp(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: "You've been signed out — sign in and try again." }
  }

  const parsed = setSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }
  const { kind, id, when } = parsed.data

  const { error } = await supabase
    .from(kind === 'lead' ? 'leads' : 'quotes')
    .update({ follow_up_at: when })
    .eq('id', id)

  if (error) {
    console.error('setFollowUp failed:', error)
    return { ok: false, error: "Couldn't set the reminder — try again." }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/${kind === 'lead' ? 'leads' : 'quotes'}/${id}`)
  return { ok: true }
}

const clearSchema = z.object({
  kind: z.enum(['lead', 'quote']),
  id: z.string().uuid(),
})

export async function clearFollowUp(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: "You've been signed out — sign in and try again." }
  }

  const parsed = clearSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }
  const { kind, id } = parsed.data

  const { error } = await supabase
    .from(kind === 'lead' ? 'leads' : 'quotes')
    .update({ follow_up_at: null })
    .eq('id', id)

  if (error) {
    console.error('clearFollowUp failed:', error)
    return { ok: false, error: "Couldn't update — try again." }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/${kind === 'lead' ? 'leads' : 'quotes'}/${id}`)
  return { ok: true }
}
