const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

/* The single money formatter — everything stores integer pence. */
export function formatGBP(pence: number): string {
  return gbp.format(pence / 100)
}

const pounds = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/* Money inputs on blur: "1,250.50" with no symbol — the £ is rendered
   as a prefix outside the value, and parseGBPToPence round-trips it. */
export function formatPounds(pence: number): string {
  return pounds.format(pence / 100)
}

/* "204455" → "20-44-55" for the settings field and anywhere a sort code
   is shown; leaves anything that isn't 6 digits untouched. */
export function formatSortCode(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 6) return raw
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`
}

/* "1,250.50" -> 125050. Returns null for anything that isn't money. */
export function parseGBPToPence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(parseFloat(cleaned) * 100)
}

/* Detail screens and PDFs: "9 June 2026" (§1). */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  })
}

/* Lists and compact rows: "Mon 9 Jun" (§1). */
export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/London',
  })
}

/* "2h ago", "3 days ago" — for lead ages and activity feeds. Minutes and
   hours stay compact; days and months are words a decorator would say. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

/* YYYY-MM-DD in Europe/London — date columns must not drift at BST edges. */
export function todayLondon(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/* Overdue is computed, never stored: a sent invoice past its due date
   shows as overdue everywhere (§5.5). */
export function effectiveInvoiceStatus(
  status: string,
  dueDate: string | null
): string {
  if (status === 'sent' && dueDate && dueDate < todayLondon()) return 'overdue'
  return status
}

/* Same pattern for quotes (§4): sent and past valid-until shows as
   expired in lists and detail — computed at read time, never stored. */
export function effectiveQuoteStatus(
  status: string,
  validUntil: string | null
): string {
  if (status === 'sent' && validUntil && validUntil < todayLondon()) return 'expired'
  return status
}

/* "2026-06-11" + 9 → the ISO instant of 09:00 London wall time that day
   (BST-safe: tries both offsets and keeps the one that reads back right). */
export function londonTime(dateIso: string, hour: number): string {
  const hh = String(hour).padStart(2, '0')
  for (const off of ['+01:00', '+00:00']) {
    const d = new Date(`${dateIso}T${hh}:00:00${off}`)
    const wall = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(d)
    if (Number(wall) === hour) return d.toISOString()
  }
  return new Date(`${dateIso}T${hh}:00:00Z`).toISOString()
}

/* "due today" / "due yesterday" / "3 days overdue" for follow-up rows. */
export function followUpDueLabel(followUpAt: string): string {
  const due = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
  }).format(new Date(followUpAt))
  const today = todayLondon()
  if (due >= today) return 'due today'
  const days = Math.round(
    (new Date(`${today}T12:00:00Z`).getTime() - new Date(`${due}T12:00:00Z`).getTime()) /
      86400000
  )
  return days === 1 ? 'due yesterday' : `${days} days overdue`
}

export function quoteRef(n: number): string {
  return `QU-${String(n).padStart(4, '0')}`
}

export function invoiceRef(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`
}
