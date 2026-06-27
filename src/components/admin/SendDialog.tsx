'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Paperclip, Send, Mail, MessageSquare } from 'lucide-react'
import MotionDialogContent from '@/components/admin/MotionDialogContent'
import { defaultQuoteEmail, defaultInvoiceEmail } from '@/lib/admin/email/defaults'

const inputClass =
  'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

export type SendFields = { to: string; subject: string; message: string }
/* Where the document goes out. SMS/both are only offered when the caller
   wires SMS up (quotes) — invoices stay email-only. */
export type SendChannel = 'email' | 'sms' | 'both'

/* Send dialog (v1.2 §4.1) — replaces the blind confirm. Everything the
   email will say is on screen and editable before anything leaves the
   building; "Send test to us" delivers the same email to hello@brushly.uk
   marked [TEST] and costs nothing. When smsAvailable, a channel switch adds
   a text (the public quote link) alongside or instead of the email. */
export default function SendDialog({
  open,
  onOpenChange,
  docType,
  reference,
  clientEmail,
  clientPhone,
  smsAvailable = false,
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
  clientPhone?: string | null
  smsAvailable?: boolean
  title: string | null
  totalPence: number
  secondaryDate: string | null
  /* Which send is in flight, if any — disables the buttons. */
  pending: 'client' | 'test' | null
  onSend: (fields: SendFields, test: boolean, channel: SendChannel) => void
}) {
  const defaults =
    docType === 'quote'
      ? defaultQuoteEmail({ reference, title, totalPence, validUntil: secondaryDate })
      : defaultInvoiceEmail({ reference, title, totalPence, dueDate: secondaryDate })

  const [to, setTo] = useState(clientEmail ?? '')
  const [subject, setSubject] = useState(defaults.subject)
  const [message, setMessage] = useState(defaults.message)
  const [channel, setChannel] = useState<SendChannel>('email')

  const hasMobile = !!clientPhone && clientPhone.trim() !== ''

  /* Fresh prefills every time the dialog opens — stale edits from a
     cancelled attempt shouldn't haunt the next one. */
  useEffect(() => {
    if (open) {
      setTo(clientEmail ?? '')
      setSubject(defaults.subject)
      setMessage(defaults.message)
      setChannel('email')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const attachment = `Brushly-${docType === 'quote' ? 'Quote' : 'Invoice'}-${reference}.pdf`
  const fields = { to: to.trim(), subject, message }
  const showEmail = channel !== 'sms'
  const showSms = channel !== 'email'

  const sendLabel =
    pending === 'client'
      ? 'Sending…'
      : channel === 'sms'
        ? 'Send by text'
        : channel === 'both'
          ? 'Email + text client'
          : 'Send to client'

  const channels: { value: SendChannel; label: string; icon: typeof Mail; disabled: boolean }[] = [
    { value: 'email', label: 'Email', icon: Mail, disabled: false },
    { value: 'sms', label: 'Text', icon: MessageSquare, disabled: !hasMobile },
    { value: 'both', label: 'Both', icon: Send, disabled: !hasMobile },
  ]

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

          {smsAvailable && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {channels.map((c) => {
                  const Icon = c.icon
                  const active = channel === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      disabled={c.disabled}
                      onClick={() => setChannel(c.value)}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-sm border font-body text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-gold'
                          : 'border-white/15 text-brushly-cream/80 hover:bg-admin-raised'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {c.label}
                    </button>
                  )
                })}
              </div>
              {!hasMobile && (
                <p className="mt-2 font-body text-[12px] text-admin-muted">
                  No mobile on file for this client — add one to text the quote.
                </p>
              )}
            </div>
          )}

          {showEmail && (
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
          )}

          {showSms && hasMobile && (
            <div className="mt-4 flex items-center gap-2 rounded-sm border border-white/10 bg-admin-raised px-3 py-3">
              <MessageSquare className="h-4 w-4 shrink-0 text-admin-muted" />
              <span className="font-body text-[13px] text-brushly-cream/70">
                Texts a link to {reference} to <span className="text-brushly-cream">{clientPhone}</span>
              </span>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => onSend(fields, false, channel)}
              disabled={pending !== null || (showSms && !hasMobile)}
              className="flex h-13 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sendLabel}
            </button>
            {/* Test is an email-only confidence check — hidden when texting. */}
            {showEmail && (
              <button
                onClick={() => onSend(fields, true, channel)}
                disabled={pending !== null}
                className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised disabled:opacity-60"
              >
                {pending === 'test' ? 'Sending test…' : 'Send test to us'}
              </button>
            )}
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
