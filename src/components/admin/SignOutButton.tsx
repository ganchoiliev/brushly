'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  async function signOut() {
    await createClient().auth.signOut()
    // Full reload so every server component re-renders signed out.
    window.location.href = '/admin/login'
  }

  return (
    <button
      onClick={signOut}
      className="flex h-12 w-full items-center gap-3 rounded-sm px-3 font-body text-[14px] text-brushly-cream/70 transition-colors hover:bg-admin-raised hover:text-brushly-cream"
    >
      <LogOut className="h-5 w-5" strokeWidth={1.8} />
      Sign out
    </button>
  )
}
