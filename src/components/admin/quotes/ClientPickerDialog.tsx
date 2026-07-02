'use client'

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import MotionDialogContent from '@/components/admin/MotionDialogContent'
import { searchClients } from '@/lib/admin/actions/clients'

type ClientHit = { id: string; name: string; phone: string | null; town: string | null }

/* Re-address a duplicate to a different existing client (§4 repeat work):
   search the client list, tap one, and the copy is theirs. The picked
   client's name/email/address come from the clients table on render — we
   only need the id here. Same debounced search the builder uses. */
export default function ClientPickerDialog({
  open,
  onOpenChange,
  pending,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onPick: (client: { id: string; name: string }) => void
}) {
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<ClientHit[]>([])
  const [searched, setSearched] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const version = useRef(0)

  /* Reset on each open so a previous search doesn't flash up stale. */
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset-on-open: the dialog stays mounted between opens, so state must clear when `open` flips
      setTerm('')
      setHits([])
      setSearched(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      // Ignore a slow response that lands after a newer keystroke fired.
      const ticket = ++version.current
      const result = await searchClients(term)
      if (ticket !== version.current) return
      if (result.ok) {
        setHits(result.data ?? [])
        setSearched(true)
      }
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [term, open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <MotionDialogContent>
          <Dialog.Title className="font-display text-xl font-light text-brushly-cream">
            Copy to another client
          </Dialog.Title>
          <Dialog.Description className="mt-1 font-body text-[13px] text-admin-muted">
            Same quote, re-addressed — pick who it&apos;s for and a fresh draft is theirs.
          </Dialog.Description>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Find a client…"
              className="h-12 w-full rounded-sm border border-white/10 bg-admin-raised pl-10 pr-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
            />
          </div>

          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {hits.map((c) => (
              <button
                key={c.id}
                onClick={() => onPick({ id: c.id, name: c.name })}
                disabled={pending}
                className="flex h-12 w-full items-center justify-between rounded-sm px-3 font-body text-[14px] text-brushly-cream transition-colors hover:bg-admin-raised disabled:opacity-50"
              >
                <span className="truncate">{c.name}</span>
                <span className="ml-2 shrink-0 text-[12px] text-admin-muted">
                  {[c.phone, c.town].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
            {searched && hits.length === 0 && (
              <p className="px-3 py-2 font-body text-[13px] text-admin-muted">
                No clients found.
              </p>
            )}
          </div>

          <div className="mt-4">
            <Dialog.Close asChild>
              <button className="h-12 w-full rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </MotionDialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
