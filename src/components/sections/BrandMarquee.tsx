'use client'

export default function BrandMarquee() {
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
      <p className="text-center text-[11px] font-body uppercase tracking-[0.25em] text-brushly-gold/60 mb-6">
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
