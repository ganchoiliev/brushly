'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateLeadNotes } from '@/lib/admin/actions/leads'

export default function LeadNotes({
  leadId,
  initialNotes,
}: {
  leadId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(initialNotes ?? '')
  const [pending, setPending] = useState(false)
  const dirty = notes !== saved

  async function save() {
    setPending(true)
    const result = await updateLeadNotes({ id: leadId, notes })
    setPending(false)
    if (result.ok) {
      setSaved(notes)
      toast.success('Notes saved')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Anything worth remembering — access, parking, colours they mentioned…"
        className="w-full rounded-sm border border-white/10 bg-admin-raised px-4 py-3 font-body text-[16px] leading-relaxed text-brushly-cream outline-none transition-colors placeholder:text-admin-muted/60 focus:border-brushly-gold"
      />
      {dirty && (
        <button
          onClick={save}
          disabled={pending}
          className="mt-2 h-12 w-full rounded-sm bg-brushly-gold font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
      )}
    </div>
  )
}
