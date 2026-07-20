import { z } from 'zod'

/* Reject control chars / newlines so nothing can be smuggled into an email
   header (same discipline as src/app/api/contact/route.ts). */
const singleLine = z.string().min(1).max(2000).regex(/^[^\r\n]+$/, 'Invalid value')

const sessionId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Invalid session')

export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const UPLOAD_EXT: Record<(typeof ALLOWED_UPLOAD_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const uploadUrlSchema = z.object({
  sessionId,
  contentType: z.enum(ALLOWED_UPLOAD_TYPES),
})

export const renderSchema = z.object({
  sessionId,
  sourcePath: z.string().min(1).max(300).regex(/^[A-Za-z0-9/_.-]+$/, 'Invalid path'),
  service: z.enum(['interior', 'exterior', 'wallpaper', 'finish']),
  colorId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Invalid colour'),
  finish: z.string().min(1).max(64).optional(),
  // Customer-supplied wallpaper reference (service 'wallpaper' only): an
  // uploaded photo/screenshot of the wallpaper to apply, session-scoped like
  // sourcePath.
  wallpaperPath: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[A-Za-z0-9/_.-]+$/, 'Invalid path')
    .optional(),
  // Interior only: explicit opt-in to paint the ceiling the wall colour.
  paintCeiling: z.boolean().optional(),
})

/* Staff (native app) attaching a finished render to a CRM lead. */
export const attachRenderSchema = z.object({
  renderId: z.string().uuid(),
  leadId: z.string().uuid(),
})

export const leadSchema = z.object({
  sessionId,
  name: singleLine,
  // Phone-first (mirrors contact form): phone required, email optional.
  email: z
    .union([z.literal(''), singleLine.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email')])
    .optional()
    .nullable(),
  phone: singleLine.max(50),
  consent: z.literal(true),
  renderIds: z.array(z.string().uuid()).max(20).optional(),
  message: z.string().max(2000).optional(),
  // Explicit business ask: 'quote_request' = "quote me this room" from the
  // result screen. Absent = save-only submission (existing behaviour).
  intent: z.enum(['quote_request']).optional(),
  // The render on screen when the quote was requested — drives the colour /
  // finish details in the notification email. Session-scoped server-side.
  quoteRenderId: z.string().uuid().optional(),
  // Honeypot: real users never fill this; bots do. Must be empty.
  company: z.string().max(0).optional(),
})

/* One-tap quote request from a visitor who already passed the gate this
   session: upgrades the lead created earlier instead of showing a second
   form. The unguessable lead uuid (only ever returned to the creating
   client) is the proof of ownership. */
export const quoteRequestSchema = z.object({
  sessionId,
  leadId: z.string().uuid(),
  renderIds: z.array(z.string().uuid()).max(20).optional(),
  quoteRenderId: z.string().uuid().optional(),
})

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>
export type RenderInput = z.infer<typeof renderSchema>
export type LeadInput = z.infer<typeof leadSchema>
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>
