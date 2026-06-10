import Link from 'next/link'
import { Display } from '@/components/admin/Type'

/* Sticky top bar: page title (display face, gold terminal period) + at most
   ONE primary action — the gold button (§1.9). Detail screens that render a
   document number instead of a word pass period={false}. */
export default function PageHeader({
  title,
  action,
  period = true,
  children,
}: {
  title: string
  action?: { href: string; label: string }
  period?: boolean
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-admin-hairline bg-admin-canvas/95 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <Display period={period} className="truncate">
          {title}
        </Display>
        {action && (
          <Link
            href={action.href}
            className="flex h-11 shrink-0 items-center rounded-sm bg-brushly-gold px-5 font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
          >
            {action.label}
          </Link>
        )}
        {children}
      </div>
    </header>
  )
}
