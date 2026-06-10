import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-display text-7xl font-light text-brushly-gold/30">
        404
      </span>
      <h1 className="mt-4 font-display text-2xl font-light">Page not found</h1>
      <Link
        href="/admin"
        className="mt-8 flex h-12 items-center rounded-sm bg-brushly-gold px-6 font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
      >
        Back to Home
      </Link>
    </div>
  )
}
