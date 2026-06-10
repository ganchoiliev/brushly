'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Plus,
  Minus,
  Trash2,
  GripVertical,
  MoreVertical,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import useReducedMotion from '@/hooks/useReducedMotion'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import { createQuote, updateQuote } from '@/lib/admin/actions/quotes'
import { createInvoice } from '@/lib/admin/actions/invoices'
import { searchClients } from '@/lib/admin/actions/clients'
import { formatGBP, formatPounds, parseGBPToPence, addDays, todayLondon } from '@/lib/admin/format'
import type { ItemUnit } from '@/lib/supabase/types'

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'job', label: 'Job' },
  { value: 'day', label: 'Day' },
  { value: 'room', label: 'Room' },
  { value: 'm2', label: 'm²' },
  { value: 'item', label: 'Item' },
]

type ClientHit = {
  id: string
  name: string
  phone: string | null
  email: string | null
  town: string | null
}

type ClientChoice =
  | { kind: 'existing'; id: string; name: string }
  | { kind: 'new'; name: string; phone: string; email: string; address_line1: string; town: string; postcode: string }
  | null

type ItemDraft = {
  key: number
  description: string
  qty: string
  unit: ItemUnit
  price: string // pounds, as typed
}

export type QuoteBuilderProps = {
  /* 'invoice' reuses the whole builder for standalone invoices: due date
     instead of valid-until, no terms field (invoices print the settings
     terms), createInvoice on save. */
  kind?: 'quote' | 'invoice'
  settings: { vat_registered: boolean; default_terms: string | null }
  lead?: { id: string; name: string; phone: string | null; email: string | null; service: string | null } | null
  candidateClients?: ClientHit[]
  initialClient?: { id: string; name: string } | null
  quote?: {
    id: string
    title: string
    valid_until: string | null
    vat_rate: number
    notes: string | null
    terms: string | null
    client: { id: string; name: string }
    items: { description: string; qty: number; unit: ItemUnit; unit_price_pence: number }[]
  } | null
}

let keyCounter = 1
const newItem = (): ItemDraft => ({
  key: keyCounter++,
  description: '',
  qty: '1',
  unit: 'job',
  price: '',
})

/* w-full lives apart from the base so fixed-width fields (qty, unit)
   can opt out — stacking w-16 onto w-full hands the choice to stylesheet
   order, which is how the price field once collapsed to 42px. */
const inputBase =
  'rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'
const inputClass = `w-full ${inputBase}`

/* Money/number fields: the whole value is the unit of editing — a tap
   replaces it rather than appending to it. */
const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
  e.currentTarget.select()

const menuItemClass =
  'flex h-11 cursor-pointer select-none items-center rounded-sm px-3 font-body text-[14px] text-brushly-cream outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-admin-raised'

