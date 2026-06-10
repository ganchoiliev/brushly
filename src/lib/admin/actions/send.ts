'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/admin/auth'
import { buildQuotePdfInput, buildInvoicePdfInput } from '@/lib/admin/pdf/data'
import { renderBrushlyPdf } from '@/lib/admin/pdf/BrushlyDocument'
import { buildDocumentEmail } from '@/lib/admin/email/templates'
import type { ActionResult } from '@/lib/admin/actions/leads'

const FROM = 'Brushly <hello@brushly.uk>'
const REPLY_TO = 'hello@brushly.uk'
/* Test sends go HERE and nowhere else (§4.1) — they're a confidence
   button, marked [TEST], and change no state. */
const TEST_INBOX = 'hello@brushly.uk'

/* The send dialog's fields (§4.1): To and Subject are editable, the
   message becomes the email's main paragraph. */
const sendSchema = z.object({
  id: z.string().uuid(),
  to: z
    .email("That email doesn't look right — check it and try again.")
    .max(320),
  subject: z.string().trim().min(1, 'Give the email a subject.').max(200),
  message: z
    .string()
    .trim()
    .min(1, "Write a short message — it's the first thing they read.")
    .max(2000),
  test: z.boolean(),
})

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

async function senderName(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from('admins')
    .select('name')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.name?.trim() || 'The Brushly team'
}

export async function sendQuote(raw: unknown): Promise<ActionResult> {
  let supabase, user
  try {
    ;({ supabase, user } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = sendSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    }
  }
  const { id, to, subject, message, test } = parsed.data

  const built = await buildQuotePdfInput(supabase, id)
  if (!built) return { ok: false, error: "Couldn't find that quote — go back and refresh." }
  const { input, quote } = built

  if (quote.status === 'accepted' || quote.status === 'declined') {
    return { ok: false, error: 'This quote was already answered — refresh to see where it stands.' }
  }

  let buffer: Buffer
  try {
    buffer = await renderBrushlyPdf(input)
  } catch (error) {
    console.error('sendQuote PDF render failed:', error)
    return { ok: false, error: "Couldn't build the PDF — try again." }
  }

  const { html, text } = buildDocumentEmail({
    docType: 'QUOTE',
    reference: input.reference,
    firstName: firstName(input.client.name),
    message,
    totalPence: input.totalPence,
    secondaryDate: input.secondaryDate,
    payment: null,
    senderName: await senderName(supabase, user.id),
    company: input.company,
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM,
      to: test ? TEST_INBOX : to,
      replyTo: REPLY_TO,
      subject: test ? `[TEST] ${subject}` : subject,
      html,
      text,
      attachments: [
        {
          filename: `Brushly-Quote-${input.reference}.pdf`,
          content: buffer,
        },
      ],
    })
    if (error) {
      console.error('sendQuote email failed:', error)
      return { ok: false, error: "The email didn't send — try again." }
    }
  } catch (error) {
    console.error('sendQuote email failed:', error)
    return { ok: false, error: "The email didn't send — try again." }
  }

  /* Test sends change NO state (§4.1). */
  if (test) return { ok: true }

  const { error: updateError } = await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quote.id)
  if (updateError) console.error('sendQuote status update failed:', updateError)

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${quote.id}`)
  revalidatePath('/admin')
  return { ok: true }
}

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['accepted', 'declined']),
})

export async function markQuoteDecision(input: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = decisionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Something went wrong — refresh the page and try again.' }
  const { id, decision } = parsed.data

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, lead_id')
    .eq('id', id)
    .maybeSingle()
  if (!quote) return { ok: false, error: "Couldn't find that quote — go back and refresh." }
  if (quote.status === 'accepted' || quote.status === 'declined') {
    return { ok: false, error: 'This quote was already answered — refresh to see where it stands.' }
  }

  /* A decided quote needs no call-back reminder — clear it (§4). */
  const { error } = await supabase
    .from('quotes')
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      follow_up_at: null,
    })
    .eq('id', id)
  if (error) {
    console.error('markQuoteDecision failed:', error)
    return { ok: false, error: "Couldn't update — try again." }
  }

  // Lead follows the quote: accepted -> won, declined -> lost (§5.4).
  // Its reminder clears with it.
  if (quote.lead_id) {
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: decision === 'accepted' ? 'won' : 'lost',
        status_changed_at: new Date().toISOString(),
        follow_up_at: null,
      })
      .eq('id', quote.lead_id)
    if (leadError) console.error('markQuoteDecision lead sync failed:', leadError)
    revalidatePath(`/admin/leads/${quote.lead_id}`)
    revalidatePath('/admin/leads')
  }

  revalidatePath('/admin/quotes')
  revalidatePath(`/admin/quotes/${id}`)
  revalidatePath('/admin')
  return { ok: true }
}

export async function sendInvoice(raw: unknown): Promise<ActionResult> {
  let supabase, user
  try {
    ;({ supabase, user } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = sendSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    }
  }
  const { id, to, subject, message, test } = parsed.data

  const built = await buildInvoicePdfInput(supabase, id)
  if (!built) return { ok: false, error: "Couldn't find that invoice — go back and refresh." }
  const { input, invoice } = built

  if (invoice.status === 'paid' || invoice.status === 'void') {
    return { ok: false, error: `This invoice is ${invoice.status} — nothing to send.` }
  }

  let buffer: Buffer
  try {
    buffer = await renderBrushlyPdf(input)
  } catch (error) {
    console.error('sendInvoice PDF render failed:', error)
    return { ok: false, error: "Couldn't build the PDF — try again." }
  }

  /* Invoices carry the payment block in the body (§4.2) — the client
     can pay without opening the PDF. */
  const { html, text } = buildDocumentEmail({
    docType: 'INVOICE',
    reference: input.reference,
    firstName: firstName(input.client.name),
    message,
    totalPence: input.totalPence,
    secondaryDate: input.secondaryDate,
    payment: input.payment,
    senderName: await senderName(supabase, user.id),
    company: input.company,
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM,
      to: test ? TEST_INBOX : to,
      replyTo: REPLY_TO,
      subject: test ? `[TEST] ${subject}` : subject,
      html,
      text,
      attachments: [
        {
          filename: `Brushly-Invoice-${input.reference}.pdf`,
          content: buffer,
        },
      ],
    })
    if (error) {
      console.error('sendInvoice email failed:', error)
      return { ok: false, error: "The email didn't send — try again." }
    }
  } catch (error) {
    console.error('sendInvoice email failed:', error)
    return { ok: false, error: "The email didn't send — try again." }
  }

  /* Test sends change NO state (§4.1). */
  if (test) return { ok: true }

  /* No sent_at column on invoices (schema is law until a migration says
     otherwise) — status alone records the send. */
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', invoice.id)
  if (updateError) console.error('sendInvoice status update failed:', updateError)

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${invoice.id}`)
  revalidatePath('/admin')
  return { ok: true }
}
