'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Paperclip, Send } from 'lucide-react'
import MotionDialogContent from '@/components/admin/MotionDialogContent'
import { defaultQuoteEmail, defaultInvoiceEmail } from '@/lib/admin/email/defaults'

const inputClass =
  'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

export type SendFields = { to: string; subject: string; message: string }

/* Send dialog (v1.2 §4.1) — replaces the blind confirm. Everything the
   email will say is on screen and editable before anything leaves the
   building; "Send test to us" delivers the same email to hello@brushly.uk
   marked [TEST] and costs nothing. */
export default function SendDialog({
  open,
  onOpenChange,
  docType,
  reference,
  clientEmail,
  title,
  totalPence,
  secondaryDate,
  pending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docType: 'quote' | 'invoice'
  reference: string
  clientEmail: string | null
  title: string | null
  totalPence: number
  secondaryDate: string | null
  /* Which send is in flight, if any — disables both buttons. */
  pending: 'client' | 'test' | null
  onSend: (fields: SendFields, test: boolean) => void
}) {
  const defaults =
    docType === 'quote'
      ? defaultQuoteEmail({ reference, title, totalPence, validUntil: secondaryDate })
      : defaultInvoiceEmail({ reference, title, totalPence, dueDate: secondaryDate })

  const [to, setTo] = useState(clientEmail ?? '')
  const [subject, setSubject] = useState(defaults.subject)
  const [message, setMessage] = useState(defaults.message)

  /* Fresh prefills every time the dialog opens — stale edits from a
     cancelled attempt shouldn't haunt the next one. */
  useEffect(() => {
    if (open) {
      setTo(clientEmail ?? '')
      setSubject(defaults.subject)
      setMessage(defaults.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const attachment = `Brushly-${docType === 'quote' ? 'Quote' : 'Invoice'}-${reference}.pdf`
  const fields = { to: to.trim(), subject, message }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <MotionDialogContent>
          <Dialog.Title className="font-display text-xl font-light text-brushly-cream">
            Send {reference}
          </Dialog.Title>
          <Dialog.Description className="mt-1 font-body text-[13px] text-admin-muted">
            From hello@brushly.uk — replies come back there.
          </Dialog.Description>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="font-body text-[13px] text-brushly-cream/70">To</span>
              <input
                type="email"
                inputMode="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@email.co.uk"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="font-body text-[13px] text-brushly-cream/70">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="font-body text-[13px] text-brushly-cream/70">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-sm border border-white/10 bg-admin-raised px-3 py-3 font-body text-[16px] leading-snug text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
              />
            </label>

            {/* What's riding along. */}
            <div className="flex h-11 items-center gap-2 rounded-sm border border-white/10 bg-admin-raised px-3">
              <Paperclip className="h-4 w-4 shrink-0 text-admin-muted" />
              <span className="truncate font-body text-[13px] text-brushly-cream/70">
                {attachment}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => onSend(fields, false)}
              disabled={pending !== null}
              className="flex h-13 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {pending === 'client' ? 'Sending…' : 'Send to client'}
            </button>
            <button
              onClick={() => onSend(fields, true)}
              disabled={pending !== null}
              className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised disabled:opacity-60"
            >
              {pending === 'test' ? 'Sending test…' : 'Send test to us'}
            </button>
            <Dialog.Close asChild>
              <button className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </MotionDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
