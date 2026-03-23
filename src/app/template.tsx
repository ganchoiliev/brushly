'use client'

import { motion } from 'framer-motion'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      {/* Page transition wipe overlay */}
      <motion.div
        className="fixed inset-0 z-[9000] flex items-center justify-center bg-brushly-gold"
        initial={{ y: '100%' }}
        animate={{ y: '-100%' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <span className="font-display text-4xl font-light tracking-[0.3em] text-brushly-charcoal md:text-6xl">
          BRUSHLY
        </span>
      </motion.div>
    </>
  )
}
