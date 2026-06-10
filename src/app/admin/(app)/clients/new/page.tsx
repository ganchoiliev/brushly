import type { Metadata } from 'next'
import PageHeader from '@/components/admin/PageHeader'
import ClientForm from '@/components/admin/clients/ClientForm'

export const metadata: Metadata = {
  title: 'Add client',
}

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Add client" />
      <ClientForm />
    </>
  )
}
