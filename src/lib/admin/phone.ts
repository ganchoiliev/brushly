/* "07712 345678" -> "447712345678" for wa.me links. Returns null when the
   number can't be made into something WhatsApp would accept. */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `44${digits.slice(1)}`
  if (digits.length >= 10) return digits
  return null
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/* E.164 for Twilio ("07712 345678" -> "+447712345678"). UK numbers must be a
   MOBILE (447 + 9 digits) to receive SMS — landlines (01…, 02…) return null so
   the caller can skip them. Already-international (+…) numbers pass through if
   plausibly long. Returns null when there's nothing textable. */
export function toE164(phone: string | null): string | null {
  if (!phone) return null
  const raw = phone.replace(/[^\d+]/g, '')
  let digits: string
  if (raw.startsWith('+')) digits = raw.slice(1)
  else if (raw.startsWith('00')) digits = raw.slice(2)
  else if (raw.startsWith('0')) digits = `44${raw.slice(1)}`
  else digits = raw
  // UK: only mobiles (447xxxxxxxxx) can take a text.
  if (digits.startsWith('44') && !/^447\d{9}$/.test(digits)) return null
  if (digits.length < 10 || digits.length > 15) return null
  return `+${digits}`
}
