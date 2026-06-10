'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateSettings } from '@/lib/admin/actions/settings'
import { formatSortCode } from '@/lib/admin/format'
import type { Settings } from '@/lib/supabase/types'

const inputClass =
  'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

/* Number fields: a tap replaces the value rather than appending to it. */
const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
  e.currentTarget.select()

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [vatOn, setVatOn] = useState(settings.vat_registered)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const form = new FormData(e.currentTarget)
    const result = await updateSettings({
      company_name: form.get('company_name'),
      company_number: form.get('company_number'),
      address: form.get('address'),
      phone: form.get('phone'),
      email: form.get('email'),
      vat_registered: vatOn,
      vat_number: form.get('vat_number') || null,
      bank_name: form.get('bank_name') || null,
      bank_sort_code: form.get('bank_sort_code') || null,
      bank_account_no: form.get('bank_account_no') || null,
      default_terms: form.get('default_terms') || null,
    })
    setPending(false)
    if (result.ok) {
      toast.success('Settings saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 py-5 md:max-w-lg md:px-8">
      <section>
        <h2 className="mb-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Company — printed on quotes &amp; invoices
        </h2>
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Company name</span>
          <input name="company_name" required defaultValue={settings.company_name} className={inputClass} />
        </label>
        <label className="mt-3 block">
          <span className="font-body text-[13px] text-brushly-cream/70">Companies House number</span>
          <input name="company_number" required defaultValue={settings.company_number} className={inputClass} />
        </label>
        <label className="mt-3 block">
          <span className="font-body text-[13px] text-brushly-cream/70">Registered address</span>
          <input name="address" required defaultValue={settings.address} className={inputClass} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-body text-[13px] text-brushly-cream/70">Phone</span>
            <input name="phone" required type="tel" defaultValue={settings.phone} className={inputClass} />
          </label>
          <label className="block">
            <span className="font-body text-[13px] text-brushly-cream/70">Email</span>
            <input name="email" required type="email" defaultValue={settings.email} className={inputClass} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Bank details — printed on invoices
        </h2>
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Bank name</span>
          <input name="bank_name" defaultValue={settings.bank_name ?? ''} className={inputClass} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-body text-[13px] text-brushly-cream/70">Sort code</span>
            <input
              name="bank_sort_code"
              inputMode="numeric"
              placeholder="00-00-00"
              defaultValue={settings.bank_sort_code ?? ''}
              onFocus={selectAllOnFocus}
              onBlur={(e) => {
                e.currentTarget.value = formatSortCode(e.currentTarget.value)
              }}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="font-body text-[13px] text-brushly-cream/70">Account number</span>
            <input
              name="bank_account_no"
              inputMode="numeric"
              placeholder="12345678"
              defaultValue={settings.bank_account_no ?? ''}
              onFocus={selectAllOnFocus}
              onBlur={(e) => {
                /* Banks want bare digits — drop stray spaces or dashes,
                   but never digits themselves. */
                const digits = e.currentTarget.value.replace(/[\s-]/g, '')
                e.currentTarget.value = digits
              }}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          VAT
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={vatOn}
          onClick={() => setVatOn(!vatOn)}
          className={`flex h-13 w-full items-center justify-between rounded-sm border px-4 font-body text-[15px] transition-colors ${
            vatOn
              ? 'border-brushly-gold/50 bg-brushly-gold/10 text-brushly-gold'
              : 'border-white/10 text-brushly-cream/70'
          }`}
        >
          <span>VAT registered</span>
          <span
            className={`relative h-7 w-12 rounded-full transition-colors ${vatOn ? 'bg-brushly-gold' : 'bg-admin-raised'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-brushly-cream transition-all ${vatOn ? 'left-6' : 'left-1'}`}
            />
          </span>
        </button>
        {vatOn && (
          <label className="mt-3 block">
            <span className="font-body text-[13px] text-brushly-cream/70">VAT number</span>
            <input name="vat_number" defaultValue={settings.vat_number ?? ''} className={inputClass} />
          </label>
        )}
        <p className="mt-2 font-body text-[12px] leading-relaxed text-admin-muted">
          When on, new quotes and invoices add 20% VAT and PDFs show the VAT
          number.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Default terms — preset on new quotes
        </h2>
        <textarea
          name="default_terms"
          rows={4}
          defaultValue={settings.default_terms ?? ''}
          placeholder="e.g. 50% deposit to book, balance on completion. Materials included unless stated."
          className="mt-1 w-full rounded-sm border border-white/10 bg-admin-raised px-3 py-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
        />
      </section>

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
