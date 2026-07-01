'use client'

import { useState } from 'react'
import { PALETTE_BY_SPECTRUM, LOOKS, getColor, type Look } from '@/lib/visualizer/palette'

interface Props {
  colorId?: string
  onColor: (id: string) => void
  onLook: (look: Look) => void
}

export default function ColorChooser({ colorId, onColor, onLook }: Props) {
  const [tab, setTab] = useState<'looks' | 'colours'>('looks')

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
                className={`group relative overflow-hidden rounded-sm border text-left transition-all duration-300 ${
                  active
                    ? 'border-brushly-gold'
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
                <span className="absolute right-2 top-2 rounded-full bg-brushly-black/50 px-2 py-0.5 font-body text-[9px] uppercase tracking-wider text-brushly-cream/70 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  Tap to see
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3">
          {PALETTE_BY_SPECTRUM.map((c) => {
            const active = colorId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onColor(c.id)}
                className={`group flex w-28 shrink-0 snap-start flex-col overflow-hidden rounded-sm border transition-all duration-300 ${
                  active
                    ? 'border-brushly-gold ring-1 ring-brushly-gold'
                    : 'border-white/10 hover:border-brushly-gold/50'
                }`}
              >
                <div className="h-24 w-full" style={{ background: c.hex }} />
                <div className="bg-brushly-off-black/40 p-2.5 text-left">
                  <p className="font-body text-[12px] leading-tight text-brushly-cream">{c.label}</p>
                  <p className="mt-0.5 font-body text-[10px] text-brushly-cream/40">{c.brand}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
