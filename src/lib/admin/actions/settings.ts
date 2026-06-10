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

const settingsSchema = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(200),
  company_number: z.string().trim().min(1, 'Company number is required').max(20),
  address: z.string().trim().min(1, 'Address is required').max(500),
  phone: z.string().trim().min(1, 'Phone is required').max(50),
  email: z.string().trim().min(3, 'Email is required').max(200),
  vat_registered: z.boolean(),
  vat_number: optionalText,
  bank_name: optionalText,
  bank_sort_code: optionalText,
  bank_account_no: optionalText,
  default_terms: optionalText,
})

export async function updateSettings(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }

  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }
  const d = parsed.data

  if (d.vat_registered && !d.vat_number) {
    return { ok: false, error: 'VAT is on — add the VAT number.' }
  }

  const { error } = await supabase
    .from('settings')
    .update({
      company_name: d.company_name,
      company_number: d.company_number,
      address: d.address,
      phone: d.phone,
      email: d.email,
      vat_registered: d.vat_registered,
      vat_number: d.vat_number ?? null,
      bank_name: d.bank_name ?? null,
      bank_sort_code: d.bank_sort_code ?? null,
      bank_account_no: d.bank_account_no ?? null,
      default_terms: d.default_terms ?? null,
    })
    .eq('id', 1)

  if (error) {
    console.error('updateSettings failed:', error)
    return { ok: false, error: "Couldn't save — try again." }
  }

  revalidatePath('/admin/settings')
  revalidatePath('/admin')
  return { ok: true }
}
