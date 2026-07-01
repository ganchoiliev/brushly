'use client'

import { PALETTE, type PaletteGroup } from '@/lib/visualizer/palette'

interface Props {
  value?: string
  onChange: (id: string) => void
}

const GROUPS: PaletteGroup[] = [
  'Neutrals & Whites',
  'Greens',
  'Blues',
  'Warm & Earth',
  'Greys & Darks',
  'Exterior',
]

export default function ColorPalette({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => {
        const colors = PALETTE.filter((c) => c.group === group)
        if (colors.length === 0) return null
        return (
          <div key={group}>
            <p className="mb-3 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/40">
              {group}
            </p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {colors.map((c) => {
                const selected = value === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange(c.id)}
                    title={`${c.label} — ${c.brand}`}
                    aria-pressed={selected}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`h-11 w-11 rounded-full border transition-all duration-300 ${
                        selected
                          ? 'scale-110 border-transparent ring-2 ring-brushly-gold ring-offset-2 ring-offset-brushly-charcoal'
                          : 'border-white/10 group-hover:scale-105'
                      }`}
                      style={{ background: c.hex }}
                    />
                    <span
                      className={`text-center font-body text-[10px] leading-tight transition-colors ${
                        selected ? 'text-brushly-gold' : 'text-brushly-cream/50'
                      }`}
                    >
                      {c.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
