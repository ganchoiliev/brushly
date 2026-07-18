import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { VisualizerService } from '@/lib/supabase/types'
import { SERVICE_LABELS } from '@/lib/visualizer/palette'

/* Quote-request notification pieces, shared by the two submission paths:
   the gate form (new lead, /api/visualizer/lead) and the one-tap upgrade of
   an existing lead (/api/visualizer/quote). Both must produce the same
   email — the distinct subject is what keeps quote requests from being
   read as save-only leads. */

type AdminClient = ReturnType<typeof createAdminClient>

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const SITE_URL = (process.env.SITE_URL || 'https://brushly.uk').replace(/\/+$/, '')

export interface QuoteRenderDetails {
  service: VisualizerService
  colorLabel: string | null
  colorHex: string | null
  finish: string | null
  /** Render was driven by the customer's own uploaded wallpaper — the stored
      colour is the internal fallback swatch, not something they chose. */
  customWallpaper: boolean
}

/* Session-scoped on purpose: a caller can only decorate the email with a
   render their own session produced, never another visitor's. */
export async function fetchQuoteRenderDetails(
  supabase: AdminClient,
  renderId: string,
  sessionId: string,
): Promise<QuoteRenderDetails | null> {
  const { data, error } = await supabase
    .from('visualizer_renders')
    .select('service, color_label, color_hex, finish, prompt')
    .eq('id', renderId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) console.error('quote render details fetch failed:', error)
  if (!data) return null
  return {
    service: data.service,
    colorLabel: data.color_label,
    colorHex: data.color_hex,
    finish: data.finish,
    customWallpaper: Boolean(data.prompt?.includes('[wallpaper:')),
  }
}

/** One line for the lead's message field, e.g.
    "Requested a fixed quote — Interior painting, Green Smoke, Matte emulsion." */
export function buildQuoteMessage(details: QuoteRenderDetails | null): string {
  if (!details) return 'Requested a fixed quote from the AI Visualizer.'
  const look = details.customWallpaper
    ? 'their own wallpaper'
    : [details.colorLabel, details.finish].filter(Boolean).join(', ')
  return `Requested a fixed quote — ${SERVICE_LABELS[details.service]}${look ? `, ${look}` : ''}.`
}

const cell = 'padding:8px 12px;border-bottom:1px solid #eee;'
const row = (label: string, value: string) =>
  `<tr><td style="${cell}font-weight:bold;">${label}</td><td style="${cell}">${value}</td></tr>`

export function buildQuoteRequestEmail(input: {
  name: string
  phone: string | null
  email: string | null
  leadId: string | null
  renderCount: number
  details: QuoteRenderDetails | null
}): { subject: string; html: string } {
  const { name, phone, email, leadId, renderCount, details } = input

  let lookRows = ''
  if (details) {
    lookRows += row('Room / service', escapeHtml(SERVICE_LABELS[details.service]))
    if (details.customWallpaper) {
      lookRows += row('Colour', 'Their own wallpaper (uploaded)')
    } else {
      // The hex comes from our own palette via the render row, but only ever
      // inject it into a style attribute when it still looks like a colour.
      const hex = details.colorHex && /^#[0-9a-fA-F]{3,8}$/.test(details.colorHex)
        ? details.colorHex
        : null
      const swatch = hex
        ? `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid #ddd;vertical-align:middle;margin-right:6px;background:${hex};"></span>`
        : ''
      lookRows += row(
        'Colour',
        `${swatch}${escapeHtml(details.colorLabel ?? 'Not recorded')}${hex ? ` <span style="color:#888;">(${hex})</span>` : ''}`,
      )
      lookRows += row('Finish', details.finish ? escapeHtml(details.finish) : 'Not specified')
    }
  }

  const adminLink = leadId
    ? `<p style="margin-top:16px;"><a href="${SITE_URL}/admin/leads/${leadId}">Open this lead in admin</a> — their renders are attached there.</p>`
    : `<p style="margin-top:16px;color:#b00;">The lead record could not be created — reply to this email or call them back directly.</p>`

  return {
    subject: `QUOTE REQUEST from Visualizer - ${name}`,
    html: `
      <h2>Quote request from the AI Visualizer</h2>
      <p>They tapped “Get a fixed quote for this room” on a finished render.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        ${row('Name', escapeHtml(name))}
        ${row('Phone', phone ? escapeHtml(phone) : 'Not provided')}
        ${row('Email', email ? escapeHtml(email) : 'Not provided')}
        ${lookRows}
      </table>
      <p style="color:#888;font-size:13px;margin-top:12px;">Renders this session: ${renderCount}.</p>
      ${adminLink}
    `,
  }
}
