/**
 * Google Ads (gtag.js) helpers.
 *
 * The base tag, dataLayer and Consent Mode v2 defaults are injected once in
 * the root layout (src/app/layout.tsx). These helpers are safe to call from
 * any client component: they no-op on the server and before gtag has loaded.
 */

export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18219517523'

/**
 * Google Ads conversion labels, read from env. These may be unset until the
 * conversion actions are created in the Ads account — trackConversion() guards
 * against undefined, so wiring can ship before the labels exist.
 */
export const CONV_LABELS = {
  phone: process.env.NEXT_PUBLIC_CONV_PHONE,
  whatsapp: process.env.NEXT_PUBLIC_CONV_WHATSAPP,
  form: process.env.NEXT_PUBLIC_CONV_FORM,
} as const

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFn
  }
}

function getGtag(): GtagFn | null {
  if (typeof window === 'undefined') return null
  return typeof window.gtag === 'function' ? window.gtag : null
}

/** Fire a named gtag event. No-op on the server and until gtag.js has loaded. */
export function trackEvent(name: string): void {
  const gtag = getGtag()
  if (!gtag) return
  gtag('event', name)
}

/**
 * Fire a Google Ads conversion for the given label.
 *
 * When a `label` is configured, sends the targeted conversion
 * (`send_to: ADS_ID/label`). When it is undefined this is a no-op — the
 * descriptive named event is always fired separately via trackEvent() at the
 * call site, so events still flow before the conversion labels are set up.
 */
export function trackConversion(label?: string): void {
  const gtag = getGtag()
  if (!gtag) return
  if (label) {
    gtag('event', 'conversion', { send_to: `${ADS_ID}/${label}` })
  }
}
