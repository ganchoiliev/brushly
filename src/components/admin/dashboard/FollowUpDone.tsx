'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { clearFollowUp } from '@/lib/admin/actions/followups'

/* The "done" tick on a follow-up row in Needs attention — clears the
   reminder without leaving the dashboard. */
export default function FollowUpDone({
  kind,
  id,
  name,
}: {
  kind: 'lead' | 'quote'
  id: string
  name: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function done() {
    setPending(true)
    const result = await clearFollowUp({ kind, id })
    setPending(false)
    if (result.ok) {
      toast.success(`Follow-up done — ${name}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <button
      onClick={done}
      disabled={pending}
      aria-label={`Mark follow-up for ${name} as done`}
      className="flex w-14 shrink-0 items-center justify-center border-l border-admin-hairline text-status-green transition-colors hover:bg-admin-raised disabled:opacity-50"
    >
      <Check className="h-[18px] w-[18px]" />
    </button>
  )
}
