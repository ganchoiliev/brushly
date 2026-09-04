/**
 * First-touch attribution, best-effort, session-scoped.
 *
 * Captured once on first paint (MarketingChrome), read back when a lead form
 * posts so /api/contact can derive `source: 'ads'` from a gclid instead of
 * hardcoding 'website' for every channel. Never load-bearing: every call is
 * wrapped, and a missing stamp simply means "website".
 */
const KEY = 'brushly_attr'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'] as const

export type Attribution = Partial<
  Record<(typeof FIELDS)[number] | 'referrer' | 'landing_path', string>
>

/** First-touch wins: an existing stamp is never overwritten. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(KEY)) return
    const q = new URLSearchParams(window.location.search)
    const attr: Attribution = {}
    for (const f of FIELDS) {
      const v = q.get(f)
      if (v) attr[f] = v.slice(0, 200)
    }
    if (document.referrer && !document.referrer.includes(location.host)) {
      attr.referrer = document.referrer.slice(0, 500)
    }
    attr.landing_path = window.location.pathname.slice(0, 200)
    sessionStorage.setItem(KEY, JSON.stringify(attr))
  } catch {
    /* private mode / storage blocked — attribution is optional */
  }
}

export function readAttribution(): Attribution {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') as Attribution
  } catch {
    return {}
  }
}
