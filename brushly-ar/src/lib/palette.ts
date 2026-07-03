/* Ported from brushly-site src/lib/visualizer/palette.ts — keep in sync.
   The render API validates colorId/service/finish against the same data
   server-side, so ids and labels must match the site exactly. */

export type VisualizerService = 'interior' | 'exterior' | 'wallpaper' | 'finish'

export type PaletteGroup =
  | 'Whites'
  | 'Neutrals'
  | 'Greys'
  | 'Blacks & Darks'
  | 'Greens'
  | 'Blues'
  | 'Reds & Pinks'
  | 'Yellows'
  | 'Earth & Terracotta'
  | 'Exterior'

/** Chip order in colour choosers — light to dark, then by hue. */
export const PALETTE_GROUPS: PaletteGroup[] = [
  'Whites',
  'Neutrals',
  'Greys',
  'Blacks & Darks',
  'Greens',
  'Blues',
  'Reds & Pinks',
  'Yellows',
  'Earth & Terracotta',
  'Exterior',
]

export interface PaintColor {
  id: string
  label: string
  hex: string
  brand: string
  group: PaletteGroup
  /* Optional one-line colour "story" — shown in the render-wait strip for a few
     popular shades so the wait feels bespoke. Display-only; never sent to the
     server, so it doesn't affect id/finish validation or the site sync. */
  description?: string
}

