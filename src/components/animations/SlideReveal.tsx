'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useReducedMotion from '@/hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface SlideRevealProps {
  children: React.ReactNode
  from?: 'left' | 'right'
  delay?: number
  className?: string
}

export default function SlideReveal({
  children,
  from = 'left',
  delay = 0,
  className = '',
}: SlideRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const x = from === 'left' ? -80 : 80
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        x,
        opacity: 0,
        duration: 1.2,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [from, delay, reduced])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
