import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional().nullable(),
  service: z.string().min(1),
  message: z.string().min(1),
})

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

  /* Store the lead and send the email independently: one side failing
     must never block the other, and the visitor always gets success for
     valid input. */
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('leads').insert({
      name,
      email,
      phone: phone || null,
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
      replyTo: email,
      subject: `New Quote Request — ${service}`,
      html: `
        <h2>New Quote Request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${name}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${email}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${phone || 'Not provided'}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;border-bottom:1px solid #eee;">Service</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${service}</td></tr>
        </table>
        <h3 style="margin-top:20px;">Message</h3>
        <p style="white-space:pre-wrap;background:#f9f9f9;padding:16px;border-radius:4px;">${message}</p>
      `,
    })
  } catch (error) {
    console.error('Contact email failed:', error)
  }

  return NextResponse.json({ success: true })
}
