# BRUSHLY.UK — Full Rebuild Architecture Blueprint
## Target: Aventura Dental Arts-tier (Awwwards SOTD quality)

---

## 1. TECH STACK (Non-Negotiable)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 15** (App Router) | SSG/ISR, `next/image`, built-in optimizations |
| Styling | **Tailwind CSS v4** | Utility-first, zero unused CSS in prod |
| Smooth Scroll | **Lenis** | Industry-standard buttery scroll (used by Aventura, Porto) |
| Scroll Animations | **GSAP + ScrollTrigger** | The only production-grade scroll-linked animation engine |
| Component Animations | **Framer Motion** | Page transitions, layout animations, component enter/exit |
| Hosting | **Vercel** | Edge CDN, automatic HTTPS, ISR, analytics |
| Images | **next/image** + WebP/AVIF | Automatic responsive, lazy-load, blur placeholders |
| Video | **Mux** or self-hosted MP4 | Adaptive bitrate, poster frames, intersection-triggered |
| Fonts | **next/font** (local or Google) | Zero layout shift, font-display: swap |
| Analytics | **Vercel Analytics** + **Speed Insights** | Core Web Vitals tracking |

---

## 2. PROJECT STRUCTURE

```
brushly/
├── app/
│   ├── layout.tsx              # Root layout — Lenis provider, fonts, metadata
│   ├── page.tsx                # Homepage
│   ├── about/page.tsx
│   ├── services/page.tsx
│   ├── gallery/page.tsx        # Before/after portfolio
│   ├── contact/page.tsx
│   └── template.tsx            # Page transition wrapper (Framer Motion)
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Sticky nav with scroll-aware state
│   │   ├── Footer.tsx
│   │   └── PageTransition.tsx  # AnimatePresence wrapper
│   ├── animations/
│   │   ├── SmoothScroll.tsx    # Lenis provider component
│   │   ├── ScrollReveal.tsx    # GSAP ScrollTrigger wrapper
│   │   ├── TextReveal.tsx      # Split-text line-by-line reveal
│   │   ├── ParallaxImage.tsx   # Scroll-linked parallax
│   │   └── MagneticButton.tsx  # Cursor-following button hover
│   ├── sections/
│   │   ├── HeroVideo.tsx       # Full-viewport cinematic hero
│   │   ├── ServicesGrid.tsx    # Staggered card reveals
│   │   ├── Testimonials.tsx    # Horizontal scroll or carousel
│   │   ├── BeforeAfter.tsx     # Slider comparison component
│   │   └── CTASection.tsx      # Scroll-pinned CTA
│   └── ui/
│       ├── Button.tsx
│       ├── Badge.tsx
│       └── Container.tsx
├── hooks/
│   ├── useGSAP.ts             # GSAP context + cleanup hook
│   ├── useLenis.ts            # Lenis instance access
│   └── useInView.ts           # Intersection observer
├── lib/
│   ├── gsap.ts                # GSAP plugin registration (ScrollTrigger, SplitText)
│   ├── fonts.ts               # next/font definitions
│   └── metadata.ts            # SEO defaults
├── public/
│   ├── videos/                # Compressed hero videos (.mp4, .webm)
│   └── images/                # Static assets (logo, OG images)
├── styles/
│   └── globals.css            # Tailwind directives + Lenis base styles
├── next.config.ts
├── tailwind.config.ts
└── vercel.json
```

---

## 3. ANIMATION ARCHITECTURE

### Layer 1: Smooth Scroll (Lenis)
- Wraps entire app in `<SmoothScroll>` provider
- Syncs with GSAP ticker for perfect scroll-animation alignment
- Must be initialized in root layout, NOT per-page

