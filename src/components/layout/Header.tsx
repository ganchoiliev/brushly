'use client'

import { useState, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { useLenis } from '@/components/animations/SmoothScroll'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const lenis = useLenis()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!lenis) {
      // Fallback to native scroll if Lenis not ready
      const onScroll = () => setScrolled(window.scrollY > 50)
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    const onScroll = ({ scroll }: { scroll: number }) => {
      setScrolled(scroll > 50)
    }

    lenis.on('scroll', onScroll)
    return () => lenis.off('scroll', onScroll)
  }, [lenis])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Animate mobile menu (respect reduced motion)
  useEffect(() => {
    if (mobileOpen) {
      gsap.to('.mobile-nav', {
        clipPath: 'inset(0 0 0 0)',
        duration: reduced ? 0 : 0.6,
        ease: 'power3.inOut',
      })
      if (!reduced) {
        gsap.from('.mobile-nav-link', {
          y: 40,
          opacity: 0,
          stagger: 0.08,
          duration: 0.5,
          delay: 0.2,
          ease: 'power3.out',
        })
      }
    } else {
      gsap.to('.mobile-nav', {
        clipPath: 'inset(0 0 100% 0)',
        duration: reduced ? 0 : 0.4,
        ease: 'power3.inOut',
      })
    }
  }, [mobileOpen, reduced])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-brushly-charcoal/80 backdrop-blur-lg border-b border-brushly-cream/5 transition-all duration-500"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10 lg:px-16">
        {/* Logo */}
        <Link href="/" className="relative z-50">
          <Image
            src="/logo-white.svg"
            alt="Brushly"
            width={160}
            height={51}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative text-[13px] font-body font-medium uppercase tracking-[0.15em] transition-colors duration-300 hover:text-brushly-gold ${
                pathname === link.href
                  ? 'text-brushly-gold'
                  : 'text-brushly-cream/70'
              }`}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-brushly-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <Link
          href="/contact"
          className="hidden text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-black bg-brushly-gold px-6 py-3 transition-all duration-300 hover:bg-brushly-gold-light md:inline-flex"
        >
          Get a Quote
        </Link>

        {/* Mobile Menu Toggle — 44x44px touch target */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-[6px] md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-[1.5px] w-6 bg-brushly-cream transition-all duration-300 ${
              mobileOpen ? 'translate-y-[7.5px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-6 bg-brushly-cream transition-all duration-300 ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-6 bg-brushly-cream transition-all duration-300 ${
              mobileOpen ? '-translate-y-[7.5px] -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      <div
        className="mobile-nav fixed inset-0 z-40 flex flex-col items-center justify-center bg-brushly-charcoal md:hidden"
        style={{ clipPath: 'inset(0 0 100% 0)' }}
      >
        <nav className="flex flex-col items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-nav-link font-display text-4xl font-light tracking-wide transition-colors duration-300 hover:text-brushly-gold ${
                pathname === link.href
                  ? 'text-brushly-gold'
                  : 'text-brushly-cream'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mobile-nav-link mt-4 text-[13px] font-body font-medium uppercase tracking-[0.2em] text-brushly-black bg-brushly-gold px-8 py-4"
          >
            Get a Quote
          </Link>
        </nav>
      </div>
    </header>
  )
}
