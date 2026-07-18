import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { quoteRequestSchema } from '@/lib/visualizer/schemas'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildQuoteMessage,
  buildQuoteRequestEmail,
  fetchQuoteRenderDetails,
} from '@/lib/visualizer/quoteEmail'

/* One-tap quote request from a visitor who already passed the lead gate this
   session: upgrades their existing lead (intent badge + fresh render links +
   quote line in the message) and notifies Brushly with the QUOTE REQUEST
   subject. No second form — the gate captured the contact details already.

   Ownership: the lead uuid is unguessable and only ever returned to the
   client that created it, and we additionally require source='visualizer',
   so the blast radius of a forged call is nil — render attachment stays
   scoped to the caller's own session either way. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsed = quoteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { sessionId, leadId, renderIds, quoteRenderId } = parsed.data

  const supabase = createAdminClient()
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('id, name, email, phone, message')
    .eq('id', leadId)
    .eq('source', 'visualizer')
    .maybeSingle()
  if (leadErr) {
    console.error('visualizer quote lead lookup failed:', leadErr)
    return NextResponse.json({ error: 'Please try again.' }, { status: 500 })
  }
  // Deleted in admin (or never ours) — the client falls back to the gate form.
  if (!lead) {
    return NextResponse.json({ error: 'lead_not_found' }, { status: 404 })
  }

  const details = quoteRenderId
    ? await fetchQuoteRenderDetails(supabase, quoteRenderId, sessionId)
    : null

  // Store and email independently (contact-route discipline), but if BOTH
  // fail the visitor must not see a false "request received" confirmation.
  let stored = false
  try {
    const quoteLine = buildQuoteMessage(details)
    // Repeat taps shouldn't stack identical lines onto the founder's view.
    const priorMessage = lead.message ?? ''
    const nextMessage = priorMessage.includes(quoteLine)
      ? priorMessage
      : [priorMessage, quoteLine].filter(Boolean).join('\n')
    const { error } = await supabase
      .from('leads')
      .update({ intent: 'quote_request', message: nextMessage })
      .eq('id', lead.id)
    if (error) console.error('visualizer quote update failed:', error)
    else stored = true

    if (renderIds && renderIds.length > 0) {
      // Renders made after the gate was passed are attached here — session
      // scoping keeps callers from claiming another visitor's photos.
      await supabase
        .from('visualizer_renders')
        .update({ lead_id: lead.id })
        .in('id', renderIds)
        .eq('session_id', sessionId)
    }
  } catch (error) {
    console.error('visualizer quote update failed:', error)
  }

  let emailed = false
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html } = buildQuoteRequestEmail({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      leadId: lead.id,
      renderCount: renderIds?.length ?? 0,
      details,
    })
    await resend.emails.send({
      from: 'Brushly Website <hello@brushly.uk>',
      to: 'hello@brushly.uk',
      ...(lead.email ? { replyTo: lead.email } : {}),
      subject,
      html,
    })
    emailed = true
  } catch (error) {
    console.error('visualizer quote email failed:', error)
  }

  if (!stored && !emailed) {
    return NextResponse.json(
      { error: 'Could not send your request — please try again.' },
      { status: 500 },
    )
  }
  return NextResponse.json({ success: true })
}
