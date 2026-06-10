'use client'

import { motion, useReducedMotion } from 'framer-motion'

/* 200ms page-enter fade — opacity only, so sticky headers (which break
   under animated transforms) stay put. Skipped for reduced motion. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