export default function QuoteBuilder({
  kind = 'quote',
  settings,
  lead,
  candidateClients = [],
  initialClient,
  quote,
}: QuoteBuilderProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const editing = !!quote
  const isInvoice = kind === 'invoice'
  const vatRate = quote ? quote.vat_rate : settings.vat_registered ? 20 : 0

  const [client, setClient] = useState<ClientChoice>(
    quote
      ? { kind: 'existing', id: quote.client.id, name: quote.client.name }
      : initialClient
        ? { kind: 'existing', id: initialClient.id, name: initialClient.name }
        : null
  )
  // Lead conversion with possible duplicates: make him choose, once.
  const [showCandidates, setShowCandidates] = useState(
    !quote && !initialClient && !!lead && candidateClients.length > 0
  )
  const [title, setTitle] = useState(quote?.title ?? lead?.service ?? '')
  const [items, setItems] = useState<ItemDraft[]>(
    quote
      ? quote.items.map((it) => ({
          key: keyCounter++,
          description: it.description,
          qty: String(it.qty),
          unit: it.unit,
          price: formatPounds(it.unit_price_pence),
        }))
      : [newItem()]
  )
  const [validUntil, setValidUntil] = useState(
    quote ? (quote.valid_until ?? '') : addDays(todayLondon(), isInvoice ? 14 : 30)
  )
  const [notes, setNotes] = useState(quote?.notes ?? '')
  const [terms, setTerms] = useState(
    quote ? (quote.terms ?? '') : (settings.default_terms ?? '')
  )
  const [pending, setPending] = useState(false)
  /* The freshly added card focuses its description (§2); removal of a card
     with content asks first — confirmRemoveKey holds whose dialog is open. */
  const [autofocusKey, setAutofocusKey] = useState<number | null>(null)
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<number | null>(null)

  function patchItem(key: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  function moveItem(key: number, dir: -1 | 1) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.key === key)
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function removeItem(key: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((x) => x.key !== key)))
  }
  /* Steppers move in whole numbers; typed decimals (1.5) survive them. */
  function stepQty(key: number, dir: -1 | 1) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it
        const cur = parseFloat(it.qty)
        const next = Number.isFinite(cur) ? cur + dir : 1
        if (next <= 0) return it
        return { ...it, qty: String(next) }
      })
    )
  }
  function addLine() {
    const it = newItem()
    setItems((prev) => [...prev, it])
    setAutofocusKey(it.key)
  }

  const lineTotals = items.map((it) => {
    const pence = parseGBPToPence(it.price)
    const qty = parseFloat(it.qty)
    if (pence === null || !Number.isFinite(qty) || qty <= 0) return null
    return Math.round(qty * pence)
  })
  const subtotal = lineTotals.reduce((sum: number, t) => sum + (t ?? 0), 0)
  const vat = Math.round((subtotal * vatRate) / 100)
  const total = subtotal + vat

  /* Explicit save state (§2.3): compare against what was loaded. The first
     render's snapshot is the clean baseline — edits diverge from it. */
  const snapshot = JSON.stringify({
    client: client === null ? null : client.kind === 'existing' ? client.id : client,
    title,
    validUntil,
    notes,
    terms,
    items: items.map((it) => [it.description, it.qty, it.unit, it.price]),
  })
  const [cleanSnapshot] = useState(snapshot)
  const dirty = snapshot !== cleanSnapshot

  async function save() {
    if (!client) {
      toast.error('Choose who the quote is for')
      return
    }
    if (!title.trim()) {
      toast.error(`Give the ${isInvoice ? 'invoice' : 'quote'} a title`)
      return
    }
    const cleanItems = []
    for (const [i, it] of items.entries()) {
      if (!it.description.trim() && !it.price) continue // skip fully empty rows
      const pence = parseGBPToPence(it.price)
      const qty = parseFloat(it.qty)
      if (!it.description.trim()) {
        toast.error(`Line ${i + 1} needs a description`)
        return
      }
      if (pence === null) {
        toast.error(`Line ${i + 1} needs a price like 1,250.50`)
        return
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Line ${i + 1} needs a quantity`)
        return
      }
      cleanItems.push({
        description: it.description.trim(),
        qty,
        unit: it.unit,
        unit_price_pence: pence,
      })
    }
    if (cleanItems.length === 0) {
      toast.error('Add at least one line')
      return
    }

    setPending(true)
    const clientPayload =
      client.kind === 'existing'
        ? { mode: 'existing' as const, id: client.id }
        : {
            mode: 'new' as const,
            name: client.name,
            phone: client.phone || null,
            email: client.email || null,
            address_line1: client.address_line1 || null,
            town: client.town || null,
            postcode: client.postcode || null,
          }
    const result = isInvoice
      ? await createInvoice({
          client: clientPayload,
          title: title.trim(),
          due_date: validUntil || null,
          vat_rate: vatRate,
          items: cleanItems,
          notes: notes || null,
        })
      : editing
        ? await updateQuote({
            id: quote!.id,
            title: title.trim(),
            valid_until: validUntil || null,
            vat_rate: vatRate,
            items: cleanItems,
            notes: notes || null,
            terms: terms || null,
          })
        : await createQuote({
            title: title.trim(),
            valid_until: validUntil || null,
            vat_rate: vatRate,
            items: cleanItems,
            notes: notes || null,
            terms: terms || null,
            lead_id: lead?.id ?? null,
            client: clientPayload,
          })
    if (!result.ok) {
      toast.error(result.error)
      setPending(false)
      return
    }
    toast.success(
      isInvoice ? 'Invoice created' : editing ? 'Quote saved' : 'Quote created'
    )
    const id = editing ? quote!.id : (result as { data: { id: string } }).data.id
    router.replace(`/admin/${isInvoice ? 'invoices' : 'quotes'}/${id}`)
    router.refresh()
  }

  return (
    <div className="space-y-5 px-4 py-5 md:max-w-2xl md:px-8">
      {/* Who it's for */}
      <section>
        <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          For
        </h2>
        {showCandidates && lead ? (
          <div className="rounded-sm border border-brushly-gold/30 bg-admin-card p-4">
            <p className="font-body text-[14px] text-brushly-cream">
              Looks like {lead.name} might already be a client:
            </p>
            <div className="mt-3 space-y-2">
              {candidateClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setClient({ kind: 'existing', id: c.id, name: c.name })
                    setShowCandidates(false)
                  }}
                  className="flex h-13 w-full items-center justify-between rounded-sm border border-white/10 px-4 font-body text-[14px] text-brushly-cream transition-colors hover:border-brushly-gold"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-2 shrink-0 text-[12px] text-admin-muted">
                    {[c.phone, c.town].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  setClient({
                    kind: 'new',
                    name: lead.name,
                    phone: lead.phone ?? '',
                    email: lead.email ?? '',
                    address_line1: '',
                    town: '',
                    postcode: '',
                  })
                  setShowCandidates(false)
                }}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-sm border border-white/10 font-body text-[14px] text-brushly-cream/70 transition-colors hover:border-white/30"
              >
                <UserPlus className="h-4 w-4" />
                No — create a new client
              </button>
            </div>
          </div>
        ) : client === null ? (
          <ClientPicker
            onPick={(c) => setClient({ kind: 'existing', id: c.id, name: c.name })}
            onNew={() =>
              setClient({
                kind: 'new',
                name: lead?.name ?? '',
                phone: lead?.phone ?? '',
                email: lead?.email ?? '',
                address_line1: '',
                town: '',
                postcode: '',
              })
            }
          />
        ) : client.kind === 'existing' ? (
          <div className="flex h-13 items-center justify-between rounded-sm border border-admin-hairline bg-admin-card px-4">
            <span className="truncate font-body text-[15px] font-medium text-brushly-cream">
              {client.name}
            </span>
            {!editing && (
              <button
                onClick={() => setClient(null)}
                aria-label="Change client"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-admin-muted hover:bg-admin-raised"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-sm border border-admin-hairline bg-admin-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
                New client
              </span>
              <button
                onClick={() => setClient(null)}
                aria-label="Cancel new client"
                className="flex h-11 w-11 items-center justify-center rounded-sm text-admin-muted hover:bg-admin-raised"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              placeholder="Name"
              value={client.name}
              onChange={(e) => setClient({ ...client, name: e.target.value })}
              className={`${inputClass} mt-2 h-12`}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                placeholder="Phone"
                type="tel"
                inputMode="tel"
                value={client.phone}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                className={`${inputClass} h-12`}
              />
              <input
                placeholder="Email"
                type="email"
                inputMode="email"
                value={client.email}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                className={`${inputClass} h-12`}
              />
            </div>
            <input
              placeholder="Address line 1"
              value={client.address_line1}
              onChange={(e) => setClient({ ...client, address_line1: e.target.value })}
              className={`${inputClass} mt-2 h-12`}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                placeholder="Town"
                value={client.town}
                onChange={(e) => setClient({ ...client, town: e.target.value })}
                className={`${inputClass} h-12`}
              />
              <input
                placeholder="Postcode"
                value={client.postcode}
                onChange={(e) => setClient({ ...client, postcode: e.target.value })}
                className={`${inputClass} h-12`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Title */}
      <section>
        <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          What&apos;s the job?
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full interior repaint — 3-bed, Reigate"
          className={`${inputClass} h-13`}
        />
      </section>

      {/* Line items */}
      <section>
        <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Work &amp; prices
        </h2>
        {/* Cards reorder by dragging the left-edge handle (mouse grabs
            instantly, touch holds briefly so scrolling stays free); the
            overflow menu keeps Move up/down as the accessible fallback.
            Enter/exit at 200ms, skipped under reduced motion (§2.3). */}
        <Reorder.Group
          as="div"
          axis="y"
          values={items}
          onReorder={setItems}
          className="space-y-3"
        >
          <AnimatePresence initial={false}>
            {items.map((it, i) => (
              <LineItemCard
                key={it.key}
                item={it}
                index={i}
                count={items.length}
                lineTotal={lineTotals[i]}
                autofocus={it.key === autofocusKey}
                reducedMotion={reducedMotion}
                onPatch={(patch) => patchItem(it.key, patch)}
                onStepQty={(dir) => stepQty(it.key, dir)}
                onMove={(dir) => moveItem(it.key, dir)}
                onRemove={() => {
                  if (it.description.trim() || it.price.trim()) {
                    setConfirmRemoveKey(it.key)
                  } else {
                    removeItem(it.key)
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        <button
          onClick={addLine}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 font-body text-[14px] text-brushly-cream/70 transition-colors hover:border-brushly-gold hover:text-brushly-gold"
        >
          <Plus className="h-4 w-4" />
          Add line
        </button>
      </section>

      {/* Valid until / due date */}
      <section>
        <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          {isInvoice ? 'Due date' : 'Valid until'}
        </h2>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className={`${inputClass} h-13`}
        />
      </section>

      {/* Notes & terms */}
      <section>
        <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Notes for the client (optional)
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={`${inputClass} py-3`}
        />
      </section>
      {!isInvoice && (
        <section>
          <h2 className="mb-2 font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            Terms (printed on the quote)
          </h2>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={3}
            className={`${inputClass} py-3`}
          />
        </section>
      )}

      {/* Totals + save. Unstuck (v1.2 §1): the floating bar overlapped the
          meta sections beneath it — nothing may ever overlap interactive
          content. §3 restructures this block properly. */}
      <div className="rounded-sm border border-admin-hairline bg-admin-card p-4">
        <div className="space-y-1 font-body text-[13px]">
          <div className="flex justify-between text-brushly-cream/70">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatGBP(subtotal)}</span>
          </div>
          {vatRate > 0 && (
            <div className="flex justify-between text-brushly-cream/70">
              <span>VAT {vatRate}%</span>
              <span className="tabular-nums">{formatGBP(vat)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-admin-hairline pt-1.5 text-[16px] font-semibold text-brushly-gold">
            <span>Total</span>
            <span className="tabular-nums">{formatGBP(total)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span
            aria-live="polite"
            className={`font-body text-[12px] ${
              dirty ? 'text-status-amber' : 'text-status-green'
            }`}
          >
            {dirty ? 'Unsaved changes' : editing ? 'Saved ✓' : ''}
          </span>
          <button
            onClick={save}
            disabled={pending}
            className="ml-auto h-13 shrink-0 rounded-sm bg-brushly-gold px-6 font-body text-[15px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
          >
            {pending
              ? 'Saving…'
              : isInvoice
                ? 'Save invoice'
                : editing
                  ? 'Save changes'
                  : 'Save quote'}
          </button>
        </div>
      </div>

      {/* Confirm only when the line has content (§2) — empty lines just go. */}
      <ConfirmDialog
        open={confirmRemoveKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveKey(null)
        }}
        title="Remove this line?"
        body="It has work or a price on it — removing can't be undone."
        confirmLabel="Remove line"
        destructive
        onConfirm={() => {
          if (confirmRemoveKey !== null) removeItem(confirmRemoveKey)
          setConfirmRemoveKey(null)
        }}
      />
    </div>
  )
}

function LineItemCard({
  item,
  index,
  count,
  lineTotal,
  autofocus,
  reducedMotion,
  onPatch,
  onStepQty,
  onMove,
  onRemove,
}: {
  item: ItemDraft
  index: number
  count: number
  lineTotal: number | null
  autofocus: boolean
  reducedMotion: boolean
  onPatch: (patch: Partial<ItemDraft>) => void
  onStepQty: (dir: -1 | 1) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const controls = useDragControls()
  const pressTimer = useRef<number | null>(null)

  /* Mouse picks the card up instantly; touch holds ~200ms first so the
     handle doesn't fight page scrolling on phones. */
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') {
      const evt = e.nativeEvent
      pressTimer.current = window.setTimeout(() => controls.start(evt), 200)
    } else {
      controls.start(e)
    }
  }
  function cancelPress() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const qtyNum = parseFloat(item.qty)

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }
      }
      whileDrag={reducedMotion ? undefined : { scale: 1.02 }}
      className="relative flex rounded-sm border border-admin-hairline bg-admin-card"
    >
      <div
        aria-hidden
        onPointerDown={handlePointerDown}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        className="flex w-8 shrink-0 cursor-grab touch-none select-none items-center justify-center self-stretch text-admin-muted/50 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="flex items-start gap-2">
          <textarea
            placeholder="What's being done"
            value={item.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            rows={2}
            autoFocus={autofocus}
            className={`${inputClass} min-h-12 flex-1 py-2.5 leading-snug [field-sizing:content]`}
          />
          <button
            onClick={onRemove}
            disabled={count === 1}
            aria-label="Remove line"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-admin-muted transition-colors hover:bg-admin-raised hover:text-status-red disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-12 shrink-0 items-stretch overflow-hidden rounded-sm border border-white/10 bg-admin-raised transition-colors focus-within:border-brushly-gold">
            <button
              type="button"
              onClick={() => onStepQty(-1)}
              disabled={Number.isFinite(qtyNum) && qtyNum <= 1}
              aria-label="Decrease quantity"
              className="flex w-7 items-center justify-center text-admin-muted transition-colors hover:text-brushly-cream disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              value={item.qty}
              onChange={(e) => onPatch({ qty: e.target.value })}
              onFocus={selectAllOnFocus}
              inputMode="decimal"
              aria-label="Quantity"
              className="w-9 bg-transparent text-center font-body text-[16px] tabular-nums text-brushly-cream outline-none"
            />
            <button
              type="button"
              onClick={() => onStepQty(1)}
              aria-label="Increase quantity"
              className="flex w-7 items-center justify-center text-admin-muted transition-colors hover:text-brushly-cream"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <select
            value={item.unit}
            onChange={(e) => onPatch({ unit: e.target.value as ItemUnit })}
            aria-label="Unit"
            className={`${inputBase} h-12 w-18 appearance-none`}
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          {/* Price owns the row's spare width (§1/§2): it must fit
              "12,500.00" while the digits are being typed. */}
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-[15px] text-admin-muted">
              £
            </span>
            <input
              value={item.price}
              onChange={(e) => onPatch({ price: e.target.value })}
              onFocus={selectAllOnFocus}
              onBlur={() => {
                const pence = parseGBPToPence(item.price)
                if (pence !== null) onPatch({ price: formatPounds(pence) })
              }}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Price"
              className={`${inputClass} h-12 pl-7 text-right tabular-nums`}
            />
          </div>
        </div>
        {/* Overflow (accessible reorder fallback; §5 adds Save as preset)
            sits quietly bottom-left; the live line total holds bottom-right. */}
        <div className="mt-1 flex items-center justify-between">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Line options"
                className="-ml-2 flex h-10 w-10 items-center justify-center rounded-sm text-admin-muted/70 transition-colors hover:bg-admin-raised hover:text-brushly-cream data-[state=open]:bg-admin-raised"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={4}
                className="z-50 min-w-40 rounded-sm border border-white/10 bg-admin-card p-1 shadow-2xl shadow-black/50"
              >
                <DropdownMenu.Item
                  disabled={index === 0}
                  onSelect={() => onMove(-1)}
                  className={menuItemClass}
                >
                  Move up
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  disabled={index === count - 1}
                  onSelect={() => onMove(1)}
                  className={menuItemClass}
                >
                  Move down
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {lineTotal !== null && (
            <div className="flex items-baseline gap-2">
              <span className="font-body text-[12px] text-admin-muted">Line total</span>
              <span className="font-body text-[14px] font-semibold tabular-nums text-brushly-cream">
                {formatGBP(lineTotal)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}

function ClientPicker({
  onPick,
  onNew,
}: {
  onPick: (c: ClientHit) => void
  onNew: () => void
}) {
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<ClientHit[]>([])
  const [searched, setSearched] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const version = useRef(0)

  useEffect(() => {
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
  }, [term])

  return (
    <div className="rounded-sm border border-admin-hairline bg-admin-card p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Find a client…"
          className={`${inputClass} h-12 pl-10`}
        />
      </div>
      <div className="mt-2 space-y-1">
        {hits.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="flex h-12 w-full items-center justify-between rounded-sm px-3 font-body text-[14px] text-brushly-cream transition-colors hover:bg-admin-raised"
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
      <button
        onClick={onNew}
        className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 font-body text-[14px] text-brushly-cream/70 transition-colors hover:border-brushly-gold hover:text-brushly-gold"
      >
        <UserPlus className="h-4 w-4" />
        New client
      </button>
    </div>
  )
}