```tsx
// Critical: Lenis ↔ GSAP sync
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

### Layer 2: Scroll-Triggered Reveals (GSAP + ScrollTrigger)
- Every section gets a `ScrollReveal` wrapper
- Stagger children with `data-animate` attributes
- Kill ScrollTrigger instances on unmount (memory leaks = jank)

### Layer 3: Page Transitions (Framer Motion)
- `template.tsx` wraps each page in `<AnimatePresence>`
- Exit animation completes BEFORE new page mounts
- Lenis scroll position resets on route change

### Layer 4: Micro-interactions (CSS + Framer Motion)
- Button hover states, link underline animations
- Magnetic cursor effects on CTAs
- Image reveal masks on hover

---

## 4. PERFORMANCE BUDGET

| Metric | Target | Aventura Score |
|--------|--------|---------------|
| LCP | < 1.5s | ~1.8s |
| FCP | < 0.8s | ~1.2s |
| CLS | < 0.05 | ~0.02 |
| TBT | < 150ms | ~180ms |
| PageSpeed (mobile) | 85+ | 78 |
| PageSpeed (desktop) | 95+ | 92 |

### How to hit these:
- **SSG all pages** — no server-side rendering unless dynamic content needed
- **next/image** with `priority` on hero, `loading="lazy"` everywhere else
- **Font preloading** via next/font (eliminates FOIT/FOUT)
- **GSAP tree-shaking** — import only ScrollTrigger, not entire library
- **Video: poster frame** → intersection observer → play on visible
- **Vercel Edge Network** — assets served from nearest PoP

---

## 5. SEO & LOCAL BUSINESS

```tsx
// app/layout.tsx metadata
export const metadata: Metadata = {
  title: {
    default: 'Brushly UK | Premium Painting & Decorating',
    template: '%s | Brushly UK'
  },
  description: 'Premium painting and decorating services in Surrey, Epsom & Reigate.',
  openGraph: { /* ... */ },
  // JSON-LD structured data for LocalBusiness
};
```

- **LocalBusiness schema** on every page
- **next/sitemap** auto-generated
- **Canonical URLs** via Next.js metadata API
- **OG images** auto-generated or static per page

---

## 6. MIGRATION CHECKLIST

### Phase 1: Foundation (Days 1-3)
- [ ] `npx create-next-app@latest brushly --typescript --tailwind --app`
- [ ] Install: `gsap`, `@studio-freight/lenis`, `framer-motion`
- [ ] Set up Lenis + GSAP sync in root layout
- [ ] Configure Tailwind with Brushly brand tokens (gold, black, whites)
- [ ] Set up next/font with chosen typefaces
- [ ] Deploy empty shell to Vercel, connect brushly.uk domain

### Phase 2: Core Components (Days 4-7)
- [ ] Build `ScrollReveal`, `TextReveal`, `ParallaxImage` animation primitives
- [ ] Build `HeroVideo` with poster → autoplay on intersection
- [ ] Build sticky `Header` with scroll-aware background transition
- [ ] Build `PageTransition` via template.tsx
- [ ] Build reusable `Button`, `Container`, `Badge` UI primitives

### Phase 3: Pages (Days 8-14)
- [ ] Homepage: Hero → Services → Gallery preview → Testimonials → CTA
- [ ] Services page: Individual service cards with scroll reveals
- [ ] Gallery: Before/after slider + masonry grid
- [ ] About: Story section with parallax imagery
- [ ] Contact: Form + embedded map

### Phase 4: Polish (Days 15-18)
- [ ] Magnetic button effects
- [ ] Custom cursor (optional — adds luxury feel)
- [ ] Loading screen / page loader animation
- [ ] 404 page with brand personality
- [ ] Mobile: verify all animations are performant or gracefully disabled
- [ ] Lighthouse audit → fix until 90+ mobile

### Phase 5: Launch (Days 19-21)
- [ ] Move brushly.uk DNS to Vercel
- [ ] Set up redirects from old URL structure
- [ ] Verify Google Search Console
- [ ] Submit updated sitemap
- [ ] Run PageSpeed, Awwwards submission prep

---

## 7. KEY PATTERNS (Reference Code)

### Lenis Provider
```tsx
'use client';
import Lenis from '@studio-freight/lenis';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  return <>{children}</>;
}
```

### ScrollReveal Wrapper
```tsx
'use client';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface Props {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}

export default function ScrollReveal({ children, delay = 0, y = 60 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        y,
        opacity: 0,
        duration: 1.2,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }, ref);

    return () => ctx.revert(); // Cleanup — prevents memory leaks
  }, [delay, y]);

  return <div ref={ref}>{children}</div>;
}
```

### Page Transition (template.tsx)
```tsx
'use client';
import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 8. BRAND TOKENS (Tailwind Config)

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brushly: {
          gold: '#C8A96E',
          'gold-light': '#D4BC8B',
          black: '#1A1A1A',
          'off-black': '#2D2D2D',
          cream: '#F5F0EB',
          white: '#FAFAFA',
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],  // Serif — e.g., Playfair Display, Cormorant
        body: ['var(--font-body)'],        // Sans — e.g., Satoshi, General Sans
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    }
  }
};
```
