const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

/* The single money formatter — everything stores integer pence. */
export function formatGBP(pence: number): string {
  return gbp.format(pence / 100)
}

/* "1,250.50" -> 125050. Returns null for anything that isn't money. */
export function parseGBPToPence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(parseFloat(cleaned) * 100)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  })
}

/* "2h ago", "3d ago" — for lead ages and activity feeds. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function quoteRef(n: number): string {
  return `QU-${String(n).padStart(4, '0')}`
}

export function invoiceRef(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`
}
