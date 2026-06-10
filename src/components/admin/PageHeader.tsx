import Link from 'next/link'

/* Sticky top bar: page title (display face) + at most ONE primary action —
   the gold button (§1.9). */
export default function PageHeader({
  title,
  action,
  children,
}: {
  title: string
  action?: { href: string; label: string }
  children?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-brushly-charcoal/95 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <h1 className="truncate font-display text-2xl font-light md:text-3xl">
          {title}
        </h1>
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
