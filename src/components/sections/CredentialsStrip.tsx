'use client'

import { useRef, useEffect } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import { useTheme } from '@/lib/ThemeContext'

gsap.registerPlugin(ScrollTrigger)

type IconProps = { className?: string; style?: React.CSSProperties }

function ShieldCheckIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function BadgeCheckIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ClockIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function FileCheckIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  )
}

const credentials = [
  { Icon: ShieldCheckIcon, label: 'Fully insured', value: '£2m public liability' },
  { Icon: BadgeCheckIcon, label: 'Registered company', value: 'Brushly Ltd' },
  { Icon: ClockIcon, label: 'Established', value: '10+ years' },
  { Icon: FileCheckIcon, label: 'Quotes', value: 'Free & no-obligation' },
]

export default function CredentialsStrip() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { palette } = useTheme()

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.cred-item', {
        y: 24,
        opacity: 0,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      })
    }, ref)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      ref={ref}
      aria-label="Our credentials"
      className="bg-brushly-charcoal border-y border-brushly-gold/10"
    >
      <Container>
        <div className="grid grid-cols-2 gap-px bg-brushly-gold/10 md:grid-cols-4">
          {credentials.map(({ Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center justify-center bg-brushly-charcoal px-6 py-12 md:py-14"
            >
              <div className="cred-item flex flex-col items-center gap-3 text-center">
                <Icon
                  className="h-5 w-5"
                  style={{ color: palette.accent, transition: 'color 0.8s ease' }}
                />
                <span className="text-[11px] font-body font-medium uppercase tracking-[0.25em] text-brushly-cream/60">
                  {label}
                </span>
                <span className="text-[15px] font-body font-medium text-brushly-cream">
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
