'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { updateLeadDetails } from '@/lib/admin/actions/leads'
import type { Lead } from '@/lib/supabase/types'

/* Read view with an explicit Edit toggle — keeps the screen calm, keeps
   tap targets big. */
export default function LeadDetailsForm({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const form = new FormData(e.currentTarget)
    const result = await updateLeadDetails({
      id: lead.id,
      name: form.get('name'),
      phone: form.get('phone') || null,
      email: form.get('email') || null,
      service: form.get('service') || null,
    })
    setPending(false)
    if (result.ok) {
      toast.success('Saved')
      setEditing(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (!editing) {
    return (
      <div className="rounded-sm border border-admin-hairline bg-admin-card p-4">
        <div className="flex items-start justify-between gap-3">
          <dl className="min-w-0 space-y-2 font-body text-[14px]">
            <Row label="Phone" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row label="Job" value={lead.service} />
          </dl>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit details"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-white/10 text-brushly-cream/70 transition-colors hover:bg-admin-raised"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const inputClass =
    'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-brushly-gold/30 bg-admin-card p-4"
    >
      <label className="block">
        <span className="font-body text-[12px] text-admin-muted">Name</span>
        <input name="name" defaultValue={lead.name} required className={inputClass} />
      </label>
      <label className="mt-3 block">
        <span className="font-body text-[12px] text-admin-muted">Phone</span>
        <input name="phone" type="tel" inputMode="tel" defaultValue={lead.phone ?? ''} className={inputClass} />
      </label>
      <label className="mt-3 block">
        <span className="font-body text-[12px] text-admin-muted">Email</span>
        <input name="email" type="email" inputMode="email" defaultValue={lead.email ?? ''} className={inputClass} />
      </label>
      <label className="mt-3 block">
        <span className="font-body text-[12px] text-admin-muted">Job</span>
        <input name="service" defaultValue={lead.service ?? ''} className={inputClass} />
      </label>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-12 flex-1 rounded-sm bg-brushly-gold font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-12 flex-1 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-14 shrink-0 text-admin-muted">{label}</dt>
      <dd className="min-w-0 truncate text-brushly-cream">{value || '—'}</dd>
    </div>
  )
}
