import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { File as FSFile } from 'expo-file-system'
import { Platform } from 'react-native'

import type { VisualizerService } from '@/lib/palette'

/* "My Rooms" local persistence — every rendered room is kept on the device so
   it survives past the server's ~24h signed-URL TTL and is re-openable in-app.

   Two stores, deliberately split:
   - Metadata lives in AsyncStorage under INDEX_KEY (a JSON array of rooms).
   - Image bytes live on disk in Paths.document/<ROOMS_DIRNAME>/<roomId>/. The
     document dir is used (not cache) because the system can evict cache; a kept
     room must not lose its images.

   Web-SSR safety: expo-file-system's native-extending File/Directory/Paths
   crash the web target's Node render, so they are lazy-imported inside the
   functions that touch disk, and every entry point early-returns on web. The
   screens only ever call these from effects/handlers, never during render. */

const INDEX_KEY = 'brushly.savedRooms.v1'
const ROOMS_DIRNAME = 'brushly-rooms'

export interface SavedWall {
  /** The server render id — also the on-disk filename stem (stable, dedupes). */
  renderId: string
  /** Persistent file:// uri of the original (before) photo. */
  beforePath: string
  /** Persistent file:// uri of the rendered (after) image. */
  afterPath: string
  /** Look calibration carried from the render, so "See it live" still works. */
  calibration?: { paint: [number, number, number]; wallLum: number }
}

export interface SavedRoom {
  id: string
  /** Epoch ms — when the room was first kept. */
  createdAt: number
  colorId: string
  finish: string
  service: VisualizerService
  walls: SavedWall[]
}

/** One wall to persist, sourced from a finished tile on the room result screen. */
export interface WallInput {
  renderId: string
  /** On-device capture (the before) — copied to persistent storage (fast). */
  localBeforeUri: string
  /** Signed server url of the before — network fallback if the copy fails. */
  beforeUrl?: string
  /** Signed server url of the after — downloaded to persistent storage. */
  afterUrl: string
  /** Extension of the after image, derived from its url ('jpg' | 'png'). */
  afterExt: 'jpg' | 'png'
  calibration?: { paint: [number, number, number]; wallLum: number }
}

async function readIndex(): Promise<SavedRoom[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedRoom[]) : []
  } catch {
    return []
  }
}

async function writeIndex(rooms: SavedRoom[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(rooms))
}

/** All kept rooms, newest first. Empty on web (no persistence target). */
export async function listRooms(): Promise<SavedRoom[]> {
  if (Platform.OS === 'web') return []
  const rooms = await readIndex()
  return rooms.slice().sort((a, b) => b.createdAt - a.createdAt)
}

export async function getRoom(id: string): Promise<SavedRoom | null> {
  if (Platform.OS === 'web') return null
  const rooms = await readIndex()
  return rooms.find((r) => r.id === id) ?? null
}

/* Guard against a "successful" download of a non-image body.
   File.downloadFileAsync rejects on a non-2xx status, but an expired or failed
   signed url can still answer 2xx with a tiny XML/JSON error (or a proxy's HTML
   interstitial) — bytes that land on disk looking like a real render. Recorded
   unchecked, that path is kept forever (the url expires in ~24h and is never
   re-fetched) and the tile shows blank. Two cheap, decisive checks catch it:
   a size floor — error/interstitial bodies are a few hundred bytes to a few KB,
   a real render is tens of KB+ — and an image magic-number sniff, since an
   XML/JSON/HTML body can never begin with a JPEG/PNG/WebP/GIF signature. */
const MIN_IMAGE_BYTES = 1024

function hasImageMagic(b: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return true
  // GIF: "GIF8" (87a / 89a)
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return true
  // WebP: "RIFF"????"WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return true
  return false
}

/** True only when `file` is on disk, above a sane size floor, and begins with a
 *  real image signature — i.e. a genuine render, not a downloaded error body.
 *  Used to gate every downloaded after-image before it is recorded or persisted;
 *  reused by the room-result save-to-Photos path so neither can keep a blank. */
export async function isValidImageFile(file: FSFile): Promise<boolean> {
  try {
    if (!file.exists || file.size < MIN_IMAGE_BYTES) return false
    return hasImageMagic(await file.bytes())
  } catch {
    return false
  }
}

/* Persist (upsert) a room. Idempotent by design:
   - re-called for the same id (e.g. after a Retry adds walls) it only downloads
     images that aren't already on disk, and preserves the original createdAt;
   - a wall that fails to persist is skipped, the rest are kept;
   - if NOTHING persists and the room is new, the empty folder is cleaned up and
     the call throws (an existing room is never destroyed by a failed re-save). */
