'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, Download, Send, Trophy, X, Copy } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { sendQuote, markQuoteDecision } from '@/lib/admin/actions/send'
import { duplicateQuote } from '@/lib/admin/actions/quotes'
import { quoteRef } from '@/lib/admin/format'

export default function QuoteActions({
  quoteId,
  status,
  reference,
  clientEmail,
  clientName,
}: {
  quoteId: string
  status: string
  reference: string
  clientEmail: string | null
  clientName: string
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'send' | 'accepted' | 'declined' | null>(null)
  const [pending, setPending] = useState(false)
  const pdfUrl = `/admin/api/quotes/${quoteId}/pdf`
  const decided = status === 'accepted' || status === 'declined'

  async function confirmSend() {
    setPending(true)
    const result = await sendQuote(quoteId)
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success(`Quote emailed to ${clientEmail}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  function openSend() {
    if (!clientEmail) {
      toast.error(`${clientName} has no email — add one on their client page first.`)
      return
    }
    setDialog('send')
  }

  /* Repeat clients (§4): same title, items and terms in a fresh draft. */
  async function duplicate() {
    setPending(true)
    const result = await duplicateQuote({ id: quoteId })
    setPending(false)
    if (result.ok && result.data) {
      toast.success(`Draft ${quoteRef(result.data.quote_number)} ready`)
      router.push(`/admin/quotes/${result.data.id}`)
      router.refresh()
    } else if (!result.ok) {
      toast.error(result.error)
    }
  }

  async function confirmDecision(decision: 'accepted' | 'declined') {
    setPending(true)
    const result = await markQuoteDecision({ id: quoteId, decision })
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success(decision === 'accepted' ? 'Marked as accepted 🎉' : 'Marked as declined')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <section className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-13 items-center justify-center gap-2 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised"
        >
          <Eye className="h-4 w-4" />
          Preview PDF
        </a>
        <a
          href={`${pdfUrl}?download=1`}
          className="flex h-13 items-center justify-center gap-2 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <button
        onClick={duplicate}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised disabled:opacity-60"
      >
        <Copy className="h-4 w-4" />
        Duplicate quote
      </button>

      {!decided && (
        <button
          onClick={openSend}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          <Send className="h-5 w-5" />
          {status === 'sent' ? 'Send again' : 'Send to client'}
        </button>
      )}

      {/* Mobile: the primary action rides in a sticky bar above the tab
          bar (§2.3), so it never scrolls out of reach. */}
      {!decided && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-admin-hairline bg-admin-canvas/95 px-4 py-3 backdrop-blur-lg md:hidden">
          <button
            onClick={openSend}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors active:bg-brushly-gold-light"
          >
            <Send className="h-5 w-5" />
            {status === 'sent' ? 'Send again' : 'Send to client'}
          </button>
        </div>
      )}

      {!decided && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDialog('accepted')}
            className="flex h-13 items-center justify-center gap-2 rounded-sm border border-status-green/40 font-body text-[14px] font-semibold text-status-green transition-colors hover:bg-status-green/10"
          >
            <Trophy className="h-4 w-4" />
            Mark as accepted
          </button>
          <button
            onClick={() => setDialog('declined')}
            className="flex h-13 items-center justify-center gap-2 rounded-sm border border-status-red/40 font-body text-[14px] font-semibold text-status-red transition-colors hover:bg-status-red/10"
          >
            <X className="h-4 w-4" />
            Mark as declined
          </button>
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'send'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Send ${reference}?`}
        body={`This emails the quote PDF to ${clientEmail} from hello@brushly.uk.`}
        confirmLabel="Send it"
        pending={pending}
        onConfirm={confirmSend}
      />
      <ConfirmDialog
        open={dialog === 'accepted'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Client accepted?"
        body="This locks the quote and marks the lead as won. You can then create the invoice in one tap."
        confirmLabel="Yes — accepted"
        pending={pending}
        onConfirm={() => confirmDecision('accepted')}
      />
      <ConfirmDialog
        open={dialog === 'declined'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Client declined?"
        body="This locks the quote and marks the lead as lost."
        confirmLabel="Yes — declined"
        pending={pending}
        destructive
        onConfirm={() => confirmDecision('declined')}
      />
    </section>
  )
}
