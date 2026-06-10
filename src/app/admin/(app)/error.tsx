'use client'

import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error boundary:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-display text-4xl font-light text-brushly-gold/40">
        Hmm.
      </span>
      <h1 className="mt-4 font-display text-2xl font-light">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-xs font-body text-[14px] leading-relaxed text-admin-muted">
        Usually a blip in the connection. Your data is safe — try again.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 flex h-13 items-center gap-2 rounded-sm bg-brushly-gold px-6 font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}
