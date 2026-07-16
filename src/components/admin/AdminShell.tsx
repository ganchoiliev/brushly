'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Phone,
  FileText,
  Receipt,
  BookUser,
  Palette,
  Settings,
  Plus,
  Menu,
} from 'lucide-react'
import SignOutButton from '@/components/admin/SignOutButton'

const NAV = [
  { href: '/admin', label: 'Home', icon: Home },
  { href: '/admin/leads', label: 'Leads', icon: Phone },
  { href: '/admin/quotes', label: 'Quotes', icon: FileText },
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/admin/clients', label: 'Clients', icon: BookUser },
  { href: '/admin/visualizer', label: 'Visualizer', icon: Palette },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

/* Mobile bottom bar: the five places he actually goes, with "+ Lead" dead
   centre — the flagship add-a-lead-mid-call button (§1.9). */
const TABS = [
  NAV[0],
  NAV[1],
  null, // centre slot: + Lead
  NAV[2],
  NAV[3],
  { href: '/admin/more', label: 'More', icon: Menu },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-admin-hairline bg-admin-card md:flex">
        <Link href="/admin" className="flex items-center gap-3 px-6 py-6">
          <span className="font-display text-3xl font-medium leading-none text-brushly-gold">
            B
          </span>
          <span className="font-body text-[13px] font-medium uppercase tracking-[0.25em] text-brushly-cream">
            Brushly
          </span>
        </Link>
        <Link
          href="/admin/leads/new"
          className="mx-4 mb-4 flex h-12 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Add lead
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-12 items-center gap-3 rounded-sm px-3 font-body text-[14px] transition-colors ${
                  active
                    ? 'bg-admin-raised font-medium text-brushly-gold'
                    : 'text-brushly-cream/70 hover:bg-admin-raised hover:text-brushly-cream'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-admin-hairline p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Content */}
      <main className="pb-28 md:pb-10 md:pl-56">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-admin-hairline bg-admin-card/95 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid h-16 grid-cols-6">
          {TABS.map((tab) => {
            if (tab === null) {
              return (
                <Link
                  key="add-lead"
                  href="/admin/leads/new"
                  aria-label="Add lead"
                  className="flex items-center justify-center"
                >
                  <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brushly-gold text-brushly-black shadow-lg shadow-black/40 transition-colors active:bg-brushly-gold-light">
                    <Plus className="h-7 w-7" strokeWidth={2.5} />
                  </span>
                </Link>
              )
            }
            const { href, label, icon: Icon } = tab
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 font-body text-[10px] ${
                  active ? 'text-brushly-gold' : 'text-brushly-cream/60'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
