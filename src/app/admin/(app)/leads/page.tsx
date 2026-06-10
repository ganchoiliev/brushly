import { Phone } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import EmptyState from '@/components/admin/EmptyState'

export default function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" action={{ href: '/admin/leads/new', label: '+ Lead' }} />
      <EmptyState
        icon={Phone}
        message="No leads yet — tap + when someone calls."
        action={{ href: '/admin/leads/new', label: '+ Add lead' }}
      />
    </>
  )
}
