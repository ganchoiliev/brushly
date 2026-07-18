'use client'

import { useState } from 'react'
import {
  PALETTE,
  PALETTE_BY_SPECTRUM,
  PALETTE_GROUPS,
  LOOKS,
  getColor,
  type Look,
  type PaletteGroup,
} from '@/lib/visualizer/palette'

interface Props {
  colorId?: string
  onColor: (id: string) => void
  onLook: (look: Look) => void
}

export default function ColorChooser({ colorId, onColor, onLook }: Props) {
  const [tab, setTab] = useState<'looks' | 'colours'>('looks')
  // Family filter: 'all' shows the spectrum-sorted ribbon as a grid; a family
  // chip narrows to that group so "I want a green" is one tap.
  const [group, setGroup] = useState<PaletteGroup | 'all'>('all')

  const colours =
    group === 'all' ? PALETTE_BY_SPECTRUM : PALETTE.filter((c) => c.group === group)

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-brushly-gold/20 p-1">
        {(['looks', 'colours'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 font-body text-[12px] uppercase tracking-[0.15em] transition-colors duration-300 ${
              tab === t
                ? 'bg-brushly-gold text-brushly-black'
                : 'text-brushly-cream/60 hover:text-brushly-cream'
            }`}
          >
            {t === 'looks' ? 'Looks' : 'Colours'}
          </button>
        ))}
      </div>

      {tab === 'looks' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LOOKS.map((look) => {
            const c = getColor(look.colorId)
            const active = colorId === look.colorId
            return (
              <button
                key={look.id}
                type="button"
                onClick={() => onLook(look)}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-sm border text-left transition-all duration-300 ${
                  active
                    ? 'border-brushly-gold ring-1 ring-brushly-gold'
                    : 'border-brushly-gold/15 hover:border-brushly-gold/50'
                }`}
              >
                <div className="h-20 w-full" style={{ background: c?.hex }} />
                <div className="p-3">
                  <p className="font-display text-[15px] font-light text-brushly-cream">
                    {look.name}
                  </p>
                  <p className="mt-0.5 font-body text-[11px] leading-snug text-brushly-cream/50">
                    {look.vibe}
                  </p>
                </div>
                <span
                  className={`absolute right-2 top-2 rounded-full bg-brushly-black/50 px-2 py-0.5 font-body text-[9px] uppercase tracking-wider text-brushly-cream/70 backdrop-blur-sm transition-opacity duration-300 ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {active ? 'Selected' : 'Tap to select'}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div>
          <div
            role="group"
            aria-label="Colour family"
            className="scrollbar-none -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1"
          >
            {(['all', ...PALETTE_GROUPS] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                aria-pressed={group === g}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 font-body text-[11px] uppercase tracking-[0.12em] transition-colors duration-200 ${
                  group === g
                    ? 'border-brushly-gold bg-brushly-gold/10 text-brushly-cream'
                    : 'border-brushly-gold/20 text-brushly-cream/60 hover:border-brushly-gold/50'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {colours.map((c) => {
              const active = colorId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onColor(c.id)}
                  aria-pressed={active}
                  className={`group flex flex-col overflow-hidden rounded-sm border text-left transition-all duration-300 ${
                    active
                      ? 'border-brushly-gold ring-1 ring-brushly-gold'
                      : 'border-white/10 hover:border-brushly-gold/50'
                  }`}
                >
                  <div className="h-16 w-full sm:h-20" style={{ background: c.hex }} />
                  <div className="bg-brushly-off-black/40 p-2">
                    <p className="font-body text-[11px] leading-tight text-brushly-cream">
                      {c.label}
                    </p>
                    <p className="mt-0.5 font-body text-[9px] text-brushly-cream/40">{c.brand}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
