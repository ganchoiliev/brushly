'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/admin/actions/leads'

/* Public quote acceptance. No login: the token is the capability — only the
   client who was sent the link can know it. We look the quote up by token
   with the service-role client (server-only) and flip draft/sent -> accepted.
   Anything already decided is rejected; an already-accepted token is a no-op
   so a double-tap reads as success rather than an error. */
const schema = z.object({ token: z.string().min(8).max(64) })

export async function acceptPublicQuote(raw: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }
  const token = parsed.data.token

  const supabase = createAdminClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, lead_id')
    .eq('public_token', token)
    .maybeSingle()
  if (!quote) return { ok: false, error: "We couldn't find that quote." }
  if (quote.status === 'accepted') return { ok: true } // idempotent
  if (quote.status !== 'draft' && quote.status !== 'sent') {
    return { ok: false, error: 'This quote can no longer be accepted online — please get in touch.' }
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      decided_at: new Date().toISOString(),
      follow_up_at: null,
    })
    .eq('id', quote.id)
  if (error) {
    console.error('acceptPublicQuote failed:', error)
    return { ok: false, error: "Couldn't record that just now — please try again." }
  }

  /* Keep the pipeline honest: the lead follows the quote to won. */
  if (quote.lead_id) {
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'won',
        status_changed_at: new Date().toISOString(),
        follow_up_at: null,
      })
      .eq('id', quote.lead_id)
    if (leadError) console.error('acceptPublicQuote lead sync failed:', leadError)
    revalidatePath('/admin/leads')
    revalidatePath(`/admin/leads/${quote.lead_id}`)
  }

  revalidatePath(`/q/${token}`)
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${quote.id}`)
  revalidatePath('/admin')
  return { ok: true }
}
