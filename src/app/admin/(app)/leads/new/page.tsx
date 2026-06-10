import type { Metadata } from 'next'
import PageHeader from '@/components/admin/PageHeader'
import QuickAddLeadForm from '@/components/admin/leads/QuickAddLeadForm'

export const metadata: Metadata = {
  title: 'Add lead',
}

export default function NewLeadPage() {
  return (
    <>
      <PageHeader title="Add lead" />
      <QuickAddLeadForm />
    </>
  )
}
