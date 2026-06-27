'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { acceptPublicQuote } from './actions'

/* The one action a client can take on the public page. No Sonner here (this
   page mounts no Toaster) — feedback is inline. On success we both flip local
   state and refresh so the server re-renders the accepted view. */
export default function AcceptQuote({
  token,
  reference,
}: {
  token: string
  reference: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function accept() {
    setError(null)
    start(async () => {
      const result = await acceptPublicQuote({ token })
      if (result.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-status-green/40 bg-status-green/10 px-4 py-4">
        <Check className="h-5 w-5 shrink-0 text-status-green" />
        <p className="font-body text-[14px] text-brushly-cream">
          Thank you — {reference} is accepted. We&apos;ll be in touch shortly to book you in.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={accept}
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-sm bg-brushly-gold font-body text-[16px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
      >
        <Check className="h-5 w-5" />
        {pending ? 'Accepting…' : 'Accept this quote'}
      </button>
      {error && (
        <p className="font-body text-[13px] text-status-red" role="alert">
          {error}
        </p>
      )}
      <p className="text-center font-body text-[13px] text-admin-muted">
        Prefer to talk it through? Call 01737 479 161.
      </p>
    </div>
  )
}
