'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
    if (error) {
      setError('Wrong email or password — try again.')
      setPending(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-white/8 bg-admin-card p-6"
    >
      <label className="block">
        <span className="font-body text-[13px] font-medium text-brushly-cream/70">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          className="mt-2 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-4 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
        />
      </label>
      <label className="mt-4 block">
        <span className="font-body text-[13px] font-medium text-brushly-cream/70">
          Password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-2 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-4 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
        />
      </label>
      {error && (
        <p className="mt-4 rounded-sm border border-status-red/30 bg-status-red/10 px-3 py-2 font-body text-[13px] text-status-red">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-12 w-full rounded-sm bg-brushly-gold font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
