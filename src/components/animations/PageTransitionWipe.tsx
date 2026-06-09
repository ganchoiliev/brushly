'use client'

import useReducedMotion from '@/hooks/useReducedMotion'

/* Page transition wipe overlay — skip when reduced motion */
export default function PageTransitionWipe() {
  const reduced = useReducedMotion()

  if (reduced) return null

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-brushly-gold"
      style={{
        animation: 'wipe-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both',
      }}
    >
      <span className="font-display text-4xl font-light tracking-[0.3em] text-brushly-charcoal md:text-6xl">
        BRUSHLY
      </span>
    </div>
  )
}
