import { Cormorant_Garamond, DM_Sans } from 'next/font/google'

/* Both families load as variable fonts — one woff2 per style instead of
   per-weight statics, so every weight in use (300–600) comes from the same
   three preloaded latin files. Don't switch back to weight arrays: that
   multiplies the @font-face rules without changing the files Next serves. */
export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  variable: '--font-cormorant-garamond',
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-dm-sans',
  display: 'swap',
})
