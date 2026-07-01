'use client'

/* eslint-disable @next/next/no-img-element */
// Uses plain <img>, not next/image: the sources are short-lived, user-specific
// signed Supabase URLs — not candidates for next/image optimisation/caching.

import { useRef, useState, useCallback, useEffect } from 'react'

interface Props {
  beforeSrc: string
  afterSrc: string
  className?: string
}

export default function VisualBeforeAfter({ beforeSrc, afterSrc, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const update = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
    setPosition(pct)
  }, [])

  useEffect(() => {
    const mm = (e: MouseEvent) => isDragging && update(e.clientX)
    const tm = (e: TouchEvent) => isDragging && update(e.touches[0].clientX)
    const up = () => setIsDragging(false)
    window.addEventListener('mousemove', mm)
    window.addEventListener('touchmove', tm)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [isDragging, update])

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-sm ${className}`}
      style={{
        aspectRatio: '4/3',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
    >
      <img
        src={afterSrc}
        alt="Your room, redecorated"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={beforeSrc}
          alt="Your room, before"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="h-full w-[2px] bg-brushly-gold shadow-[0_0_8px_rgba(200,169,110,0.4)]" />
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brushly-gold bg-brushly-black/80 backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M5 3L2 8l3 5M11 3l3 5-3 5"
              stroke="#C8A96E"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="absolute left-3 top-3 z-10 rounded bg-brushly-black/60 px-2.5 py-1 font-body text-[10px] uppercase tracking-[0.2em] text-brushly-cream/80 backdrop-blur-sm">
        Before
      </div>
      <div className="absolute right-3 top-3 z-10 rounded bg-brushly-black/60 px-2.5 py-1 font-body text-[10px] uppercase tracking-[0.2em] text-brushly-cream/80 backdrop-blur-sm">
        After
      </div>
    </div>
  )
}
