import Link from 'next/link'
import MarketingChrome from '@/components/layout/MarketingChrome'
import PageTransitionWipe from '@/components/animations/PageTransitionWipe'

/* Root not-found: handles every unmatched URL for the whole app. Lives at
   the app root because a not-found.tsx inside a route group is not used
   for unknown URLs — but the branded 404 must keep the full marketing
   experience, so it wraps itself in the marketing chrome. */
export default function NotFound() {
  return (
    <MarketingChrome>
      <div className="flex min-h-screen flex-col items-center justify-center bg-brushly-charcoal px-6 text-center">
        <span className="font-display text-[clamp(120px,20vw,280px)] font-light leading-none text-brushly-gold/20">
          404
        </span>
        <h1 className="mt-4 font-display text-4xl font-light text-brushly-cream md:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-[15px] font-body leading-relaxed text-brushly-cream/50">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-10 text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-black bg-brushly-gold px-8 py-4 transition-all duration-300 hover:bg-brushly-gold-light"
        >
          Return Home
        </Link>
      </div>
      <PageTransitionWipe />
    </MarketingChrome>
  )
}
