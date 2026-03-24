'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { blurDataURL } from '@/lib/shimmer'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeAlt?: string
  afterAlt?: string
  className?: string
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = 'Before',
  afterAlt = 'After',
  className = '',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100))
    setPosition(percent)
  }, [])

  const handleMouseDown = () => setIsDragging(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updatePosition(e.clientX)
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) updatePosition(e.touches[0].clientX)
    }
    const handleUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, updatePosition])

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden ${className}`}
      style={{ aspectRatio: '16/10', cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* After image (full) */}
      <div className="absolute inset-0">
        <Image src={afterSrc} alt={afterAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" placeholder="blur" blurDataURL={blurDataURL} />
      </div>

      {/* Before image (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={beforeSrc} alt={beforeAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" placeholder="blur" blurDataURL={blurDataURL} />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Vertical line */}
        <div className="h-full w-[2px] bg-brushly-gold shadow-[0_0_8px_rgba(200,169,110,0.4)]" />

        {/* Handle circle */}
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brushly-gold bg-brushly-black/80 backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3L2 8l3 5M11 3l3 5-3 5" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute left-4 top-4 z-10 rounded bg-brushly-black/60 px-3 py-1 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/80 backdrop-blur-sm">
        Before
      </div>
      <div className="absolute right-4 top-4 z-10 rounded bg-brushly-black/60 px-3 py-1 font-body text-[11px] uppercase tracking-[0.2em] text-brushly-cream/80 backdrop-blur-sm">
        After
      </div>
    </div>
  )
}
