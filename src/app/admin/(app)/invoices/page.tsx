import { Receipt } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'

export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" />
      <EmptyState
        icon={Receipt}
        message="No invoices yet — accept a quote and tap “Create invoice”."
      />
    </>
  )
}
