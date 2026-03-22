'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

  const transformOrigin =
    direction === 'left' ? 'left center' :
    direction === 'right' ? 'right center' :
    'center center'

  useEffect(() => {
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
            toggleActions: 'play none none none',
          },
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [delay, duration])

  return (
    <div
      ref={ref}
      className={`h-px w-full bg-brushly-gold/30 ${className || ''}`}
      style={{ transformOrigin }}
    />
  )
}
