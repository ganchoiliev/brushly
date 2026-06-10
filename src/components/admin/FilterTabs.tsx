import Link from 'next/link'

/* Horizontal scrollable status filter tabs — server component, filters via
   the URL so back/refresh keep state. */
export default function FilterTabs({
  basePath,
  current,
  tabs,
  searchQuery,
}: {
  basePath: string
  current: string
  tabs: { value: string; label: string; count?: number }[]
  searchQuery?: string
}) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {tabs.map((tab) => {
        const params = new URLSearchParams()
        if (tab.value !== 'all') params.set('status', tab.value)
        if (searchQuery) params.set('q', searchQuery)
        const qs = params.toString()
        const active = current === tab.value
        return (
          <Link
            key={tab.value}
            href={qs ? `${basePath}?${qs}` : basePath}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 font-body text-[13px] font-medium transition-colors ${
              active
                ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-gold'
                : 'border-white/10 text-brushly-cream/70 hover:border-white/25'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`font-body text-[11px] tabular-nums ${active ? 'text-brushly-gold/80' : 'text-admin-muted'}`}>
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
