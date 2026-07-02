/* Brushly design tokens — mirrors the site's Tailwind v4 tokens
   (src/app/globals.css in brushly-site). Keep hex values in sync. */

export const Colors = {
  gold: '#C8A96E',
  goldLight: '#D4BC8B',
  goldDark: '#A68B5B',
  black: '#1A1A1A',
  offBlack: '#2D2D2D',
  charcoal: '#151515',
  cream: '#F5F0EB',
  white: '#FAFAFA',
  /* Derived — cream/gold at low alpha for hairlines + overlays. */
  creamFaint: 'rgba(245, 240, 235, 0.55)',
  hairline: 'rgba(245, 240, 235, 0.14)',
  scrim: 'rgba(21, 21, 21, 0.72)',
} as const

/* Loaded in the root layout via @expo-google-fonts. font-display = serif,
   font-body = sans, matching the site's --font-display / --font-body. */
export const Fonts = {
  display: 'CormorantGaramond_600SemiBold',
  displayMedium: 'CormorantGaramond_500Medium',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

/* The site's signature ease: cubic-bezier(0.22, 1, 0.36, 1). */
export const Easing = {
  brand: [0.22, 1, 0.36, 1] as const,
}

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const
