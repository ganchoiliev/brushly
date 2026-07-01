import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { leadSchema } from '@/lib/visualizer/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/* Value-led capture: turns a saved visualisation into a lead in the existing
   pipeline (source='visualizer') and notifies Brushly. Mirrors the contact
   route's store-and-email-independently discipline. */
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
  const { name, email, phone, renderIds, message, company } = parsed.data

  // Honeypot filled → silently accept, store nothing.
  if (company && company.length > 0) {
    return NextResponse.json({ success: true })
  }

  const emailValue = email && email.length > 0 ? email : null
  const summary = message && message.length > 0 ? message : 'Saved a render in the AI Visualizer'

  try {
    const supabase = createAdminClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name,
        email: emailValue,
        phone,
        service: 'AI Visualizer',
        message: summary,
        source: 'visualizer',
      })
      .select('id')
      .single()
    if (error) console.error('visualizer lead insert failed:', error)
    if (lead && renderIds && renderIds.length > 0) {
      await supabase
        .from('visualizer_renders')
        .update({ lead_id: lead.id })
        .in('id', renderIds)
    }
  } catch (error) {
    console.error('visualizer lead insert failed:', error)
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Brushly Website <hello@brushly.uk>',
      to: 'hello@brushly.uk',
      ...(emailValue ? { replyTo: emailValue } : {}),
      subject: 'New Visualizer Lead',
      html: `
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

  return NextResponse.json({ success: true })
}
