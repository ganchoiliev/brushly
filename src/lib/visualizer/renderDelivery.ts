import 'server-only'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { VisualizerRender } from '@/lib/supabase/types'
import { downloadAsBase64 } from '@/lib/visualizer/storage'
import {
  RENDER_ATTACHMENT_CID,
  buildRenderDeliveryEmail,
  deliveryAttachmentFilename,
} from '@/lib/visualizer/deliveryEmail'

/* Transactional delivery of a saved render to the customer who just passed
   the gate. The image travels as an attachment, not a signed link — stored
   photos are deleted after 30 days (the gate small print) and the email must
   outlive that. Strictly one email per render, ever: customer_email_sent_at
   is claimed atomically BEFORE the send, so a duplicate submit (or a race
   between two) skips instead of double-sending, and a failed send is logged
   by the caller but never retried. No list signup, no follow-up sequence. */

const FROM = 'Brushly <hello@brushly.uk>'
const REPLY_TO = 'hello@brushly.uk'

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type DeliverableRender = Pick<
  VisualizerRender,
  | 'id'
  | 'service'
  | 'color_label'
  | 'color_hex'
  | 'finish'
  | 'prompt'
  | 'result_path'
  | 'customer_email_sent_at'
>

const RENDER_COLUMNS =
  'id, service, color_label, color_hex, finish, prompt, result_path, customer_email_sent_at'

export async function sendRenderDeliveryEmail(input: {
  sessionId: string
  name: string
  email: string
  renderIds: string[]
  /** The render on screen when they submitted (quote flow) — featured over
      the newest one when present. */
  preferredRenderId?: string | null
}): Promise<void> {
  const { sessionId, name, email, renderIds, preferredRenderId } = input
  const supabase = createAdminClient()

  /* Pick "their saved render": the one on screen when they asked, otherwise
     the newest finished one. Session-scoped so a forged id can never mail
     out another visitor's photo. */
  let render: DeliverableRender | null = null
  if (preferredRenderId) {
    const { data, error } = await supabase
      .from('visualizer_renders')
      .select(RENDER_COLUMNS)
      .eq('id', preferredRenderId)
      .eq('session_id', sessionId)
      .eq('status', 'done')
      .not('result_path', 'is', null)
      .maybeSingle()
    if (error) throw new Error(`render lookup failed: ${error.message}`)
    render = data
  }
  if (!render && renderIds.length > 0) {
    const { data, error } = await supabase
      .from('visualizer_renders')
      .select(RENDER_COLUMNS)
      .in('id', renderIds)
      .eq('session_id', sessionId)
      .eq('status', 'done')
      .not('result_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw new Error(`render lookup failed: ${error.message}`)
    render = data?.[0] ?? null
  }
  if (!render?.result_path) return
  if (render.customer_email_sent_at) return // already delivered — dedupe per render id

  /* At-most-once claim: only the update that flips NULL → now() may send. */
  const { data: claimed, error: claimError } = await supabase
    .from('visualizer_renders')
    .update({ customer_email_sent_at: new Date().toISOString() })
    .eq('id', render.id)
    .is('customer_email_sent_at', null)
    .select('id')
  if (claimError) throw new Error(`delivery claim failed: ${claimError.message}`)
  if (!claimed || claimed.length === 0) return // a concurrent submit won the race

  /* Same best-effort settings read (and fallbacks) as the public quote
     acceptance path — the footer must match the other customer emails. */
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
    email: settings?.email ?? REPLY_TO,
  }

  const image = await downloadAsBase64(render.result_path)
  const customWallpaper = Boolean(render.prompt?.includes('[wallpaper:'))
  const { subject, html, text } = buildRenderDeliveryEmail({
    name,
    service: render.service,
    colorLabel: render.color_label,
    colorHex: render.color_hex,
    finish: render.finish,
    customWallpaper,
    company,
  })

  const ext = EXT_BY_MIME[image.mimeType] ?? 'jpg'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject,
    html,
    text,
    attachments: [
      {
        filename: deliveryAttachmentFilename(render.color_label, customWallpaper, ext),
        content: image.base64,
        contentType: image.mimeType,
        contentId: RENDER_ATTACHMENT_CID,
      },
    ],
  })
  if (sendError) throw new Error(`resend send failed: ${sendError.message}`)
}
