'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { PhoneMissed, Clock, X, Check, CalendarDays } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { setFollowUp, clearFollowUp } from '@/lib/admin/actions/followups'
import { updateLeadStatus } from '@/lib/admin/actions/leads'
import { addDays, londonTime, todayLondon } from '@/lib/admin/format'

/* One tap after a call (§4): "No answer" books tomorrow morning,
   "Call back…" offers big labelled chips (no dropdowns, §1.9),
   "Not interested" marks the lead lost. */
export default function OutcomeButtons({
  leadId,
  followUpAt,
}: {
  leadId: string
  followUpAt: string | null
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'callback' | 'lost' | null>(null)
  const [pickDate, setPickDate] = useState('')
  const [pending, setPending] = useState(false)

  async function remind(when: string, confirmation: string) {
    setPending(true)
    const result = await setFollowUp({ kind: 'lead', id: leadId, when })
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success(confirmation)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function done() {
    setPending(true)
    const result = await clearFollowUp({ kind: 'lead', id: leadId })
    setPending(false)
    if (result.ok) {
      toast.success('Reminder cleared')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function notInterested() {
    setPending(true)
    const result = await updateLeadStatus({ id: leadId, status: 'lost' })
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success('Marked as lost')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const today = todayLondon()
  const tomorrow9 = () => londonTime(addDays(today, 1), 9)

  return (
    <section>
      <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
        After the call
      </h2>

      {followUpAt && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-sm border border-brushly-gold/30 bg-admin-card px-4 py-3">
          <p className="min-w-0 truncate font-body text-[14px] text-brushly-cream">
            Reminder set — {reminderLabel(followUpAt)}
          </p>
          <button
            onClick={done}
            disabled={pending}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-sm border border-status-green/40 px-3 font-body text-[13px] font-medium text-status-green transition-colors hover:bg-status-green/10 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => remind(tomorrow9(), "No answer — we'll remind you tomorrow morning.")}
          disabled={pending}
          className="flex h-13 flex-col items-center justify-center gap-1 rounded-sm border border-white/15 font-body text-[13px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised disabled:opacity-60"
        >
          <PhoneMissed className="h-4 w-4" />
          No answer
        </button>
        <button
          onClick={() => setDialog('callback')}
          disabled={pending}
          className="flex h-13 flex-col items-center justify-center gap-1 rounded-sm border border-brushly-gold/50 font-body text-[13px] font-medium text-brushly-gold transition-colors hover:bg-brushly-gold/10 disabled:opacity-60"
        >
          <Clock className="h-4 w-4" />
          Call back…
        </button>
        <button
          onClick={() => setDialog('lost')}
          disabled={pending}
          className="flex h-13 flex-col items-center justify-center gap-1 rounded-sm border border-status-red/40 font-body text-[13px] font-medium text-status-red transition-colors hover:bg-status-red/10 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          Not interested
        </button>
      </div>

      {/* Call back: big labelled chips, never dropdowns (§1.9). */}
      <Dialog.Root open={dialog === 'callback'} onOpenChange={(open) => !open && setDialog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="admin-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="admin-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/10 bg-admin-card p-5 shadow-2xl shadow-black/50">
            <Dialog.Title className="font-display text-xl font-light text-brushly-cream">
              When should we remind you?
            </Dialog.Title>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => remind(londonTime(today, 14), 'Reminder set for this afternoon.')}
                disabled={pending}
                className="h-13 rounded-sm border border-brushly-gold/50 font-body text-[15px] font-semibold text-brushly-gold transition-colors hover:bg-brushly-gold/10 disabled:opacity-60"
              >
                This afternoon
              </button>
              <button
                onClick={() => remind(tomorrow9(), 'Reminder set for tomorrow morning.')}
                disabled={pending}
                className="h-13 rounded-sm border border-brushly-gold/50 font-body text-[15px] font-semibold text-brushly-gold transition-colors hover:bg-brushly-gold/10 disabled:opacity-60"
              >
                Tomorrow
              </button>
              <button
                onClick={() => remind(londonTime(addDays(today, 7), 9), 'Reminder set for next week.')}
                disabled={pending}
                className="h-13 rounded-sm border border-brushly-gold/50 font-body text-[15px] font-semibold text-brushly-gold transition-colors hover:bg-brushly-gold/10 disabled:opacity-60"
              >
                Next week
              </button>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-admin-muted" />
                <input
                  type="date"
                  value={pickDate}
                  min={today}
                  onChange={(e) => setPickDate(e.target.value)}
                  aria-label="Pick a date"
                  className="h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[15px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
                />
                <button
                  onClick={() =>
                    pickDate && remind(londonTime(pickDate, 9), 'Reminder set.')
                  }
                  disabled={pending || !pickDate}
                  className="h-12 shrink-0 rounded-sm bg-brushly-gold px-4 font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-40"
                >
                  Set
                </button>
              </div>
              <Dialog.Close asChild>
                <button className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={dialog === 'lost'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Not interested?"
        body="This marks the lead as lost. You can bring it back later if they change their mind."
        confirmLabel="Yes — mark as lost"
        pending={pending}
        destructive
        onConfirm={notInterested}
      />
    </section>
  )
}

/* "Thu 12 Jun, 09:00" in London time. */
function reminderLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}
