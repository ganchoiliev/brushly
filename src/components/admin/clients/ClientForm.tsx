'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createClientRecord,
  updateClientRecord,
} from '@/lib/admin/actions/clients'
import type { Client } from '@/lib/supabase/types'

const inputClass =
  'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

export default function ClientForm({
  client,
  onDone,
}: {
  client?: Client
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const form = new FormData(e.currentTarget)
    const fields = {
      name: form.get('name'),
      phone: form.get('phone') || null,
      email: form.get('email') || null,
      address_line1: form.get('address_line1') || null,
      address_line2: form.get('address_line2') || null,
      town: form.get('town') || null,
      postcode: form.get('postcode') || null,
      notes: form.get('notes') || null,
    }
    const result = client
      ? await updateClientRecord({ id: client.id, ...fields })
      : await createClientRecord(fields)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(client ? 'Saved' : 'Client added')
    if (onDone) {
      onDone()
      router.refresh()
    } else if (!client && result.data && 'id' in result.data) {
      router.replace(`/admin/clients/${result.data.id}`)
      router.refresh()
    } else {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-5 md:max-w-lg md:px-8">
      <label className="block">
        <span className="font-body text-[13px] text-brushly-cream/70">Name</span>
        <input name="name" required defaultValue={client?.name ?? ''} autoComplete="off" className={inputClass} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Phone</span>
          <input name="phone" type="tel" inputMode="tel" defaultValue={client?.phone ?? ''} autoComplete="off" className={inputClass} />
        </label>
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Email</span>
          <input name="email" type="email" inputMode="email" defaultValue={client?.email ?? ''} autoComplete="off" className={inputClass} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="font-body text-[13px] text-brushly-cream/70">Address line 1</span>
        <input name="address_line1" defaultValue={client?.address_line1 ?? ''} autoComplete="off" className={inputClass} />
      </label>
      <label className="mt-3 block">
        <span className="font-body text-[13px] text-brushly-cream/70">Address line 2</span>
        <input name="address_line2" defaultValue={client?.address_line2 ?? ''} autoComplete="off" className={inputClass} />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Town</span>
          <input name="town" defaultValue={client?.town ?? ''} autoComplete="off" className={inputClass} />
        </label>
        <label className="block">
          <span className="font-body text-[13px] text-brushly-cream/70">Postcode</span>
          <input name="postcode" defaultValue={client?.postcode ?? ''} autoComplete="off" className={inputClass} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="font-body text-[13px] text-brushly-cream/70">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ''}
          className="mt-1 w-full rounded-sm border border-white/10 bg-admin-raised px-3 py-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-13 w-full rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
      >
        {pending ? 'Saving…' : client ? 'Save changes' : 'Add client'}
      </button>
    </form>
  )
}
