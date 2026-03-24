'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

type CursorVariant = 'default' | 'view' | 'drag'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [variant, setVariant] = useState<CursorVariant>('default')
  const [visible, setVisible] = useState(false)
  const [isPointerFine, setIsPointerFine] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    setIsPointerFine(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsPointerFine(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isPointerFine || !cursorRef.current) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const xTo = prefersReduced
      ? (v: number) => { if (cursorRef.current) cursorRef.current.style.left = `${v}px` }
      : gsap.quickTo(cursorRef.current, 'x', { duration: 0.5, ease: 'power3.out' })
    const yTo = prefersReduced
      ? (v: number) => { if (cursorRef.current) cursorRef.current.style.top = `${v}px` }
      : gsap.quickTo(cursorRef.current, 'y', { duration: 0.5, ease: 'power3.out' })

    const onMouseMove = (e: MouseEvent) => {
      if (!visible) setVisible(true)
      xTo(e.clientX)
      yTo(e.clientY)
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cursor]')
      if (target) {
        const val = (target as HTMLElement).dataset.cursor as CursorVariant
        setVariant(val || 'default')
      } else {
        setVariant('default')
      }
    }

    const onMouseLeave = () => setVisible(false)
    const onMouseEnter = () => setVisible(true)

    window.addEventListener('mousemove', onMouseMove)
    document.body.addEventListener('mouseover', onMouseOver)
    document.documentElement.addEventListener('mouseleave', onMouseLeave)
    document.documentElement.addEventListener('mouseenter', onMouseEnter)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseover', onMouseOver)
      document.documentElement.removeEventListener('mouseleave', onMouseLeave)
      document.documentElement.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [isPointerFine, visible])

  // Animate variant changes
  useEffect(() => {
    if (!cursorRef.current || !textRef.current) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const sizes: Record<CursorVariant, number> = {
      default: 12,
      view: 48,
      drag: 64,
    }

    const size = sizes[variant]

    if (prefersReduced) {
      cursorRef.current.style.width = `${size}px`
      cursorRef.current.style.height = `${size}px`
      textRef.current.style.opacity = variant === 'view' ? '1' : '0'
      return
    }

    gsap.to(cursorRef.current, {
      width: size,
      height: size,
      duration: 0.4,
      ease: 'power3.out',
    })

    gsap.to(textRef.current, {
      opacity: variant === 'view' ? 1 : 0,
      scale: variant === 'view' ? 1 : 0.5,
      duration: 0.3,
    })
  }, [variant])

  if (!isPointerFine) return null

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] flex items-center justify-center rounded-full"
      style={{
        width: 12,
        height: 12,
        backgroundColor: '#C8A96E',
        transform: 'translate(-50%, -50%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        mixBlendMode: 'difference',
      }}
    >
      <span
        ref={textRef}
        className="text-[10px] font-body font-medium uppercase tracking-[0.2em] text-brushly-charcoal"
        style={{ opacity: 0 }}
      >
        View
      </span>
    </div>
  )
}
