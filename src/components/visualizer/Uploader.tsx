'use client'

import { useRef, useState } from 'react'

interface Props {
  onSelect: (file: File) => void
  busy?: boolean
  busyLabel?: string
  error?: string
}

export default function Uploader({ onSelect, busy, busyLabel, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [rejected, setRejected] = useState('')

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    // accept="image/*" only filters the picker — dropped files land here raw.
    if (!file.type.startsWith('image/')) {
      setRejected("That file type didn't work — try a JPG or PNG photo.")
      return
    }
    setRejected('')
    onSelect(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (!busy) handleFiles(e.dataTransfer.files)
        }}
        disabled={busy}
        className={`flex min-h-[280px] w-full flex-col items-center justify-center gap-5 border border-dashed px-6 py-12 text-center transition-all duration-300 ${
          drag
            ? 'border-brushly-gold bg-brushly-gold/5'
            : 'border-brushly-gold/30 hover:border-brushly-gold/60 hover:bg-brushly-gold/[0.03]'
        } ${busy ? 'cursor-wait opacity-70' : ''}`}
      >
        {busy ? (
          <>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brushly-gold/30 border-t-brushly-gold" />
            <span className="font-body text-[13px] uppercase tracking-[0.2em] text-brushly-cream/60">
              {busyLabel || 'Uploading…'}
            </span>
          </>
        ) : (
          <>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C8A96E"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="font-display text-2xl font-light text-brushly-cream">
              Add a photo of your room
            </span>
            <span className="font-body text-[13px] text-brushly-cream/50">
              Take a photo or upload one — we&apos;ll show you the finish
            </span>
          </>
        )}
      </button>

      {/* No `capture` attribute: with it, mobile browsers jump straight to the
          camera and never offer the photo library — the camera path has its own
          dedicated button in the wizard. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {(error || rejected) && (
        <p className="font-body text-[13px] text-red-400">{error || rejected}</p>
      )}
    </div>
  )
}