export async function saveRoom(input: {
  id: string
  createdAt: number
  colorId: string
  finish: string
  service: VisualizerService
  walls: WallInput[]
}): Promise<SavedRoom> {
  if (Platform.OS === 'web') {
    return {
      id: input.id,
      createdAt: input.createdAt,
      colorId: input.colorId,
      finish: input.finish,
      service: input.service,
      walls: [],
    }
  }

  const { Directory, File, Paths } = await import('expo-file-system')
  const rooms = await readIndex()
  const existing = rooms.find((r) => r.id === input.id)

  const dir = new Directory(Paths.document, ROOMS_DIRNAME, input.id)
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })

  /* Write into a "<name>.part" temp file and move it into the final name ONLY
     after the write fully succeeds. So a file at the final path is always
     complete — the `finalFile.exists` skip can never adopt a truncated image
     left behind by a failed/partial download. (Android streams straight into the
     destination and does NOT delete it on failure, so a mid-download network
     drop would otherwise leave a corrupt file that's recorded forever, since the
     signed url expires in ~24h and is never re-fetched.) */
  const materialise = async (
    finalFile: FSFile,
    write: (tmp: FSFile) => Promise<unknown>,
  ): Promise<void> => {
    if (finalFile.exists) return
    const tmp = new File(dir, `${finalFile.name}.part`)
    try {
      if (tmp.exists) tmp.delete()
    } catch {
      // stale temp from a prior crash — the write below overwrites it
    }
    try {
      await write(tmp)
      await tmp.move(finalFile)
    } catch (error) {
      try {
        if (tmp.exists) tmp.delete()
      } catch {
        // best-effort cleanup; a leftover .part is retried on the next save
      }
      throw error
    }
  }

  const walls: SavedWall[] = []
  for (const w of input.walls) {
    try {
      const afterFile = new File(dir, `after-${w.renderId}.${w.afterExt}`)
      await materialise(afterFile, (tmp) =>
        File.downloadFileAsync(w.afterUrl, tmp, { idempotent: true }),
      )
      // The download can "succeed" on a non-image body (see isValidImageFile).
      // Verify before recording the wall: a bad file is deleted so it's never
      // adopted by the `finalFile.exists` skip on a later save, and this wall is
      // dropped into the catch below rather than kept as a permanent blank tile.
      if (!(await isValidImageFile(afterFile))) {
        try {
          if (afterFile.exists) afterFile.delete()
        } catch {
          // best effort — a leftover is re-checked (and rejected) on the next save
        }
        throw new Error('after image failed verification')
      }

      const beforeFile = new File(dir, `before-${w.renderId}.jpg`)
      await materialise(beforeFile, async (tmp) => {
        try {
          // The capture is already a local file — a copy is instant and needs
          // no network, so it's tried first.
          await new File(w.localBeforeUri).copy(tmp)
        } catch {
          try {
            if (tmp.exists) tmp.delete()
          } catch {
            // fall through to the network fetch
          }
          if (!w.beforeUrl) throw new Error('no before source')
          await File.downloadFileAsync(w.beforeUrl, tmp, { idempotent: true })
        }
      })

      walls.push({
        renderId: w.renderId,
        beforePath: beforeFile.uri,
        afterPath: afterFile.uri,
        calibration: w.calibration,
      })
    } catch {
      // Skip this wall; the aggregate room is still worth keeping.
    }
  }

  if (!walls.length) {
    // Never leave a dangling empty folder for a brand-new room, and never
    // clobber a previously-saved room just because this re-save persisted none.
    if (!existing) {
      try {
        dir.delete()
      } catch {
        // best effort
      }
    }
    throw new Error('Could not save this room.')
  }

  const room: SavedRoom = {
    id: input.id,
    createdAt: existing?.createdAt ?? input.createdAt,
    colorId: input.colorId,
    finish: input.finish,
    service: input.service,
    walls,
  }
  await writeIndex([room, ...rooms.filter((r) => r.id !== input.id)])
  return room
}

/* Delete a kept room. Drops the index entry FIRST: if the index write fails we
   leave everything as-is (the room stays listed and openable) rather than
   deleting its files out from under a still-listed entry. Never rejects, so
   callers don't need a rejection handler. */
export async function deleteRoom(id: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const rooms = await readIndex()
    await writeIndex(rooms.filter((r) => r.id !== id))
  } catch {
    // Couldn't update the index — do not touch the files; the room is intact.
    return
  }
  // The room is no longer referenced; remove its image folder (best-effort —
  // orphaned files are harmless and never surface in the list).
  try {
    const { Directory, Paths } = await import('expo-file-system')
    const dir = new Directory(Paths.document, ROOMS_DIRNAME, id)
    if (dir.exists) dir.delete()
  } catch {
    // ignore
  }
}

/** A fresh room id — used by the result screen to key one render session. */
export function newRoomId(): string {
  return randomUUID()
}
