'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { createLead } from '@/lib/admin/actions/leads'

const SOURCES = [
  { value: 'phone', label: 'Phone call' },
  { value: 'referral', label: 'Referral' },
  { value: 'ads', label: 'Ads' },
  { value: 'manual', label: 'Other' },
] as const

/* The flagship: add a lead while ON the phone. Name + phone, one thumb,
   under 20 seconds. Everything else is behind "More details". */
export default function QuickAddLeadForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [more, setMore] = useState(false)
  const [source, setSource] = useState<string>('phone')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setPending(true)
    const form = new FormData(e.currentTarget)
    const result = await createLead({
      name: form.get('name'),
      phone: form.get('phone'),
      email: form.get('email') || null,
      service: form.get('service') || null,
      notes: form.get('notes') || null,
      source,
    })
    if (!result.ok) {
      toast.error(result.error)
      setPending(false)
      return
    }
    toast.success('Lead saved')
    router.replace(`/admin/leads/${result.data!.id}`)
    router.refresh()
  }

  const inputClass =
    'mt-2 h-13 w-full rounded-sm border border-white/10 bg-admin-raised px-4 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

  return (
    <form onSubmit={handleSubmit} className="px-4 py-5 md:max-w-lg md:px-8">
      <label className="block">
        <span className="font-body text-[14px] font-medium text-brushly-cream">
          Name
        </span>
        <input
          name="name"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Who's calling?"
          className={inputClass}
        />
      </label>
      <label className="mt-4 block">
        <span className="font-body text-[14px] font-medium text-brushly-cream">
          Phone
        </span>
        <input
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="07…"
          className={inputClass}
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSource(s.value)}
            className={`h-11 rounded-full border px-4 font-body text-[13px] font-medium transition-colors ${
              source === s.value
                ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-gold'
                : 'border-white/10 text-brushly-cream/70'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setMore(!more)}
        className="mt-6 flex h-11 items-center gap-1 font-body text-[14px] text-admin-muted"
      >
        More details (optional)
        <ChevronDown
          className={`h-4 w-4 transition-transform ${more ? 'rotate-180' : ''}`}
        />
      </button>

      {more && (
        <div className="mt-1">
          <label className="block">
            <span className="font-body text-[13px] text-brushly-cream/70">
              What job? (e.g. “3-bed interior, Reigate”)
            </span>
            <input name="service" autoComplete="off" className={inputClass} />
          </label>
          <label className="mt-4 block">
            <span className="font-body text-[13px] text-brushly-cream/70">Email</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <label className="mt-4 block">
            <span className="font-body text-[13px] text-brushly-cream/70">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-2 w-full rounded-sm border border-white/10 bg-admin-raised px-4 py-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
            />
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 h-14 w-full rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save lead'}
      </button>
    </form>
  )
}
