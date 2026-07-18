import { expect, it } from 'vitest'
import { LOOKS } from '@/lib/visualizer/palette'
import { LOOK_THUMBS } from './lookThumbs'

// Every curated Look ships a pre-rendered sample-room thumbnail, and no orphan
// thumb outlives a removed Look. On failure, regenerate with:
//   npx tsx --conditions=react-server scripts/generate-look-thumbs.ts --confirm-spend
it('LOOK_THUMBS stays in lockstep with LOOKS', () => {
  expect(Object.keys(LOOK_THUMBS).sort()).toEqual(LOOKS.map((l) => l.id).sort())
})
