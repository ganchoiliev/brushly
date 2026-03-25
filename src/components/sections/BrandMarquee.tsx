'use client'

import { useTheme } from '@/lib/ThemeContext'

export default function BrandMarquee() {
  const { palette } = useTheme()
  const brands = [
    'Farrow & Ball',
    'Little Greene',
    'Benjamin Moore',
    'Dulux Trade',
    'Mylands',
    'Paint & Paper Library',
    'Zoffany',
    'Sanderson',
  ]

  const marqueeContent = brands.map((brand) => `${brand}  ·  `).join('')

  return (
    <section className="group bg-brushly-charcoal py-12 overflow-hidden">
      <p className="text-center text-[11px] font-body uppercase tracking-[0.25em] mb-6" style={{ color: `${palette.accent}99`, transition: 'color 0.8s ease' }}>
        Trusted partners
      </p>
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          <span className="mx-4 text-[14px] font-body uppercase tracking-[0.2em] text-brushly-cream/50">
            {marqueeContent}
          </span>
          <span className="mx-4 text-[14px] font-body uppercase tracking-[0.2em] text-brushly-cream/50">
            {marqueeContent}
          </span>
        </div>
      </div>
    </section>
  )
}