export const PALETTE: PaintColor[] = [
  // Whites
  { id: 'all-white', label: 'All White', hex: '#FAF9EF', brand: 'Farrow & Ball', group: 'Whites' },
  { id: 'wimborne-white', label: 'Wimborne White', hex: '#F0EBDA', brand: 'Farrow & Ball', group: 'Whites' },
  { id: 'pointing', label: 'Pointing', hex: '#F7F0DF', brand: 'Farrow & Ball', group: 'Whites' },
  { id: 'strong-white', label: 'Strong White', hex: '#EDECE4', brand: 'Farrow & Ball', group: 'Whites' },
  { id: 'timeless', label: 'Timeless', hex: '#E6DDCF', brand: 'Dulux Trade', group: 'Whites' },

  // Neutrals
  { id: 'cornforth-white', label: 'Cornforth White', hex: '#CFC9BE', brand: 'Farrow & Ball', group: 'Neutrals' },
  { id: 'elephants-breath', label: "Elephant's Breath", hex: '#CDC0B0', brand: 'Farrow & Ball', group: 'Neutrals', description: 'A warm grey-beige that shifts between mauve and stone as the light moves.' },
  { id: 'skimming-stone', label: 'Skimming Stone', hex: '#D8CFC2', brand: 'Farrow & Ball', group: 'Neutrals' },
  { id: 'purbeck-stone', label: 'Purbeck Stone', hex: '#B7AE9F', brand: 'Farrow & Ball', group: 'Neutrals' },
  { id: 'oxford-stone', label: 'Oxford Stone', hex: '#DFCCA9', brand: 'Farrow & Ball', group: 'Neutrals' },

  // Greys
  { id: 'ammonite', label: 'Ammonite', hex: '#D5D0C6', brand: 'Farrow & Ball', group: 'Greys' },
  { id: 'pavilion-gray', label: 'Pavilion Gray', hex: '#C0C1BA', brand: 'Farrow & Ball', group: 'Greys' },
  { id: 'manor-house-gray', label: 'Manor House Gray', hex: '#A5A9A4', brand: 'Farrow & Ball', group: 'Greys' },
  { id: 'plummett', label: 'Plummett', hex: '#7A7E80', brand: 'Farrow & Ball', group: 'Greys' },

  // Blacks & Darks
  { id: 'downpipe', label: 'Downpipe', hex: '#5B5E5B', brand: 'Farrow & Ball', group: 'Blacks & Darks' },
  { id: 'railings', label: 'Railings', hex: '#45484D', brand: 'Farrow & Ball', group: 'Blacks & Darks', description: 'An off-black with a soft blue undertone — grounding on walls.' },
  { id: 'pitch-black', label: 'Pitch Black', hex: '#313437', brand: 'Farrow & Ball', group: 'Blacks & Darks' },
  { id: 'lamp-black', label: 'Lamp Black', hex: '#3B4042', brand: 'Little Greene', group: 'Blacks & Darks' },
  { id: 'off-black', label: 'Off-Black', hex: '#24262A', brand: 'Brushly', group: 'Blacks & Darks' },

  // Greens
  { id: 'vert-de-terre', label: 'Vert de Terre', hex: '#B5BCA4', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'breakfast-room-green', label: 'Breakfast Room Green', hex: '#94A386', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'sage-green', label: 'Sage Green', hex: '#9AA089', brand: 'Little Greene', group: 'Greens' },
  { id: 'green-smoke', label: 'Green Smoke', hex: '#6C7267', brand: 'Farrow & Ball', group: 'Greens', description: 'A smoky blue-green — calm, characterful, quietly confident.' },
  { id: 'card-room-green', label: 'Card Room Green', hex: '#6A6D5D', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'calke-green', label: 'Calke Green', hex: '#77855C', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'overtly-olive', label: 'Overtly Olive', hex: '#7C7A52', brand: 'Dulux Trade', group: 'Greens' },
  { id: 'studio-green', label: 'Studio Green', hex: '#2E3B34', brand: 'Farrow & Ball', group: 'Greens' },

  // Blues
  { id: 'borrowed-light', label: 'Borrowed Light', hex: '#DCE2DF', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'bone-china-blue', label: 'Bone China Blue', hex: '#B7C4C3', brand: 'Little Greene', group: 'Blues' },
  { id: 'denim-drift', label: 'Denim Drift', hex: '#8E9CA6', brand: 'Dulux Trade', group: 'Blues' },
  { id: 'oval-room-blue', label: 'Oval Room Blue', hex: '#85929A', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'de-nimes', label: 'De Nimes', hex: '#768388', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'hicks-blue', label: "Hicks' Blue", hex: '#33526B', brand: 'Little Greene', group: 'Blues' },
  { id: 'stiffkey-blue', label: 'Stiffkey Blue', hex: '#3B4657', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'hague-blue', label: 'Hague Blue', hex: '#313E43', brand: 'Farrow & Ball', group: 'Blues', description: 'A deep, near-navy blue-black that turns a room jewel-like after dark.' },

  // Reds & Pinks
  { id: 'pink-ground', label: 'Pink Ground', hex: '#EBD5C8', brand: 'Farrow & Ball', group: 'Reds & Pinks' },
  { id: 'setting-plaster', label: 'Setting Plaster', hex: '#E3C6B8', brand: 'Farrow & Ball', group: 'Reds & Pinks' },
  { id: 'sulking-room-pink', label: 'Sulking Room Pink', hex: '#9F7D76', brand: 'Farrow & Ball', group: 'Reds & Pinks', description: 'A muted, dusky rose-pink — intimate and enveloping, never sweet.' },
  { id: 'picture-gallery-red', label: 'Picture Gallery Red', hex: '#9A5A4B', brand: 'Farrow & Ball', group: 'Reds & Pinks' },
  { id: 'eating-room-red', label: 'Eating Room Red', hex: '#7C3B39', brand: 'Farrow & Ball', group: 'Reds & Pinks' },
  { id: 'rectory-red', label: 'Rectory Red', hex: '#97393B', brand: 'Farrow & Ball', group: 'Reds & Pinks' },

  // Yellows
  { id: 'dayroom-yellow', label: 'Dayroom Yellow', hex: '#F3E3B2', brand: 'Farrow & Ball', group: 'Yellows' },
  { id: 'hay', label: 'Hay', hex: '#DBC48A', brand: 'Farrow & Ball', group: 'Yellows' },
  { id: 'babouche', label: 'Babouche', hex: '#EAC363', brand: 'Farrow & Ball', group: 'Yellows' },
  { id: 'india-yellow', label: 'India Yellow', hex: '#C39143', brand: 'Farrow & Ball', group: 'Yellows' },

  // Earth & Terracotta
  { id: 'dead-salmon', label: 'Dead Salmon', hex: '#C3A088', brand: 'Farrow & Ball', group: 'Earth & Terracotta' },
  { id: 'red-earth', label: 'Red Earth', hex: '#B06A50', brand: 'Farrow & Ball', group: 'Earth & Terracotta' },
  { id: 'terracotta', label: 'Terracotta', hex: '#B5623F', brand: 'Little Greene', group: 'Earth & Terracotta' },
  { id: 'london-clay', label: 'London Clay', hex: '#75685D', brand: 'Farrow & Ball', group: 'Earth & Terracotta' },

  // Exterior
  { id: 'classic-white-masonry', label: 'Classic White', hex: '#EFEAE0', brand: 'Brushly', group: 'Exterior' },
  { id: 'sandstone', label: 'Sandstone', hex: '#D2C3A3', brand: 'Brushly', group: 'Exterior' },
  { id: 'stone-render', label: 'Stone', hex: '#C9BFA9', brand: 'Brushly', group: 'Exterior' },
  { id: 'heritage-green', label: 'Heritage Green', hex: '#5E6B54', brand: 'Brushly', group: 'Exterior' },
  { id: 'slate-grey-masonry', label: 'Slate Grey', hex: '#6A6E71', brand: 'Brushly', group: 'Exterior' },
]

