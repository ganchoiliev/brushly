'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, Download, Send, Banknote, Landmark, Ban } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { sendInvoice } from '@/lib/admin/actions/send'
import { markInvoicePaid, voidInvoice } from '@/lib/admin/actions/invoices'

export default function InvoiceActions({
  invoiceId,
  status,
  reference,
  clientEmail,
  clientName,
}: {
  invoiceId: string
  status: string // effective status (overdue already computed)
  reference: string
  clientEmail: string | null
  clientName: string
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'send' | 'paid' | 'void' | null>(null)
  const [pending, setPending] = useState(false)
  const pdfUrl = `/admin/api/invoices/${invoiceId}/pdf`
  const closed = status === 'paid' || status === 'void'

  function openSend() {
    if (!clientEmail) {
      toast.error(`${clientName} has no email — add one on their client page first.`)
      return
    }
    setDialog('send')
  }

  async function confirmSend() {
    setPending(true)
    const result = await sendInvoice(invoiceId)
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success(`Invoice emailed to ${clientEmail}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function confirmPaid(method: 'bank_transfer' | 'cash') {
    setPending(true)
    const result = await markInvoicePaid({ id: invoiceId, method })
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success('Marked as paid 🎉')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function confirmVoid() {
    setPending(true)
    const result = await voidInvoice(invoiceId)
    setPending(false)
    setDialog(null)
    if (result.ok) {
      toast.success('Invoice voided')
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

      {!closed && (
        <>
          <button
            onClick={openSend}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
          >
            <Send className="h-5 w-5" />
            {status === 'draft' ? 'Send to client' : 'Send again'}
          </button>
          <button
            onClick={() => setDialog('paid')}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-sm border border-status-green/40 font-body text-[15px] font-semibold text-status-green transition-colors hover:bg-status-green/10"
          >
            <Banknote className="h-5 w-5" />
            Mark as paid
          </button>
          <button
            onClick={() => setDialog('void')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-sm font-body text-[13px] text-admin-muted transition-colors hover:text-status-red"
          >
            <Ban className="h-4 w-4" />
            Void this invoice
          </button>

          {/* Mobile: primary actions ride a sticky bar above the tab bar
              (§2.3). Draft → send; sent/overdue → chase or settle. */}
          <div className="fixed inset-x-0 bottom-16 z-30 border-t border-admin-hairline bg-admin-canvas/95 px-4 py-3 backdrop-blur-lg md:hidden">
            {status === 'draft' ? (
              <button
                onClick={openSend}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors active:bg-brushly-gold-light"
              >
                <Send className="h-5 w-5" />
                Send to client
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openSend}
                  className="flex h-13 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[14px] font-semibold text-brushly-black transition-colors active:bg-brushly-gold-light"
                >
                  <Send className="h-4 w-4" />
                  Send again
                </button>
                <button
                  onClick={() => setDialog('paid')}
                  className="flex h-13 items-center justify-center gap-2 rounded-sm border border-status-green/40 font-body text-[14px] font-semibold text-status-green transition-colors active:bg-status-green/10"
                >
                  <Banknote className="h-4 w-4" />
                  Mark as paid
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={dialog === 'send'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Send ${reference}?`}
        body={`This emails the invoice PDF to ${clientEmail} from hello@brushly.uk.`}
        confirmLabel="Send it"
        pending={pending}
        onConfirm={confirmSend}
      />
      <ConfirmDialog
        open={dialog === 'void'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Void this invoice?"
        body="The invoice stays on record but no longer counts as money owed. You can't undo this from the app."
        confirmLabel="Yes — void it"
        pending={pending}
        destructive
        onConfirm={confirmVoid}
      />

      {/* Mark paid: two big labelled choices, no dropdowns (§1.9). */}
      <Dialog.Root open={dialog === 'paid'} onOpenChange={(open) => !open && setDialog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="admin-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="admin-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/10 bg-admin-card p-5 shadow-2xl shadow-black/50">
            <Dialog.Title className="font-display text-xl font-light text-brushly-cream">
              How did they pay?
            </Dialog.Title>
            <Dialog.Description className="mt-1 font-body text-[13px] text-admin-muted">
              {reference} gets marked as paid today.
            </Dialog.Description>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => confirmPaid('bank_transfer')}
                disabled={pending}
                className="flex h-13 items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
              >
                <Landmark className="h-5 w-5" />
                Bank transfer
              </button>
              <button
                onClick={() => confirmPaid('cash')}
                disabled={pending}
                className="flex h-13 items-center justify-center gap-2 rounded-sm border border-brushly-gold/50 font-body text-[15px] font-semibold text-brushly-gold transition-colors hover:bg-brushly-gold/10 disabled:opacity-60"
              >
                <Banknote className="h-5 w-5" />
                Cash
              </button>
              <Dialog.Close asChild>
                <button className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
