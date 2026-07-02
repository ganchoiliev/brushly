/* Ported from brushly-site src/lib/visualizer/palette.ts — keep in sync.
   The render API validates colorId/service/finish against the same data
   server-side, so ids and labels must match the site exactly. */

export type VisualizerService = 'interior' | 'exterior' | 'wallpaper' | 'finish'

export type PaletteGroup =
  | 'Neutrals & Whites'
  | 'Greens'
  | 'Blues'
  | 'Warm & Earth'
  | 'Greys & Darks'
  | 'Exterior'

export interface PaintColor {
  id: string
  label: string
  hex: string
  brand: string
  group: PaletteGroup
}

export const PALETTE: PaintColor[] = [
  // Neutrals & Whites
  { id: 'wimborne-white', label: 'Wimborne White', hex: '#F0EBDA', brand: 'Farrow & Ball', group: 'Neutrals & Whites' },
  { id: 'cornforth-white', label: 'Cornforth White', hex: '#CFC9BE', brand: 'Farrow & Ball', group: 'Neutrals & Whites' },
  { id: 'elephants-breath', label: "Elephant's Breath", hex: '#CDC0B0', brand: 'Farrow & Ball', group: 'Neutrals & Whites' },
  { id: 'timeless', label: 'Timeless', hex: '#E6DDCF', brand: 'Dulux Trade', group: 'Neutrals & Whites' },
  { id: 'purbeck-stone', label: 'Purbeck Stone', hex: '#B7AE9F', brand: 'Farrow & Ball', group: 'Neutrals & Whites' },

  // Greens
  { id: 'green-smoke', label: 'Green Smoke', hex: '#6C7267', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'card-room-green', label: 'Card Room Green', hex: '#6A6D5D', brand: 'Farrow & Ball', group: 'Greens' },
  { id: 'sage-green', label: 'Sage Green', hex: '#9AA089', brand: 'Little Greene', group: 'Greens' },
  { id: 'overtly-olive', label: 'Overtly Olive', hex: '#7C7A52', brand: 'Dulux Trade', group: 'Greens' },

  // Blues
  { id: 'hague-blue', label: 'Hague Blue', hex: '#313E43', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'stiffkey-blue', label: 'Stiffkey Blue', hex: '#3B4657', brand: 'Farrow & Ball', group: 'Blues' },
  { id: 'denim-drift', label: 'Denim Drift', hex: '#8E9CA6', brand: 'Dulux Trade', group: 'Blues' },
  { id: 'bone-china-blue', label: 'Bone China Blue', hex: '#B7C4C3', brand: 'Little Greene', group: 'Blues' },

  // Warm & Earth
  { id: 'setting-plaster', label: 'Setting Plaster', hex: '#E3C6B8', brand: 'Farrow & Ball', group: 'Warm & Earth' },
  { id: 'red-earth', label: 'Red Earth', hex: '#B06A50', brand: 'Farrow & Ball', group: 'Warm & Earth' },
  { id: 'terracotta', label: 'Terracotta', hex: '#B5623F', brand: 'Little Greene', group: 'Warm & Earth' },

  // Greys & Darks
  { id: 'downpipe', label: 'Downpipe', hex: '#5B5E5B', brand: 'Farrow & Ball', group: 'Greys & Darks' },
  { id: 'railings', label: 'Railings', hex: '#45484D', brand: 'Farrow & Ball', group: 'Greys & Darks' },
  { id: 'off-black', label: 'Off-Black', hex: '#24262A', brand: 'Brushly', group: 'Greys & Darks' },

  // Exterior
  { id: 'classic-white-masonry', label: 'Classic White', hex: '#EFEAE0', brand: 'Brushly', group: 'Exterior' },
  { id: 'heritage-green', label: 'Heritage Green', hex: '#5E6B54', brand: 'Brushly', group: 'Exterior' },
  { id: 'stone-render', label: 'Stone', hex: '#C9BFA9', brand: 'Brushly', group: 'Exterior' },
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
