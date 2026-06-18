import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

// Reject control chars / newlines everywhere so nothing can be smuggled
// into an email header, and keep email to a sane single-line shape.
const singleLine = z.string().min(1).max(2000).regex(/^[^\r\n]+$/, 'Invalid value')

const contactSchema = z.object({
  name: singleLine,
  // Phone-first contact form: phone is required, email is optional. The client
  // always sends the email field, so accept an empty string or a valid address.
  email: z
    .union([z.literal(''), singleLine.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email')])
    .optional()
    .nullable(),
  phone: singleLine.max(50),
  service: singleLine,
  message: z.string().min(1).max(10000),
})

// Escape user input before it goes into the notification email's HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please fill in all required fields.' },
      { status: 400 }
    )
  }
  const { name, email, phone, service, message } = parsed.data
  // Email is optional now — normalise empty/absent to null for storage,
  // reply-to, and the notification email.
  const emailValue = email && email.length > 0 ? email : null

  /* Store the lead and send the email independently: one side failing
     must never block the other, and the visitor always gets success for
     valid input. */
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('leads').insert({
      name,
      email: emailValue,
      phone,
      service,
      message,
      source: 'website',
    })
    if (error) console.error('Contact lead insert failed:', error)
  } catch (error) {
    console.error('Contact lead insert failed:', error)
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Brushly Website <hello@brushly.uk>',
      to: 'hello@brushly.uk',
      ...(emailValue ? { replyTo: emailValue } : {}),
      subject: `New Quote Request — ${service}`,
      html: `
        <h2>New Quote Request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${emailValue ? escapeHtml(emailValue) : 'Not provided'}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Service</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(service)}</td></tr>
        </table>
        <h3 style="margin-top:20px;">Message</h3>
        <p style="white-space:pre-wrap;background:#f9f9f9;padding:16px;border-radius:4px;">${escapeHtml(message)}</p>
      `,
    })
  } catch (error) {
    console.error('Contact email failed:', error)
  }

  return NextResponse.json({ success: true })
}
