import type { Metadata } from 'next'
import LoginForm from '@/components/admin/LoginForm'

export const metadata: Metadata = {
  title: 'Log in',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="font-display text-6xl font-medium text-brushly-gold">
            B
          </span>
          <p className="mt-2 font-body text-[12px] font-medium uppercase tracking-[0.3em] text-brushly-cream/60">
            Brushly Admin
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
