'use client'

import { useRef, useEffect, useMemo, createElement } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface TextRevealProps {
  children: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  staggerDelay?: number
  duration?: number
}

export default function TextReveal({
  children,
  className,
  as: tag = 'p',
  staggerDelay = 0.05,
  duration = 0.8,
}: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const words = useMemo(() => children.split(' '), [children])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.word-inner', {
        yPercent: 110,
        opacity: 0,
        duration,
        stagger: staggerDelay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [duration, staggerDelay])

  const content = words.map((word, i) => (
    <span
      key={i}
      className="inline-block overflow-hidden"
      style={{ marginRight: '0.3em' }}
    >
      <span className="word-inner inline-block">{word}</span>
    </span>
  ))

  return createElement(
    tag,
    { ref: containerRef, className },
    ...content
  )
}
