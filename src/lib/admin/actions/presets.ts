'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import type { ActionResult } from '@/lib/admin/actions/leads'
import type { ItemPreset } from '@/lib/supabase/types'

/* Saved line items (v1.2 §5) — conveniences, not records: hard delete
   is fine, no history kept. Field rules mirror quote/invoice items so
   a preset always inserts cleanly as a line. */

const presetFieldsSchema = z.object({
  description: z.string().trim().min(1, 'The line needs a description.').max(500),
  unit: z.enum(['job', 'day', 'room', 'm2', 'item']),
  unit_price_pence: z.number().int().min(0).max(99_999_999),
})

export async function createItemPreset(
  input: unknown
): Promise<ActionResult<ItemPreset>> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = presetFieldsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the line and try again.' }
  }

  /* New presets join the end of the list. */
  const { data: last } = await supabase
    .from('item_presets')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('item_presets')
    .insert({ ...parsed.data, position: (last?.position ?? -1) + 1 })
    .select('*')
    .single()

  if (error || !data) {
    console.error('createItemPreset failed:', error)
    return { ok: false, error: "Couldn't save the preset — try again." }
  }

  revalidatePath('/admin/settings')
  return { ok: true, data }
}

const presetUpdateSchema = presetFieldsSchema.extend({ id: z.string().uuid() })

export async function updateItemPreset(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = presetUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the line and try again.' }
  }
  const { id, ...fields } = parsed.data

  const { error } = await supabase.from('item_presets').update(fields).eq('id', id)
  if (error) {
    console.error('updateItemPreset failed:', error)
    return { ok: false, error: "Couldn't save — try again." }
  }

  revalidatePath('/admin/settings')
  return { ok: true }
}

export async function deleteItemPreset(rawId: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = z.string().uuid().safeParse(rawId)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }

  const { error } = await supabase.from('item_presets').delete().eq('id', parsed.data)
  if (error) {
    console.error('deleteItemPreset failed:', error)
    return { ok: false, error: "Couldn't delete — try again." }
  }

  revalidatePath('/admin/settings')
  return { ok: true }
}

/* Full ordered id list — positions become the array index. */
export async function reorderItemPresets(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = z.array(z.string().uuid()).min(1).max(200).safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }

  for (const [index, id] of parsed.data.entries()) {
    const { error } = await supabase
      .from('item_presets')
      .update({ position: index })
      .eq('id', id)
    if (error) {
      console.error('reorderItemPresets failed:', error)
      return { ok: false, error: "Couldn't reorder — refresh and try again." }
    }
  }

  revalidatePath('/admin/settings')
  return { ok: true }
}
