import { formatGBP, formatDate } from '@/lib/admin/format'

/* Prefills for the send dialog (v1.2 §4.1/§4.2) — one source for the
   subject lines and the editable opening paragraph, so the dialog and
   anything else that needs them can't drift apart. Isomorphic: imported
   by the client dialog. */

export function defaultQuoteEmail(input: {
  reference: string
  title: string | null
  totalPence: number
  validUntil: string | null
}): { subject: string; message: string } {
  const job = input.title?.trim() || 'the work'
  const total = formatGBP(input.totalPence)
  return {
    subject: `Your quote from Brushly — ${input.reference}`,
    message: input.validUntil
      ? `Thanks for having us out. Your quote for ${job} is attached — it comes to ${total} and is valid until ${formatDate(input.validUntil)}.`
      : `Thanks for having us out. Your quote for ${job} is attached — it comes to ${total}.`,
  }
}

export function defaultInvoiceEmail(input: {
  reference: string
  title: string | null
  totalPence: number
  dueDate: string | null
}): { subject: string; message: string } {
  const job = input.title?.trim() || 'the work'
  const total = formatGBP(input.totalPence)
  return {
    subject: `Invoice ${input.reference} from Brushly — ${total}`,
    message: input.dueDate
      ? `Here's the invoice for ${job} — ${total}, due ${formatDate(input.dueDate)}.`
      : `Here's the invoice for ${job} — ${total}.`,
  }
}
