import PageHeader from '@/components/admin/PageHeader'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <p className="px-4 py-6 font-body text-[15px] text-admin-muted md:px-8">
        Company details, bank details and VAT land here next.
      </p>
    </>
  )
}
