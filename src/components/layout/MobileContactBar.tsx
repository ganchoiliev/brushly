'use client'

import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'

/* Site-wide tap-to-call + WhatsApp bar for paid mobile traffic. Pinned to the
   bottom on mobile only (md:hidden) so the call action is never buried below
   the fold. z-40 keeps it above page content but below the header (z-50) and
   the full-screen mobile nav overlay (z-45), so opening the menu hides it.

   The phone is the only number Brushly publishes; WhatsApp Business runs on the
   same line, hence wa.me/441737479161. Both fire the existing gtag helpers so
   Google Ads conversions keep counting (trackEvent for analytics, the named
   event always fires; trackConversion sends the Ads conversion once its label
   is configured). */

const PHONE = '+441737479161'
const WHATSAPP_HREF = 'https://wa.me/441737479161'

const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-[18px] w-[18px] shrink-0"
    aria-hidden="true"
  >
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-[18px] w-[18px] shrink-0"
    aria-hidden="true"
  >
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35ZM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.26A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-2.98-.4-4.27-1.16l-.3-.18-2.85.75.76-2.78-.2-.32A8.2 8.2 0 1 1 12 20.2Z" />
  </svg>
)

export default function MobileContactBar() {
  return (
    <nav
      aria-label="Quick contact"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brushly-gold/20 md:hidden"
    >
      <a
        href={`tel:${PHONE}`}
        onClick={() => {
          trackEvent('phone_click')
          trackConversion(CONV_LABELS.phone)
        }}
        className="flex min-h-[56px] flex-1 items-center justify-center gap-2 bg-brushly-gold px-4 pt-4 text-[13px] font-body font-semibold uppercase tracking-[0.12em] text-brushly-black transition-colors duration-300 active:bg-brushly-gold-dark"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <PhoneIcon />
        Call
      </a>
      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackEvent('whatsapp_click')
          trackConversion(CONV_LABELS.whatsapp)
        }}
        className="flex min-h-[56px] flex-1 items-center justify-center gap-2 border-l border-brushly-black/30 bg-brushly-black px-4 pt-4 text-[13px] font-body font-semibold uppercase tracking-[0.12em] text-brushly-cream transition-colors duration-300 active:bg-brushly-off-black"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
    </nav>
  )
}