const BY_ID = new Map(PALETTE.map((c) => [c.id, c]))
export function getColor(id: string): PaintColor | undefined {
  return BY_ID.get(id)
}

/* Finish / sub-style options per service (validated server-side too). */
export const FINISHES: Record<VisualizerService, string[]> = {
  interior: ['Matte emulsion', 'Eggshell', 'Satinwood', 'Gloss'],
  exterior: ['Smooth masonry', 'Textured masonry', 'Satin trim', 'Gloss trim'],
  wallpaper: ['Geometric', 'Floral', 'Damask', 'Plain textured', 'Grasscloth'],
  finish: ['Venetian plaster', 'Limewash', 'Metallic', 'Colour wash'],
}

export const SERVICE_LABELS: Record<VisualizerService, string> = {
  interior: 'Interior painting',
  exterior: 'Exterior painting',
  wallpaper: 'Wallpapering',
  finish: 'Specialist finishes',
}

/* Short labels for the compact AR chip row. */
export const SERVICE_SHORT_LABELS: Record<VisualizerService, string> = {
  interior: 'Interior',
  exterior: 'Exterior',
  wallpaper: 'Wallpaper',
  finish: 'Finishes',
}

export const SERVICES: VisualizerService[] = ['interior', 'exterior', 'wallpaper', 'finish']

/* ---- Spectrum ordering for the tactile colour carousel ---- */
function hsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

// Near-neutral colours (low saturation) lead, ordered light→dark; chromatic
// colours follow by hue — a smooth spectrum ribbon.
export const PALETTE_BY_SPECTRUM: PaintColor[] = [...PALETTE].sort((a, b) => {
  const A = hsl(a.hex)
  const B = hsl(b.hex)
  const an = A.s < 0.18
  const bn = B.s < 0.18
  if (an !== bn) return an ? -1 : 1
  if (an && bn) return B.l - A.l
  return A.h - B.h
})

/* ---- Curated "Looks": vibe → colour + finish, one tap to render ---- */
export interface Look {
  id: string
  name: string
  vibe: string
  colorId: string
  finish: string
}

export const LOOKS: Look[] = [
  { id: 'heritage-dark', name: 'Heritage Dark', vibe: 'Moody, timeless, characterful', colorId: 'hague-blue', finish: 'Eggshell' },
  { id: 'warm-minimal', name: 'Warm Minimal', vibe: 'Soft, calm, contemporary', colorId: 'elephants-breath', finish: 'Matte emulsion' },
  { id: 'coastal-calm', name: 'Coastal Calm', vibe: 'Airy and fresh', colorId: 'bone-china-blue', finish: 'Matte emulsion' },
  { id: 'modern-sage', name: 'Modern Sage', vibe: 'Natural and restful', colorId: 'sage-green', finish: 'Matte emulsion' },
  { id: 'bold-statement', name: 'Bold Statement', vibe: 'Confident and rich', colorId: 'green-smoke', finish: 'Matte emulsion' },
  { id: 'soft-neutral', name: 'Soft Neutral', vibe: 'Bright and understated', colorId: 'cornforth-white', finish: 'Matte emulsion' },
  { id: 'earthy-warmth', name: 'Earthy Warmth', vibe: 'Cosy and grounded', colorId: 'terracotta', finish: 'Matte emulsion' },
  { id: 'classic-white', name: 'Classic White', vibe: 'Clean and crisp', colorId: 'wimborne-white', finish: 'Matte emulsion' },
]
