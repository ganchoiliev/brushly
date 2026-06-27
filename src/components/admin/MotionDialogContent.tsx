'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import useReducedMotion from '@/hooks/useReducedMotion'

/* Shared dialog chrome with a framer spring (§2.3): ~250ms enter,
   instant exit (Radix unmounts on close), nothing under reduced
   motion. Render inside a <Dialog.Portal>. */
export default function MotionDialogContent({
  children,
}: {
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <>
      <Dialog.Overlay asChild>
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="admin-cursor fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        />
      </Dialog.Overlay>
      <Dialog.Content asChild>
        <motion.div
          initial={
            reduced ? false : { opacity: 0, scale: 0.95, x: '-50%', y: '-47%' }
          }
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: 'spring', duration: 0.25, bounce: 0.25 }
          }
          className="admin-cursor fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-sm border border-white/10 bg-admin-card p-5 shadow-2xl shadow-black/50"
        >
          {children}
        </motion.div>
      </Dialog.Content>
    </>
  )
}
