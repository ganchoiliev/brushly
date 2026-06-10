import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/* Every empty list teaches the next step in one sentence (§1.9). */
export default function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: LucideIcon
  message: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-admin-card">
        <Icon className="h-6 w-6 text-admin-muted" strokeWidth={1.6} />
      </span>
      <p className="mt-5 max-w-xs font-body text-[15px] leading-relaxed text-admin-muted">
        {message}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 flex h-12 items-center rounded-sm bg-brushly-gold px-6 font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
