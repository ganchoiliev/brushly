'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PhoneOutgoing, Trophy, X, Ban, RotateCcw } from 'lucide-react'
import { updateLeadStatus } from '@/lib/admin/actions/leads'
import type { LeadStatus } from '@/lib/supabase/types'

/* Big labelled buttons — never dropdowns (§1.9). Only the transitions that
   make sense from where the lead is now. */
const ACTIONS: Record<string, { status: LeadStatus; label: string; icon: React.ReactNode; tone: 'gold' | 'green' | 'red' | 'muted' }[]> = {
  new: [
    { status: 'contacted', label: 'Mark as contacted', icon: <PhoneOutgoing className="h-5 w-5" />, tone: 'gold' },
    { status: 'spam', label: 'Mark as spam', icon: <Ban className="h-5 w-5" />, tone: 'muted' },
  ],
  contacted: [
    { status: 'won', label: 'Mark as won', icon: <Trophy className="h-5 w-5" />, tone: 'green' },
    { status: 'lost', label: 'Mark as lost', icon: <X className="h-5 w-5" />, tone: 'red' },
  ],
  quoted: [
    { status: 'won', label: 'Mark as won', icon: <Trophy className="h-5 w-5" />, tone: 'green' },
    { status: 'lost', label: 'Mark as lost', icon: <X className="h-5 w-5" />, tone: 'red' },
  ],
  won: [
    { status: 'contacted', label: 'Back to contacted', icon: <RotateCcw className="h-5 w-5" />, tone: 'muted' },
  ],
  lost: [
    { status: 'contacted', label: 'Back to contacted', icon: <RotateCcw className="h-5 w-5" />, tone: 'muted' },
  ],
  spam: [
    { status: 'new', label: 'Not spam — back to new', icon: <RotateCcw className="h-5 w-5" />, tone: 'muted' },
  ],
}

const TONE = {
  gold: 'bg-brushly-gold text-brushly-black hover:bg-brushly-gold-light',
  green: 'border border-status-green/40 text-status-green hover:bg-status-green/10',
  red: 'border border-status-red/40 text-status-red hover:bg-status-red/10',
  muted: 'border border-white/15 text-brushly-cream/70 hover:bg-admin-raised',
}

export default function LeadStatusButtons({
  leadId,
  status,
}: {
  leadId: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const actions = ACTIONS[status] ?? []
  if (actions.length === 0) return null

  function setStatus(next: LeadStatus, label: string) {
    setBusy(next)
    startTransition(async () => {
      const result = await updateLeadStatus({ id: leadId, status: next })
      if (result.ok) {
        toast.success(label.replace('Mark as', 'Marked as').replace('Back to', 'Back to'))
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setBusy(null)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((a) => (
        <button
          key={a.status}
          onClick={() => setStatus(a.status, a.label)}
          disabled={pending}
          className={`flex h-13 items-center justify-center gap-2 rounded-sm font-body text-[15px] font-semibold transition-colors disabled:opacity-60 ${TONE[a.tone]}`}
        >
          {a.icon}
          {busy === a.status ? 'Saving…' : a.label}
        </button>
      ))}
    </div>
  )
}
