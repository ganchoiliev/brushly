'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronUp, ChevronDown, Trash2, Pencil } from 'lucide-react'
import ConfirmDialog from '@/components/admin/ConfirmDialog'
import {
  updateItemPreset,
  deleteItemPreset,
  reorderItemPresets,
} from '@/lib/admin/actions/presets'
import { formatGBP, formatPounds, parseGBPToPence } from '@/lib/admin/format'
import { UNIT_LABEL } from '@/lib/admin/pdf/constants'
import type { ItemPreset, ItemUnit } from '@/lib/supabase/types'

const inputClass =
  'mt-1 h-12 w-full rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold'

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'job', label: 'Job' },
  { value: 'day', label: 'Day' },
  { value: 'room', label: 'Room' },
  { value: 'm2', label: 'm²' },
  { value: 'item', label: 'Item' },
]

/* Settings → Saved items (v1.2 §5): list, edit, reorder, delete.
   Presets are conveniences, not records — delete is hard delete,
   confirmed because it can't be undone. */
export default function SavedItemsManager({ presets }: { presets: ItemPreset[] }) {
  const router = useRouter()
  const [list, setList] = useState(presets)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function move(id: string, dir: -1 | 1) {
    const i = list.findIndex((p) => p.id === id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
    const result = await reorderItemPresets(next.map((p) => p.id))
    if (!result.ok) {
      toast.error(result.error)
      setList(list)
    }
  }

  async function remove(id: string) {
    setPending(true)
    const result = await deleteItemPreset(id)
    setPending(false)
    setConfirmDeleteId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setList((prev) => prev.filter((p) => p.id !== id))
    toast.success('Preset deleted')
    router.refresh()
  }

  if (list.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-white/15 px-4 py-6 text-center font-body text-[13px] leading-relaxed text-admin-muted">
        Save the lines you quote all the time — add one from any quote.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {list.map((p, i) =>
        editingId === p.id ? (
          <PresetEditCard
            key={p.id}
            preset={p}
            onDone={(updated) => {
              if (updated) {
                setList((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
                router.refresh()
              }
              setEditingId(null)
            }}
          />
        ) : (
          <div
            key={p.id}
            className="flex items-center gap-1 rounded-sm border border-admin-hairline bg-admin-card p-2"
          >
            <div className="flex shrink-0 flex-col">
              <button
                onClick={() => move(p.id, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="flex h-9 w-9 items-center justify-center rounded-sm text-admin-muted hover:bg-admin-raised disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(p.id, 1)}
                disabled={i === list.length - 1}
                aria-label="Move down"
                className="flex h-9 w-9 items-center justify-center rounded-sm text-admin-muted hover:bg-admin-raised disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate font-body text-[14px] text-brushly-cream">
                {p.description}
              </p>
              <p className="font-body text-[12px] tabular-nums text-admin-muted">
                {UNIT_LABEL[p.unit] ?? p.unit} · {formatGBP(p.unit_price_pence)}
              </p>
            </div>
            <button
              onClick={() => setEditingId(p.id)}
              aria-label={`Edit ${p.description}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-admin-muted transition-colors hover:bg-admin-raised hover:text-brushly-cream"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDeleteId(p.id)}
              aria-label={`Delete ${p.description}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-admin-muted transition-colors hover:bg-admin-raised hover:text-status-red"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null)
        }}
        title="Delete this preset?"
        body="It disappears from Add from saved. Quotes that already use it keep their lines."
        confirmLabel="Delete preset"
        pending={pending}
        destructive
        onConfirm={() => {
          if (confirmDeleteId !== null) remove(confirmDeleteId)
        }}
      />
    </div>
  )
}

function PresetEditCard({
  preset,
  onDone,
}: {
  preset: ItemPreset
  onDone: (updated: ItemPreset | null) => void
}) {
  const [description, setDescription] = useState(preset.description)
  const [unit, setUnit] = useState<ItemUnit>(preset.unit)
  const [price, setPrice] = useState(formatPounds(preset.unit_price_pence))
  const [pending, setPending] = useState(false)

  async function save() {
    const pence = parseGBPToPence(price)
    if (!description.trim()) {
      toast.error('The line needs a description.')
      return
    }
    if (pence === null) {
      toast.error('The price needs to look like 1,250.50.')
      return
    }
    setPending(true)
    const result = await updateItemPreset({
      id: preset.id,
      description: description.trim(),
      unit,
      unit_price_pence: pence,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Preset saved')
    onDone({ ...preset, description: description.trim(), unit, unit_price_pence: pence })
  }

  return (
    <div className="rounded-sm border border-brushly-gold/30 bg-admin-card p-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        autoFocus
        placeholder="What's being done"
        className="w-full rounded-sm border border-white/10 bg-admin-raised px-3 py-2.5 font-body text-[16px] leading-snug text-brushly-cream outline-none transition-colors focus:border-brushly-gold [field-sizing:content]"
      />
      <div className="mt-2 flex items-center gap-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as ItemUnit)}
          aria-label="Unit"
          className="h-12 w-18 appearance-none rounded-sm border border-white/10 bg-admin-raised px-3 font-body text-[16px] text-brushly-cream outline-none transition-colors focus:border-brushly-gold"
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-[15px] text-admin-muted">
            £
          </span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => {
              const pence = parseGBPToPence(price)
              if (pence !== null) setPrice(formatPounds(pence))
            }}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Price"
            className={`${inputClass} mt-0 pl-7 text-right tabular-nums`}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onDone(null)}
          className="h-11 flex-1 rounded-sm border border-white/15 font-body text-[14px] font-medium text-brushly-cream/70 transition-colors hover:bg-admin-raised"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="h-11 flex-1 rounded-sm bg-brushly-gold font-body text-[14px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
