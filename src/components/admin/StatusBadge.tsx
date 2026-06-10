/* Plain-English status labels with the §4 status palette. Badges and
   borders only — never fills. */

const STYLES: Record<string, string> = {
  green: 'border-status-green/40 text-status-green',
  amber: 'border-status-amber/40 text-status-amber',
  red: 'border-status-red/40 text-status-red',
  neutral: 'border-white/15 text-brushly-cream/70',
  muted: 'border-white/10 text-admin-muted',
}

export const LEAD_STATUS: Record<string, { label: string; tone: keyof typeof STYLES }> = {
  new: { label: 'New', tone: 'amber' },
  contacted: { label: 'Contacted', tone: 'neutral' },
  quoted: { label: 'Quoted', tone: 'amber' },
  won: { label: 'Won', tone: 'green' },
  lost: { label: 'Lost', tone: 'red' },
  spam: { label: 'Spam', tone: 'muted' },
}

export const QUOTE_STATUS: Record<string, { label: string; tone: keyof typeof STYLES }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
  expired: { label: 'Expired', tone: 'muted' },
}

export const INVOICE_STATUS: Record<string, { label: string; tone: keyof typeof STYLES }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'amber' },
  paid: { label: 'Paid', tone: 'green' },
  overdue: { label: 'Overdue', tone: 'red' },
  void: { label: 'Void', tone: 'muted' },
}

export default function StatusBadge({
  map,
  status,
}: {
  map: Record<string, { label: string; tone: keyof typeof STYLES }>
  status: string
}) {
  const def = map[status] ?? { label: status, tone: 'neutral' as const }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-body text-[11px] font-medium uppercase tracking-wider ${STYLES[def.tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {def.label}
    </span>
  )
}
