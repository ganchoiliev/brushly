import type { Metadata } from 'next'
import PageHeader from '@/components/admin/PageHeader'
import SettingsForm from '@/components/admin/settings/SettingsForm'
import { requireUser } from '@/lib/admin/auth'
import { quoteRef, invoiceRef } from '@/lib/admin/format'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const { supabase } = await requireUser()
  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error || !settings) {
    throw new Error(`Couldn't load settings: ${error?.message ?? 'row missing'}`)
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="px-4 pt-5 md:max-w-lg md:px-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-white/8 bg-admin-card p-4">
            <p className="font-body text-[11px] uppercase tracking-wider text-admin-muted">
              Next quote
            </p>
            <p className="mt-1 font-body text-lg font-semibold tabular-nums text-brushly-cream">
              {quoteRef(settings.quote_counter + 1)}
            </p>
          </div>
          <div className="rounded-sm border border-white/8 bg-admin-card p-4">
            <p className="font-body text-[11px] uppercase tracking-wider text-admin-muted">
              Next invoice
            </p>
            <p className="mt-1 font-body text-lg font-semibold tabular-nums text-brushly-cream">
              {invoiceRef(settings.invoice_counter + 1)}
            </p>
          </div>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </>
  )
}
