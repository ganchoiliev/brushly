'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ImageRevealProps {
  children: React.ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
  duration?: number
  className?: string
}

const clipPaths = {
  left: { from: 'inset(0 100% 0 0)', to: 'inset(0 0% 0 0)' },
  right: { from: 'inset(0 0 0 100%)', to: 'inset(0 0 0 0%)' },
  up: { from: 'inset(100% 0 0 0)', to: 'inset(0% 0 0 0)' },
  down: { from: 'inset(0 0 100% 0)', to: 'inset(0 0 0% 0)' },
}

export default function ImageReveal({
  children,
  direction = 'left',
  delay = 0,
  duration = 1.2,
  className = '',
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clip = clipPaths[direction]
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { clipPath: clip.from },
        {
          clipPath: clip.to,
          duration,
          delay,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      )
      // Subtle scale animation on the inner image for depth
      const inner = ref.current!.querySelector('img, [data-reveal-inner]') || ref.current!
      gsap.from(inner, {
        scale: 1.2,
        duration: duration + 0.4,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [direction, delay, duration])

  return (
    <div ref={ref} className={`overflow-hidden ${className}`} style={{ clipPath: clipPaths[direction].from }}>
      {children}
    </div>
  )
}
