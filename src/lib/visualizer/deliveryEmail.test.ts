import { describe, expect, it } from 'vitest'
import {
  RENDER_ATTACHMENT_CID,
  buildRenderDeliveryEmail,
  deliveryAttachmentFilename,
  resolveBrand,
} from './deliveryEmail'

const company = {
  name: 'Brushly',
  companyNumber: '12345678',
  address: '1 Test Lane, Reigate',
  phone: '01737 479 161',
  email: 'hello@brushly.uk',
}

const base = {
  name: 'Elizabeth Harper',
  service: 'interior' as const,
  colorLabel: 'Green Smoke',
  colorHex: '#6F7B71',
  finish: 'Matte emulsion',
  customWallpaper: false,
  company,
}

describe('buildRenderDeliveryEmail', () => {
  it('names the colour and the painted surface in the subject', () => {
    expect(buildRenderDeliveryEmail(base).subject).toBe(
      'Your colour preview - Green Smoke on your walls',
    )
    expect(buildRenderDeliveryEmail({ ...base, service: 'exterior' }).subject).toBe(
      'Your colour preview - Green Smoke on your home',
    )
    expect(buildRenderDeliveryEmail({ ...base, service: 'wallpaper' }).subject).toBe(
      'Your colour preview - Green Smoke on your feature wall',
    )
  })

  it('carries colour, brand and finish as text in both parts', () => {
    const { html, text } = buildRenderDeliveryEmail(base)
    expect(html).toContain('Green Smoke')
    expect(html).toContain('Farrow &amp; Ball')
    expect(html).toContain('Matte emulsion')
    expect(text).toContain('Colour: Green Smoke')
    expect(text).toContain('Brand: Farrow & Ball')
    expect(text).toContain('Finish: Matte emulsion')
  })

  it('greets by first name and references the inline attachment', () => {
    const { html, text } = buildRenderDeliveryEmail(base)
    expect(html).toContain('Hi Elizabeth,')
    expect(html).toContain(`cid:${RENDER_ATTACHMENT_CID}`)
    expect(text).toContain('attached')
  })

  it('closes with the soft quote line and no links', () => {
    const { html, text } = buildRenderDeliveryEmail(base)
    const soft =
      "If you'd like this finish for real, we'll give you a fixed quote — just reply or call 01737 479 161."
    expect(text).toContain(soft)
    expect(html).toContain('just reply or call')
    expect(html).not.toContain('<a ')
  })

  it('keeps the brand footer consistent with the other customer emails', () => {
    const { html, text } = buildRenderDeliveryEmail(base)
    expect(html).toContain('BRUSHLY')
    expect(text).toContain(
      'Brushly · Registered in England & Wales · Company No. 12345678 · Registered office: 1 Test Lane, Reigate',
    )
  })

  it('drops the registration segments when settings are blank', () => {
    const { text } = buildRenderDeliveryEmail({
      ...base,
      company: { ...company, companyNumber: '', address: '' },
    })
    expect(text).not.toContain('Company No.')
    expect(text).not.toContain('Registered in England')
  })

  it('never presents the fallback swatch as a chosen colour on wallpaper uploads', () => {
    const { subject, html, text } = buildRenderDeliveryEmail({
      ...base,
      service: 'wallpaper',
      customWallpaper: true,
    })
    expect(subject).toBe('Your wallpaper preview - your own wallpaper on your feature wall')
    expect(html).toContain('Your own wallpaper (uploaded)')
    expect(html).not.toContain('Green Smoke')
    expect(text).toContain("If you'd like this wallpaper for real")
  })

  it('omits finish and brand rows when unknown', () => {
    const { html, text } = buildRenderDeliveryEmail({
      ...base,
      colorLabel: 'Not In Palette',
      finish: null,
    })
    expect(html).not.toContain('Brand')
    expect(html).not.toContain('Finish')
    expect(text).toContain('Colour: Not In Palette')
  })

  it('escapes labels and refuses non-colour hex in the swatch style', () => {
    const { html } = buildRenderDeliveryEmail({
      ...base,
      colorLabel: '<b>Sneaky</b>',
      colorHex: 'javascript:alert(1)',
    })
    expect(html).toContain('&lt;b&gt;Sneaky&lt;/b&gt;')
    expect(html).not.toContain('<b>Sneaky</b>')
    expect(html).not.toContain('javascript:alert')
  })
})

describe('resolveBrand', () => {
  it('recovers the brand from the palette by label', () => {
    expect(resolveBrand('Green Smoke', '#6F7B71')).toBe('Farrow & Ball')
    expect(resolveBrand('green smoke', null)).toBe('Farrow & Ball')
  })

  it('returns null for labels the palette no longer carries', () => {
    expect(resolveBrand('Mystery Colour', '#123456')).toBeNull()
    expect(resolveBrand(null, '#6F7B71')).toBeNull()
  })
})

describe('deliveryAttachmentFilename', () => {
  it('slugs the colour label into the filename', () => {
    expect(deliveryAttachmentFilename('Green Smoke', false, 'jpg')).toBe(
      'brushly-preview-green-smoke.jpg',
    )
    expect(deliveryAttachmentFilename(null, false, 'png')).toBe('brushly-preview.png')
    expect(deliveryAttachmentFilename('Green Smoke', true, 'webp')).toBe(
      'brushly-preview-your-wallpaper.webp',
    )
  })
})
