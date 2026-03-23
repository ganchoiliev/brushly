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
  const pathname = usePathname()

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })

    setLenis(lenisInstance)

    // Sync Lenis scroll position with GSAP ScrollTrigger
    lenisInstance.on('scroll', ScrollTrigger.update)

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
    }, 100)

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

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  )
}
