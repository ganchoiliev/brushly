'use client'

import { useState, useEffect } from 'react'

let hasLoaded = false

export default function PageLoader() {
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (hasLoaded) {
      setHidden(true)
      return
    }
    hasLoaded = true

    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 15 + 8
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => setExiting(true), 400)
        setTimeout(() => setHidden(true), 1400)
      }
      setProgress(Math.min(p, 100))
    }, 80)
    return () => clearInterval(interval)
  }, [])

  if (hidden) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-brushly-black"
      style={{
        transform: exiting ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)',
      }}
    >
      <div
        className="font-display font-light tracking-[0.15em] text-brushly-gold"
        style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          opacity: exiting ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}
      >
        BRUSHLY
      </div>
      <div className="mt-10 h-[1px] w-[200px] bg-brushly-cream/10">
        <div
          className="h-full bg-brushly-gold"
          style={{ width: `${progress}%`, transition: 'width 0.3s ease-out' }}
        />
      </div>
      <div
        className="mt-4 font-body text-[11px] tracking-[0.2em] text-brushly-cream/30"
        style={{ opacity: exiting ? 0 : 1, transition: 'opacity 0.3s ease' }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  )
}
