'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Phone,
  FileText,
  Receipt,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import useReducedMotion from '@/hooks/useReducedMotion'
import { formatGBP } from '@/lib/admin/format'

const ICONS = {
  phone: Phone,
  quote: FileText,
  invoice: Receipt,
  trophy: Trophy,
} as const

/* Dashboard stat card (§2.2): small icon, title + subtitle, big numeral
   with a ≤400ms count-up, and a trend delta vs the prior period. The server
   passes raw numbers (pence for money) so the count-up can interpolate and
   format per frame. */
export default function StatCard({
  title,
  subtitle,
  icon,
  kind,
  value,
  prior,
  deltaLabel,
  gold,
  href,
}: {
  title: string
  subtitle: string
  icon: keyof typeof ICONS
  kind: 'count' | 'money'
  value: number
  /* Same metric for the prior period; null hides the delta line. */
  prior: number | null
  deltaLabel: string
  gold?: boolean
  href: string
}) {
  const Icon = ICONS[icon]
  const display = useCountUp(value, kind)
  const delta = prior === null ? null : value - prior

  return (
    <Link
      href={href}
      className="rounded-sm border border-admin-hairline bg-admin-card p-3 transition-colors hover:bg-admin-raised lg:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-body text-[11px] font-medium uppercase leading-tight tracking-wider text-admin-text/80">
            {title}
          </p>
          <p className="font-body text-[12px] leading-snug tabular-nums text-admin-muted">
            {subtitle}
          </p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-admin-muted" strokeWidth={1.8} />
      </div>
      <p
        className={`mt-2 font-body text-2xl font-semibold tabular-nums ${
          gold ? 'text-brushly-gold' : 'text-admin-text'
        }`}
      >
        {display}
      </p>
      {delta !== null && (
        <p
          className={`mt-1 flex items-center gap-1 font-body text-[12px] leading-snug tabular-nums ${
            delta > 0
              ? 'text-status-green/80'
              : delta < 0
                ? 'text-status-red/80'
                : 'text-admin-muted'
          }`}
        >
          {delta > 0 ? (
            <ArrowUp className="h-3 w-3" />
          ) : delta < 0 ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {delta === 0
            ? `no change ${deltaLabel}`
            : `${formatStat(Math.abs(delta), kind)} ${deltaLabel}`}
        </p>
      )}
    </Link>
  )
}

function formatStat(n: number, kind: 'count' | 'money'): string {
  return kind === 'money' ? formatGBP(n) : String(n)
}

/* Count up from 0 over 400ms with ease-out; reduced motion renders the
   final value immediately (no setState outside the animation frames). */
function useCountUp(target: number, kind: 'count' | 'money'): string {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (reduced || target === 0) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / 400, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])

  return formatStat(reduced ? target : shown, kind)
}
