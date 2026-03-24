'use client'

import { useEffect, useState, createContext, useContext, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LenisContext = createContext<Lenis | null>(null)

export const useLenis = () => useContext(LenisContext)

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const rafCallbackRef = useRef<((time: number) => void) | null>(null)
  const isTouchRef = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    // Skip Lenis on touch devices — native scroll is better on mobile
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    isTouchRef.current = isTouch

    if (isTouch) {
      // Still refresh ScrollTrigger for GSAP animations to work
      setTimeout(() => ScrollTrigger.refresh(), 200)
      return
    }

    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })

    setLenis(lenisInstance)

    // Sync Lenis scroll position with GSAP ScrollTrigger
    lenisInstance.on('scroll', ScrollTrigger.update)

    // Bridge Lenis virtual scroll with ScrollTrigger pin calculations
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && lenisInstance) {
          lenisInstance.scrollTo(value as number, { immediate: true })
        }
        return lenisInstance ? lenisInstance.scroll : window.scrollY
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      },
      pinType: 'transform',
    })

    // Drive Lenis RAF from GSAP ticker for perfect sync
    const rafCallback = (time: number) => {
      lenisInstance.raf(time * 1000)
    }
    rafCallbackRef.current = rafCallback
    gsap.ticker.add(rafCallback)
    gsap.ticker.lagSmoothing(0)

    // Initial ScrollTrigger refresh after Lenis is set up
    setTimeout(() => {
      ScrollTrigger.refresh()
    }, 200)

    return () => {
      if (rafCallbackRef.current) {
        gsap.ticker.remove(rafCallbackRef.current)
      }
      lenisInstance.destroy()
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [])

  // Refresh ScrollTrigger after page transitions
  useEffect(() => {
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 600)

    return () => clearTimeout(timeout)
  }, [pathname])

  // Subtle parallax on elements with data-speed attribute
  useEffect(() => {
    if (isTouchRef.current) return

    const timeout = setTimeout(() => {
      const elements = gsap.utils.toArray('[data-speed]') as HTMLElement[]
      elements.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.05')
        gsap.to(el, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  )
}
