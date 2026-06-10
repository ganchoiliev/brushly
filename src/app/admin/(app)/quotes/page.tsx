import { FileText } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'

export default function QuotesPage() {
  return (
    <>
      <PageHeader title="Quotes" />
      <EmptyState
        icon={FileText}
        message="No quotes yet — open a lead and tap “Turn into quote”."
      />
    </>
  )
}
