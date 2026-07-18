import type { StaticImageData } from 'next/image'

/* Pre-rendered "Look on our sample room" card thumbnails, generated offline by
   scripts/generate-look-thumbs.ts (real engine, one-time) and committed as
   static assets — browsing Looks never calls the render engine. Static imports
   so a missing file fails the build, never the visitor. Keyed by Look id; the
   lookThumbs test keeps this map in lockstep with LOOKS in palette.ts. */

import heritageDark from './look-thumbs/heritage-dark.webp'
import warmMinimal from './look-thumbs/warm-minimal.webp'
import coastalCalm from './look-thumbs/coastal-calm.webp'
import modernSage from './look-thumbs/modern-sage.webp'
import boldStatement from './look-thumbs/bold-statement.webp'
import softNeutral from './look-thumbs/soft-neutral.webp'
import earthyWarmth from './look-thumbs/earthy-warmth.webp'
import classicWhite from './look-thumbs/classic-white.webp'

export const LOOK_THUMBS: Record<string, StaticImageData> = {
  'heritage-dark': heritageDark,
  'warm-minimal': warmMinimal,
  'coastal-calm': coastalCalm,
  'modern-sage': modernSage,
  'bold-statement': boldStatement,
  'soft-neutral': softNeutral,
  'earthy-warmth': earthyWarmth,
  'classic-white': classicWhite,
}
