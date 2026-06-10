'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/admin/auth'
import { buildQuotePdfInput, buildInvoicePdfInput } from '@/lib/admin/pdf/data'
import { renderBrushlyPdf } from '@/lib/admin/pdf/BrushlyDocument'
import type { ActionResult } from '@/lib/admin/actions/leads'

const idSchema = z.string().uuid()

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

export async function sendQuote(rawId: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = idSchema.safeParse(rawId)
  if (!parsed.success) return { ok: false, error: 'Something went wrong — refresh the page and try again.' }

  const built = await buildQuotePdfInput(supabase, parsed.data)
  if (!built) return { ok: false, error: "Couldn't find that quote — go back and refresh." }
  const { input, quote } = built

  if (quote.status === 'accepted' || quote.status === 'declined') {
    return { ok: false, error: 'This quote was already answered — refresh to see where it stands.' }
  }
  if (!input.client.email) {
    return {
      ok: false,
      error: `${input.client.name} has no email — add one on their client page first.`,
    }
  }

  let buffer: Buffer
  try {
    buffer = await renderBrushlyPdf(input)
  } catch (error) {
    console.error('sendQuote PDF render failed:', error)
    return { ok: false, error: "Couldn't build the PDF — try again." }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Brushly <hello@brushly.uk>',
      to: input.client.email,
      replyTo: 'hello@brushly.uk',
      subject: `Your quote from Brushly — ${input.reference}`,
      text: `Hi ${firstName(input.client.name)},\n\nThanks for talking to us about ${input.title ?? 'your project'} — your quote is attached. Any questions at all, just reply to this email or call us on ${input.company.phone}.\n\nBest,\nBrushly\n${input.company.email} · ${input.company.phone}`,
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

export async function sendInvoice(rawId: unknown): Promise<ActionResult> {
  let supabase
  try {
    ;({ supabase } = await requireAdmin())
  } catch {
    return { ok: false, error: 'You\'ve been signed out — sign in and try again.' }
  }
  const parsed = idSchema.safeParse(rawId)
  if (!parsed.success) return { ok: false, error: 'Something went wrong — refresh the page and try again.' }

  const built = await buildInvoicePdfInput(supabase, parsed.data)
  if (!built) return { ok: false, error: "Couldn't find that invoice — go back and refresh." }
  const { input, invoice } = built

  if (invoice.status === 'paid' || invoice.status === 'void') {
    return { ok: false, error: `This invoice is ${invoice.status} — nothing to send.` }
  }
  if (!input.client.email) {
    return {
      ok: false,
      error: `${input.client.name} has no email — add one on their client page first.`,
    }
  }

  let buffer: Buffer
  try {
    buffer = await renderBrushlyPdf(input)
  } catch (error) {
    console.error('sendInvoice PDF render failed:', error)
    return { ok: false, error: "Couldn't build the PDF — try again." }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Brushly <hello@brushly.uk>',
      to: input.client.email,
      replyTo: 'hello@brushly.uk',
      subject: `Invoice from Brushly — ${input.reference}`,
      text: `Hi ${firstName(input.client.name)},\n\nThanks again for choosing Brushly — your invoice is attached${input.secondaryDate ? `, due by ${new Date(`${input.secondaryDate.value}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Any questions, just reply or call us on ${input.company.phone}.\n\nBest,\nBrushly\n${input.company.email} · ${input.company.phone}`,
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
