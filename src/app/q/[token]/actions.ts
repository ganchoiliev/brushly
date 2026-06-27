'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAcceptanceEmail } from '@/lib/admin/email/templates'
import { quoteRef } from '@/lib/admin/format'
import type { ActionResult } from '@/lib/admin/actions/leads'

const FROM = 'Brushly <hello@brushly.uk>'
const REPLY_TO = 'hello@brushly.uk'
/* Owner alert + admin link base. SITE_URL keeps the link right per env;
   falls back to the live domain so a missing env never breaks it. */
const OWNER_INBOX = 'hello@brushly.uk'
const SITE_URL = (process.env.SITE_URL || 'https://brushly.uk').replace(/\/+$/, '')

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

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
    .select('id, status, lead_id, quote_number, total_pence, title, clients(name, email)')
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

  /* Acceptance emails — best-effort, only on this non-idempotent path (a
     re-tap returns early above, so it never re-sends). A failure here must
     not undo the acceptance or change the result: the client already sees
     their confirmation and the status changes already stand. */
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name, company_number, address, phone, email')
      .eq('id', 1)
      .maybeSingle()
    const company = {
      name: settings?.company_name ?? 'Brushly',
      companyNumber: settings?.company_number ?? '',
      address: settings?.address ?? '',
      phone: settings?.phone ?? '01737 479 161',
      email: settings?.email ?? OWNER_INBOX,
    }
    const ref = quoteRef(quote.quote_number)
    const clientName = quote.clients?.name ?? 'A client'
    const resend = new Resend(process.env.RESEND_API_KEY)

    // a) Client receipt — only when we have an address to send it to.
    if (quote.clients?.email) {
      const { html, text } = buildAcceptanceEmail({
        variant: 'client',
        firstName: firstName(quote.clients.name),
        reference: ref,
        title: quote.title,
        totalPence: quote.total_pence,
        company,
      })
      const { error: clientErr } = await resend.emails.send({
        from: FROM,
        to: quote.clients.email,
        replyTo: REPLY_TO,
        subject: `We've got your acceptance — quote ${ref}`,
        html,
        text,
      })
      if (clientErr) console.error('acceptPublicQuote client email failed:', clientErr)
    }

    // b) Owner alert — always.
    const owner = buildAcceptanceEmail({
      variant: 'owner',
      clientName,
      reference: ref,
      title: quote.title,
      totalPence: quote.total_pence,
      adminUrl: `${SITE_URL}/admin/quotes/${quote.id}`,
      company,
    })
    const { error: ownerErr } = await resend.emails.send({
      from: FROM,
      to: OWNER_INBOX,
      replyTo: REPLY_TO,
      subject: `Quote ${ref} accepted — ${clientName}`,
      html: owner.html,
      text: owner.text,
    })
    if (ownerErr) console.error('acceptPublicQuote owner email failed:', ownerErr)
  } catch (emailError) {
    console.error('acceptPublicQuote emails failed:', emailError)
  }

  revalidatePath(`/q/${token}`)
  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${quote.id}`)
  revalidatePath('/admin')
  return { ok: true }
}
