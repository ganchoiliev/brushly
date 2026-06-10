'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import useReducedMotion from '@/hooks/useReducedMotion'
import { formatGBP } from '@/lib/admin/format'
import { UNIT_LABEL } from '@/lib/admin/pdf/constants'
import type { ItemPreset } from '@/lib/supabase/types'

/* "Add from saved" (v1.2 §5): bottom sheet on mobile, popover on
   desktop — same trigger look, same rows. Tapping a preset inserts it
   as a normal, editable line. */

const triggerClass =
  'flex h-12 shrink-0 items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 px-4 font-body text-[14px] text-brushly-cream/70 transition-colors hover:border-brushly-gold hover:text-brushly-gold'

const EMPTY_COPY = 'Save the lines you quote all the time — add one from any quote.'

function PresetRows({
  presets,
  onPick,
}: {
  presets: ItemPreset[]
  onPick: (preset: ItemPreset) => void
}) {
  if (presets.length === 0) {
    return (
      <p className="px-3 py-6 text-center font-body text-[13px] leading-relaxed text-admin-muted">
        {EMPTY_COPY}
      </p>
    )
  }
  return (
    <div className="space-y-1">
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p)}
          className="flex h-12 w-full items-center justify-between gap-3 rounded-sm px-3 font-body text-[14px] text-brushly-cream transition-colors hover:bg-admin-raised"
        >
          <span className="truncate text-left">{p.description}</span>
          <span className="shrink-0 text-[12px] tabular-nums text-admin-muted">
            {UNIT_LABEL[p.unit] ?? p.unit} · {formatGBP(p.unit_price_pence)}
          </span>
        </button>
      ))}
    </div>
  )
}

export default function PresetPicker({
  presets,
  onPick,
}: {
  presets: ItemPreset[]
  onPick: (preset: ItemPreset) => void
}) {
  const reduced = useReducedMotion()
  const [sheetOpen, setSheetOpen] = useState(false)

  function pick(preset: ItemPreset) {
    onPick(preset)
    setSheetOpen(false)
  }

  return (
    <>
      {/* Mobile: bottom sheet. */}
      <div className="md:hidden">
        <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
          <Dialog.Trigger asChild>
            <button className={triggerClass}>
              <Bookmark className="h-4 w-4" />
              Add from saved
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay asChild>
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0.15 }
                }
                className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-md border-t border-white/10 bg-admin-card p-4 pb-8"
              >
                <Dialog.Title className="mb-3 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
                  Saved items
                </Dialog.Title>
                <PresetRows presets={presets} onPick={pick} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Desktop: popover anchored to the trigger. */}
      <div className="hidden md:block">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={`${triggerClass} data-[state=open]:border-brushly-gold data-[state=open]:text-brushly-gold`}>
              <Bookmark className="h-4 w-4" />
              Add from saved
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 max-h-80 w-80 overflow-y-auto rounded-sm border border-white/10 bg-admin-card p-1 shadow-2xl shadow-black/50"
            >
              {presets.length === 0 ? (
                <p className="px-3 py-6 text-center font-body text-[13px] leading-relaxed text-admin-muted">
                  {EMPTY_COPY}
                </p>
              ) : (
                presets.map((p) => (
                  <DropdownMenu.Item
                    key={p.id}
                    onSelect={() => onPick(p)}
                    className="flex h-12 cursor-pointer select-none items-center justify-between gap-3 rounded-sm px-3 font-body text-[14px] text-brushly-cream outline-none transition-colors data-[highlighted]:bg-admin-raised"
                  >
                    <span className="truncate">{p.description}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-admin-muted">
                      {UNIT_LABEL[p.unit] ?? p.unit} · {formatGBP(p.unit_price_pence)}
                    </span>
                  </DropdownMenu.Item>
                ))
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  )
}
