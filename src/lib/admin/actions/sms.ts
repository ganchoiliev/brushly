'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import twilio from 'twilio'
import { requireAdmin } from '@/lib/admin/auth'
import { quoteRef } from '@/lib/admin/format'
import { toE164 } from '@/lib/admin/phone'
import type { ActionResult } from '@/lib/admin/actions/leads'

/* Base for the public quote link. Falls back to the live domain so a
   missing env never produces a broken localhost link in a real text. */
const SITE_URL = (process.env.SITE_URL || 'https://brushly.uk').replace(/\/+$/, '')
/* Shown in the SMS so the client can call instead of clicking. */
const PHONE = '01737 479 161'

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

const schema = z.object({ id: z.string().uuid() })

/* Text a quote's public link from the "Brushly" sender. The body is fixed
   server-side — the sender already shows the brand, so it stays short. The
   client's number is read here (never trusted from the browser) and must be
   a real mobile or we bail with a clear message. */
export async function sendQuoteSms(raw: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  }

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, quote_number, status, public_token, clients(name, phone)')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!quote || !quote.clients) {
    return { ok: false, error: "Couldn't find that quote — go back and refresh." }
  }
  if (quote.status === 'accepted' || quote.status === 'declined') {
    return { ok: false, error: 'This quote was already answered — refresh to see where it stands.' }
  }
  if (!quote.public_token) {
    return { ok: false, error: 'This quote has no public link yet — re-save it and try again.' }
  }

  const mobile = toE164(quote.clients.phone)
  if (!mobile) {
    return { ok: false, error: "This client has no mobile we can text — add one, or send by email." }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  if (!sid || !authToken || !messagingServiceSid) {
    console.error('sendQuoteSms: Twilio env not configured')
    return { ok: false, error: "Texting isn't set up yet — send by email for now." }
  }

  const ref = quoteRef(quote.quote_number)
  const body =
    `Hi ${firstName(quote.clients.name)}, your Brushly quote ${ref} is ready: ` +
    `${SITE_URL}/q/${quote.public_token} — any questions call ${PHONE}.`

  try {
    const client = twilio(sid, authToken)
    await client.messages.create({ to: mobile, body, messagingServiceSid })
  } catch (error) {
    console.error('sendQuoteSms send failed:', error)
    return { ok: false, error: "The text didn't send — try again." }
  }

  /* A texted draft is out the door — mark it sent (resends leave it alone). */
  if (quote.status === 'draft') {
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', quote.id)
    if (updateError) console.error('sendQuoteSms status update failed:', updateError)
  }

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${quote.id}`)
  revalidatePath('/admin')
  return { ok: true }
}
