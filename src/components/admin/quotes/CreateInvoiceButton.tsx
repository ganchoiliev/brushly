'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt } from 'lucide-react'
import { createInvoiceFromQuote } from '@/lib/admin/actions/invoices'

export default function CreateInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function create() {
    setPending(true)
    const result = await createInvoiceFromQuote(quoteId)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Draft invoice ready')
    router.push(`/admin/invoices/${result.data!.id}`)
    router.refresh()
  }

  return (
    <button
      onClick={create}
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
    >
      <Receipt className="h-5 w-5" />
      {pending ? 'Creating…' : 'Create invoice'}
    </button>
  )
}
