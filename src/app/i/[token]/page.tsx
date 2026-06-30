import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentPreview from '@/components/admin/quotes/DocumentPreview'
import { invoiceRef, effectiveInvoiceStatus } from '@/lib/admin/format'
import { clientAddressLines, type PdfInput } from '@/lib/admin/pdf/constants'

/* A token page is per-recipient — never cache. */
export const dynamic = 'force-dynamic'

/* Keep these out of search indexes — the link is meant to be private. */
export const metadata: Metadata = {
  title: 'Your Brushly invoice',
  robots: { index: false, follow: false },
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: 'Awaiting payment', className: 'border-brushly-gold/40 text-brushly-gold' },
  sent: { text: 'Awaiting payment', className: 'border-brushly-gold/40 text-brushly-gold' },
  overdue: { text: 'Overdue', className: 'border-status-red/40 text-status-red' },
  paid: { text: 'Paid', className: 'border-status-green/40 text-status-green' },
  void: { text: 'Void', className: 'border-white/15 text-admin-muted' },
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_invoice', { p_token: token })
  if (error || !data) notFound()

  const { invoice: inv, items, client, company } = data
  const ref = invoiceRef(inv.invoice_number)

  const input: PdfInput = {
    docType: 'INVOICE',
    reference: ref,
    /* Never stamp DRAFT on a client-facing copy — the link is the send. */
    draft: false,
    title: inv.title,
    issueDate: inv.issue_date,
    secondaryDate: inv.due_date ? { label: 'Due', value: inv.due_date } : null,
    company: {
      name: company.company_name,
      companyNumber: company.company_number,
      address: company.address,
      phone: company.phone,
      email: company.email,
      vatNumber: company.vat_registered ? company.vat_number : null,
    },
    client: {
      name: client.name,
      addressLines: clientAddressLines({ ...client, address_line2: client.address_line2 }),
      email: null,
      phone: null,
    },
    siteAddress: inv.site_address,
    items: items.map((it) => ({
      description: it.description,
      note: it.note,
      qty: Number(it.qty),
      unit: it.unit,
      unitPricePence: it.unit_price_pence,
      totalPence: it.total_pence,
    })),
    subtotalPence: inv.subtotal_pence,
    vatRate: Number(inv.vat_rate),
    vatPence: inv.vat_pence,
    totalPence: inv.total_pence,
    notes: inv.notes,
    /* Invoices print the settings default terms (no per-invoice terms). */
    terms: company.default_terms,
    /* The payment block: bank details + the "bank transfer or cash" line so
       the client can see the amount due and how to pay. No online payment. */
    payment: {
      bankName: company.bank_name,
      sortCode: company.bank_sort_code,
      accountNo: company.bank_account_no,
    },
  }

  const effective = effectiveInvoiceStatus(inv.status, inv.due_date)
  const status = STATUS_LABEL[effective] ?? STATUS_LABEL.sent

  return (
    /* admin-cursor: this page mounts no CustomCursor, so it must re-assert
       the native cursor that globals.css hides on pointer-fine devices. */
    <main className="admin-cursor min-h-screen bg-admin-canvas px-4 py-8 md:py-12">
      <div className="mx-auto max-w-[640px] space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-body text-[13px] text-admin-muted">
            Invoice <span className="tabular-nums text-brushly-cream/80">{ref}</span> from {company.company_name}
          </p>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 font-body text-[12px] font-medium ${status.className}`}
          >
            {status.text}
          </span>
        </div>

        <DocumentPreview chromeless input={input} pdfHref={null} />

        <footer className="pt-2 text-center font-body text-[12px] text-admin-muted">
          {company.company_name} · {company.phone} · {company.email}
        </footer>
      </div>
    </main>
  )
}
