/* Viro material registry for the wall quads: one material per
   (colour, sheen) pair so switching colour OR finish live-recolours
   the detected walls. Names are derived, never hard-coded elsewhere. */

import { PALETTE } from '@/lib/palette'

export type Sheen = 'matte' | 'satin' | 'gloss'

/* How each finish reads in AR. Anything unlisted falls back to matte —
   wallpaper patterns and rough masonry have no meaningful sheen. */
const FINISH_SHEEN: Record<string, Sheen> = {
  'Matte emulsion': 'matte',
  Eggshell: 'satin',
  Satinwood: 'satin',
  Gloss: 'gloss',
  'Smooth masonry': 'matte',
  'Textured masonry': 'matte',
  'Satin trim': 'satin',
  'Gloss trim': 'gloss',
  'Venetian plaster': 'satin',
  Limewash: 'matte',
  Metallic: 'gloss',
  'Colour wash': 'matte',
}

export function sheenForFinish(finish: string): Sheen {
  return FINISH_SHEEN[finish] ?? 'matte'
}

export function wallMaterialName(colorId: string, sheen: Sheen): string {
  return `wall-${colorId}-${sheen}`
}

/* PBR, not Blinn/Phong: the scene's only directional light points nearly
   straight down — parallel to vertical walls — so specular shininess never
   produced a visible highlight and matte/satin/gloss looked identical.
   Roughness under PBR responds to the ambient estimate instead.
   DEVICE-QA: verify quads aren't rendered dark under PBR with only
   ViroAmbientLight (no lighting environment is set). */
const SHEEN_PROPS: Record<Sheen, { roughness: number }> = {
  matte: { roughness: 0.95 },
  satin: { roughness: 0.55 },
  gloss: { roughness: 0.25 },
}

/* All (colour × sheen) material definitions — registered once by the
   AR scene module via ViroMaterials.createMaterials(WALL_MATERIALS). */
export const WALL_MATERIALS: Record<
  string,
  { diffuseColor: string; lightingModel: 'PBR'; roughness: number; metalness: number }
> = Object.fromEntries(
  PALETTE.flatMap((color) =>
    (Object.keys(SHEEN_PROPS) as Sheen[]).map((sheen) => [
      wallMaterialName(color.id, sheen),
      {
        diffuseColor: color.hex,
        lightingModel: 'PBR' as const,
        metalness: 0,
        ...SHEEN_PROPS[sheen],
      },
    ]),
  ),
)
