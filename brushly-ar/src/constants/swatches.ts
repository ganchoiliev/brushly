/* B2: hard-coded starter swatches. B3 replaces this with the full Brushly
   palette port — ids and hexes already match src/lib/visualizer/palette.ts
   on the site so the swap is a drop-in. */

export interface Swatch {
  id: string
  label: string
  hex: string
}

export const SWATCHES: Swatch[] = [
  { id: 'wimborne-white', label: 'Wimborne White', hex: '#F0EBDA' },
  { id: 'cornforth-white', label: 'Cornforth White', hex: '#CFC9BE' },
  { id: 'setting-plaster', label: 'Setting Plaster', hex: '#E3C6B8' },
  { id: 'sage-green', label: 'Sage Green', hex: '#9AA089' },
  { id: 'hague-blue', label: 'Hague Blue', hex: '#313E43' },
  { id: 'terracotta', label: 'Terracotta', hex: '#B5623F' },
]

export const DEFAULT_SWATCH_ID = 'sage-green'

/* Viro material name for a swatch — must match wall-scene registration. */
export function wallMaterialName(swatchId: string): string {
  return `wall-${swatchId}`
}
