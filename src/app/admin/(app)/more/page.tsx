import Link from 'next/link'
import { BookUser, Settings, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import SignOutButton from '@/components/admin/SignOutButton'

const LINKS = [
  { href: '/admin/clients', label: 'Clients', icon: BookUser },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <div className="px-4 py-6 md:px-8">
        <div className="overflow-hidden rounded-sm border border-white/8 bg-admin-card">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-14 items-center gap-3 border-b border-white/8 px-4 font-body text-[15px] text-brushly-cream transition-colors last:border-b-0 hover:bg-admin-raised"
            >
              <Icon className="h-5 w-5 text-admin-muted" strokeWidth={1.8} />
              {label}
              <ChevronRight className="ml-auto h-5 w-5 text-admin-muted" strokeWidth={1.8} />
            </Link>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-sm border border-white/8 bg-admin-card px-1">
          <SignOutButton />
        </div>
      </div>
    </>
  )
}
