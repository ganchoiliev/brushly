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
