import { NextResponse, after } from 'next/server'
import { Resend } from 'resend'
import { leadSchema } from '@/lib/visualizer/schemas'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildQuoteMessage,
  buildQuoteRequestEmail,
  escapeHtml,
  fetchQuoteRenderDetails,
} from '@/lib/visualizer/quoteEmail'
import { sendRenderDeliveryEmail } from '@/lib/visualizer/renderDelivery'

/* Value-led capture: turns a saved visualisation into a lead in the existing
   pipeline (source='visualizer') and notifies Brushly. Mirrors the contact
   route's store-and-email-independently discipline. intent='quote_request'
   marks the submissions that came through the result screen's quote CTA —
   distinct subject + look details so they never read as save-only leads.
   Visitors who left an email also get their saved render back (after() the
   response — see below). */

// The response returns as soon as the lead is stored, but the after() render
// delivery (storage download + attachment send) still runs inside the
// function's lifetime — give it headroom beyond the default.
export const maxDuration = 30

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check your details.' }, { status: 400 })
  }
  const { sessionId, name, email, phone, renderIds, message, company, intent, quoteRenderId } =
    parsed.data

  // Honeypot filled → silently accept, store nothing.
  if (company && company.length > 0) {
    return NextResponse.json({ success: true })
  }

  const emailValue = email && email.length > 0 ? email : null
  const isQuote = intent === 'quote_request'

  let leadId: string | null = null
  let quoteDetails: Awaited<ReturnType<typeof fetchQuoteRenderDetails>> = null
  let summary = message && message.length > 0 ? message : 'Saved a render in the AI Visualizer'
  try {
    const supabase = createAdminClient()
    if (isQuote) {
      quoteDetails = quoteRenderId
        ? await fetchQuoteRenderDetails(supabase, quoteRenderId, sessionId)
        : null
      if (!message || message.length === 0) summary = buildQuoteMessage(quoteDetails)
    }
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name,
        email: emailValue,
        phone,
        service: 'AI Visualizer',
        message: summary,
        source: 'visualizer',
        // Only sent when explicitly a quote request, so save-only inserts are
        // byte-identical to before this column existed.
        ...(isQuote ? { intent: 'quote_request' as const } : {}),
      })
      .select('id')
      .single()
    if (error) console.error('visualizer lead insert failed:', error)
    if (lead) leadId = lead.id
    if (lead && renderIds && renderIds.length > 0) {
      // Session scoping: without it, any caller could claim another visitor's
      // renders onto their lead and staff would see the wrong photos.
      await supabase
        .from('visualizer_renders')
        .update({ lead_id: lead.id })
        .in('id', renderIds)
        .eq('session_id', sessionId)
    }
  } catch (error) {
    console.error('visualizer lead insert failed:', error)
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const quoteEmail = isQuote
      ? buildQuoteRequestEmail({
          name,
          phone,
          email: emailValue,
          leadId,
          renderCount: renderIds?.length ?? 0,
          details: quoteDetails,
        })
      : null
    await resend.emails.send({
      from: 'Brushly Website <hello@brushly.uk>',
      to: 'hello@brushly.uk',
      ...(emailValue ? { replyTo: emailValue } : {}),
      subject: quoteEmail ? quoteEmail.subject : 'New Visualizer Lead',
      html: quoteEmail
        ? quoteEmail.html
        : `
        <h2>New AI Visualizer Lead</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${emailValue ? escapeHtml(emailValue) : 'Not provided'}</td></tr>
        </table>
        <p style="margin-top:16px;">${escapeHtml(summary)}</p>
        <p style="color:#888;font-size:13px;">Renders saved: ${renderIds?.length ?? 0}. View them in the admin lead record.</p>
      `,
    })
  } catch (error) {
    console.error('visualizer lead email failed:', error)
  }

  // Customer render delivery: they gave us an email and saved a render, so
  // send that render back to them — once per render, ever (claimed against
  // customer_email_sent_at before the send). after(): the gate submit must
  // not wait on an image download, and a delivery failure can never fail the
  // save flow — it only logs. Anonymous submits (no email) get nothing.
  if (emailValue && ((renderIds && renderIds.length > 0) || quoteRenderId)) {
    after(async () => {
      try {
        await sendRenderDeliveryEmail({
          sessionId,
          name,
          email: emailValue,
          renderIds: renderIds ?? [],
          preferredRenderId: quoteRenderId ?? null,
        })
      } catch (error) {
        console.error('visualizer render delivery email failed:', error)
      }
    })
  }

  // leadId lets the client upgrade this lead to a quote request later in the
  // session (one tap, no second form). Absent on honeypot/insert failure.
  return NextResponse.json({ success: true, ...(leadId ? { leadId } : {}) })
}
