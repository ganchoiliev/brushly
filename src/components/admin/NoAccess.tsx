import SignOutButton from '@/components/admin/SignOutButton'

export default function NoAccess({ email }: { email: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="font-display text-5xl font-medium text-brushly-gold">B</span>
      <h1 className="mt-6 font-display text-3xl font-light">
        This account doesn&apos;t have access
      </h1>
      <p className="mt-3 max-w-sm font-body text-[15px] leading-relaxed text-admin-muted">
        You&apos;re signed in as {email}, but that account isn&apos;t on the
        admin list. Ask Gancho to add it.
      </p>
      <div className="mt-8 w-full max-w-55">
        <SignOutButton />
      </div>
    </div>
  )
}
