import Link from 'next/link'
import { Plus, Sun } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Today" />
      <div className="px-4 py-6 md:px-8">
        <Link
          href="/admin/leads/new"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light md:max-w-sm"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Add lead
        </Link>
        <EmptyState
          icon={Sun}
          message="Nothing needs attention yet — new leads, waiting quotes and overdue invoices will show up here."
        />
      </div>
    </>
  )
}
