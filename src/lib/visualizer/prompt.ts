import type { VisualizerService } from '@/lib/supabase/types'
import { SERVICE_SURFACES, type PaintColor } from './palette'

/* Constrained-edit prompt: change only the service's surfaces, preserve
   everything else. This is the #1 anti-hallucination lever alongside the
   scope decision (furniture always preserved). */
export function buildPrompt(
  service: VisualizerService,
  color: PaintColor,
  finish?: string,
  opts?: {
    /** A customer-supplied wallpaper image rides along as the second image
        part instead of the colour swatch. */
    customWallpaper?: boolean
  },
): string {
  const surfaces = SERVICE_SURFACES[service]
  const customWallpaper = Boolean(opts?.customWallpaper) && service === 'wallpaper'

  let action: string
  let reference: string
  if (customWallpaper) {
    action = `Apply the wallpaper shown in the second image to ${surfaces}.`
    reference =
      'The second image in this message is the customer’s chosen wallpaper — reproduce its pattern, colours and texture faithfully, hung at a realistic physical scale for a wall, with pattern repeats and lighting that follow the wall’s perspective.'
  } else {
    if (service === 'wallpaper') {
      action = `Apply ${finish ? finish.toLowerCase() + ' ' : ''}wallpaper in the colour "${color.label}" (${color.hex}) to ${surfaces}.`
    } else if (service === 'finish') {
      action = `Apply a ${finish ? finish.toLowerCase() : 'specialist decorative'} finish in the colour "${color.label}" (${color.hex}) to ${surfaces}.`
    } else {
      const finishText = finish ? ` in a ${finish.toLowerCase()} finish` : ''
      action = `Repaint ONLY ${surfaces} to the colour "${color.label}" (${color.hex})${finishText}.`
    }
    reference =
      'The second image in this message is a solid swatch of the exact target colour — match the redecorated surfaces to that swatch precisely, adjusted only for the room’s own lighting and shadows.'
  }

  return [
    action,
    reference,
    'Preserve everything else EXACTLY as in the original photograph: the ceiling (keep its original colour — never paint the ceiling), furniture, flooring, rugs, windows, doors, skirting where not being painted, radiators, decor, personal belongings, clutter, room layout and camera perspective.',
    'Where the original photograph is dark, blurry, underexposed or ambiguous — for example the view through a doorway into another room, hallway or stairwell — reproduce that region exactly as it appears. NEVER invent doors, stairs, banisters, carpets, furniture or any architectural detail that is not clearly visible in the original.',
    'Do not change the colour, material or style of ANY object: chairs, desks, appliances and every other item keep their exact original colours. Keep all natural lighting, reflections and shadows physically consistent with the original. Do not add, remove, move or restyle any objects. Do not alter the floor.',
    'Do not crop, zoom, rotate or change the aspect ratio or framing of the photograph.',
    'The result must look like a real photograph of the same room, only with the specified surfaces redecorated.',
  ].join(' ')
}
