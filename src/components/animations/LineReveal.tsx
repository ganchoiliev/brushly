'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useReducedMotion from '@/hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface LineRevealProps {
  className?: string
  direction?: 'left' | 'center' | 'right'
  delay?: number
  duration?: number
}

export default function LineReveal({
  className,
  direction = 'left',
  delay = 0,
  duration = 1.2,
}: LineRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const transformOrigin =
    direction === 'left' ? 'left center' :
    direction === 'right' ? 'right center' :
    'center center'

  useEffect(() => {
    if (reduced) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current!,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration,
          delay,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [delay, duration, reduced])

  return (
    <div
      ref={ref}
      className={`h-px w-full bg-brushly-gold/30 ${className || ''}`}
      style={{ transformOrigin }}
    />
  )
}
