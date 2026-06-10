import { BookUser } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" />
      <EmptyState
        icon={BookUser}
        message="No clients yet — they're created automatically when you turn a lead into a quote."
      />
    </>
  )
}
