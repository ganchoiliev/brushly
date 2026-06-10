'use client'

import * as Dialog from '@radix-ui/react-dialog'

/* §1.9: anything irreversible gets a clear, plain-English confirmation. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  pending,
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel: string
  pending?: boolean
  destructive?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="admin-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/10 bg-admin-card p-5 shadow-2xl shadow-black/50">
          <Dialog.Title className="font-display text-xl font-light text-brushly-cream">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 font-body text-[14px] leading-relaxed text-admin-muted">
            {body}
          </Dialog.Description>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={onConfirm}
              disabled={pending}
              className={`h-13 rounded-sm font-body text-[15px] font-semibold transition-colors disabled:opacity-60 ${
                destructive
                  ? 'border border-status-red/40 text-status-red hover:bg-status-red/10'
                  : 'bg-brushly-gold text-brushly-black hover:bg-brushly-gold-light'
              }`}
            >
              {pending ? 'Working…' : confirmLabel}
            </button>
            <Dialog.Close asChild>
              <button className="h-12 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
