import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import NoAccess from '@/components/admin/NoAccess'
import { getAdminSession } from '@/lib/admin/auth'

export default async function AdminAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, isAdmin } = await getAdminSession()

  if (!user) redirect('/admin/login')
  if (!isAdmin) return <NoAccess email={user.email ?? ''} />

  return <AdminShell>{children}</AdminShell>
}
