import type { VisualizerService } from '@/lib/supabase/types'
import { SERVICE_SURFACES, type PaintColor } from './palette'

/* Constrained-edit prompt: change only the service's surfaces, preserve
   everything else. This is the #1 anti-hallucination lever alongside the
   scope decision (furniture always preserved). */
export function buildPrompt(
  service: VisualizerService,
  color: PaintColor,
  finish?: string,
): string {
  const surfaces = SERVICE_SURFACES[service]

  let action: string
  if (service === 'wallpaper') {
    action = `Apply ${finish ? finish.toLowerCase() + ' ' : ''}wallpaper in the colour "${color.label}" (${color.hex}) to ${surfaces}.`
  } else if (service === 'finish') {
    action = `Apply a ${finish ? finish.toLowerCase() : 'specialist decorative'} finish in the colour "${color.label}" (${color.hex}) to ${surfaces}.`
  } else {
    const finishText = finish ? ` in a ${finish.toLowerCase()} finish` : ''
    action = `Repaint ONLY ${surfaces} to the colour "${color.label}" (${color.hex})${finishText}.`
  }

  return [
    action,
    'The second image in this message is a solid swatch of the exact target colour — match the redecorated surfaces to that swatch precisely, adjusted only for the room’s own lighting and shadows.',
    'Preserve everything else EXACTLY as in the original photograph: furniture, flooring, rugs, windows, doors, skirting where not being painted, radiators, decor, personal belongings, clutter, room layout and camera perspective.',
    'Keep all natural lighting, reflections and shadows physically consistent with the original. Do not add, remove, move or restyle any objects. Do not alter the floor.',
    'Do not crop, zoom, rotate or change the aspect ratio or framing of the photograph.',
    'The result must look like a real photograph of the same room, only with the specified surfaces redecorated.',
  ].join(' ')
}
