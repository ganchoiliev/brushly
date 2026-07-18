import type { VisualizerService } from '@/lib/supabase/types'
import { PALETTE } from '@/lib/visualizer/palette'

/* The "your colour preview" email a gated visitor receives with their saved
   render attached. Pure templating only — no 'server-only', no secrets — so
   it stays unit-testable; the storage download and Resend call live in
   renderDelivery.ts. Same deliverability discipline as the quote/invoice
   emails (src/lib/admin/email/templates.ts): multipart HTML + text, system
   fonts, tables and inline styles, plain-text wordmark, no links — the
   render image travels as an inline CID attachment, never a remote URL
   (stored photos are deleted after 30 days; the email must outlive that). */

const GOLD = '#C8A96E'
const CHARCOAL = '#151515'
const INK = '#1A1A1A'
const MUTED = '#6B6B66'
const RULE = '#E5E0D8'
const PAPER = '#FAF8F4'

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** cid: reference shared between the HTML body and the attachment entry. */
export const RENDER_ATTACHMENT_CID = 'brushly-render-preview'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

/* What the render actually recolours per service (SERVICE_SURFACES is the
   long prompt wording; these are the subject-line nouns). */
const SUBJECT_NOUN: Record<VisualizerService, string> = {
  interior: 'walls',
  exterior: 'home',
  wallpaper: 'feature wall',
  finish: 'feature wall',
}

/* The render row stores label + hex but not brand — recover it from the
   palette. Labels are unique in practice; hex breaks the tie if two brands
   ever share one. Null when the label no longer matches (palette drift):
   the email then simply omits the brand line rather than guessing. */
export function resolveBrand(label: string | null, hex: string | null): string | null {
  if (!label) return null
  const norm = label.trim().toLowerCase()
  const matches = PALETTE.filter((c) => c.label.toLowerCase() === norm)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0].brand
  const byHex = hex ? matches.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) : null
  return (byHex ?? matches[0]).brand
}

/** "brushly-preview-green-smoke.jpg" — the filename shown in the client. */
export function deliveryAttachmentFilename(
  colorLabel: string | null,
  customWallpaper: boolean,
  ext: string,
): string {
  const slug = customWallpaper
    ? 'your-wallpaper'
    : (colorLabel ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
  return `${['brushly-preview', slug].filter(Boolean).join('-')}.${ext}`
}

export interface RenderDeliveryEmailInput {
  /** The name they typed into the gate — greeted by first name. */
  name: string
  service: VisualizerService
  colorLabel: string | null
  colorHex: string | null
  finish: string | null
  /** Render was driven by their own uploaded wallpaper — the stored colour
      is the internal fallback swatch, so never present it as their pick. */
  customWallpaper: boolean
  company: {
    name: string
    companyNumber: string
    address: string
    phone: string
    email: string
  }
}

export function buildRenderDeliveryEmail(input: RenderDeliveryEmailInput): {
  subject: string
  html: string
  text: string
} {
  const { name, service, colorLabel, colorHex, finish, customWallpaper, company } = input
  const noun = SUBJECT_NOUN[service]
  const brand = customWallpaper ? null : resolveBrand(colorLabel, colorHex)

  const subject = customWallpaper
    ? `Your wallpaper preview - your own wallpaper on your ${noun}`
    : `Your colour preview - ${colorLabel ?? 'your new colour'} on your ${noun}`

  const previewWord = customWallpaper ? 'wallpaper' : 'colour'
  const intro = `Here's the ${previewWord} preview you saved — the full-size image is attached to this email, yours to keep.`
  const softLine = `If you'd like this ${customWallpaper ? 'wallpaper' : 'finish'} for real, we'll give you a fixed quote — just reply or call ${company.phone}.`

  /* Footer caption matches the quote/invoice emails, but segments only
     appear when settings carry them (dev fallbacks leave them blank). */
  const caption = [
    company.name,
    ...(company.companyNumber
      ? ['Registered in England & Wales', `Company No. ${company.companyNumber}`]
      : []),
    ...(company.address ? [`Registered office: ${company.address}`] : []),
  ].join(' · ')

  const factRow = (label: string, value: string) => `
        <tr>
          <td style="padding:6px 16px;font-family:${FONT};font-size:13px;color:${MUTED};white-space:nowrap;">${escapeHtml(label)}</td>
          <td align="right" style="padding:6px 16px;font-family:${FONT};font-size:13px;color:${INK};">${value}</td>
        </tr>`

  /* The hex comes from our own palette via the render row, but only ever
     reaches a style attribute when it still looks like a colour. */
  const safeHex = colorHex && /^#[0-9a-fA-F]{3,8}$/.test(colorHex) ? colorHex : null
  const swatch = safeHex
    ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid ${RULE};vertical-align:middle;margin-right:6px;background:${safeHex};"></span>`
    : ''

  let lookRows = ''
  const textFacts: string[] = []
  if (customWallpaper) {
    lookRows += factRow('Wallpaper', escapeHtml('Your own wallpaper (uploaded)'))
    textFacts.push('Wallpaper: Your own wallpaper (uploaded)')
  } else {
    if (colorLabel) {
      lookRows += factRow('Colour', `${swatch}${escapeHtml(colorLabel)}`)
      textFacts.push(`Colour: ${colorLabel}`)
    }
    if (brand) {
      lookRows += factRow('Brand', escapeHtml(brand))
      textFacts.push(`Brand: ${brand}`)
    }
    if (finish) {
      lookRows += factRow('Finish', escapeHtml(finish))
      textFacts.push(`Finish: ${finish}`)
    }
  }

  const factsBlock = lookRows
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border:1px solid ${RULE};border-collapse:separate;">
        ${lookRows}
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)} — ${escapeHtml(company.name)}</title>
</head>
<body style="margin:0;padding:0;background:#EFEAE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE3;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${RULE};">
          <tr>
            <td style="background:${CHARCOAL};padding:20px 32px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:6px;color:${GOLD};">BRUSHLY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px;">
              <p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">Hi ${escapeHtml(firstName(name))},</p>
              <p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <img src="cid:${RENDER_ATTACHMENT_CID}" alt="Your saved preview" width="494" style="display:block;width:100%;max-width:494px;height:auto;border:1px solid ${RULE};" />
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              ${factsBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(softLine)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">The Brushly team</p>
              <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(company.email)} · ${escapeHtml(company.phone)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 18px;border-top:1px solid ${RULE};">
              <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.6;color:${MUTED};">${escapeHtml(caption)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `Hi ${firstName(name)},`,
    '',
    intro,
    '',
    ...textFacts,
    ...(textFacts.length > 0 ? [''] : []),
    softLine,
    '',
    'The Brushly team',
    `${company.email} · ${company.phone}`,
    '',
    caption,
  ].join('\n')

  return { subject, html, text }
}
