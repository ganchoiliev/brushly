/* Download / share a render. Fetches the signed URL to a blob (CORS GET),
   stamps a subtle Brushly watermark via canvas (no cross-origin taint because
   pixels arrive through fetch), then downloads or uses the Web Share API. */

async function toWatermarkedBlob(url: string): Promise<Blob> {
  const resp = await fetch(url)
  const srcBlob = await resp.blob()
  try {
    const bmp = await createImageBitmap(srcBlob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return srcBlob
    ctx.drawImage(bmp, 0, 0)

    const pad = Math.round(bmp.width * 0.02)
    const fontSize = Math.max(14, Math.round(bmp.width * 0.022))
    ctx.font = `600 ${fontSize}px sans-serif`
    ctx.textBaseline = 'bottom'
    const text = 'Brushly · brushly.uk'
    const tw = ctx.measureText(text).width
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(bmp.width - tw - pad * 2, bmp.height - fontSize - pad * 1.4, tw + pad * 2, fontSize + pad)
    ctx.fillStyle = 'rgba(245,240,235,0.95)'
    ctx.fillText(text, bmp.width - tw - pad, bmp.height - pad * 0.5)
    bmp.close?.()

    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
    return out || srcBlob
  } catch {
    return srcBlob
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objUrl), 4000)
}

export async function downloadRender(url: string, filename = 'brushly-visualisation.jpg') {
  const blob = await toWatermarkedBlob(url)
  triggerDownload(blob, filename)
}

export async function shareRender(url: string): Promise<'shared' | 'downloaded'> {
  const blob = await toWatermarkedBlob(url)
  const file = new File([blob], 'brushly-visualisation.jpg', { type: 'image/jpeg' })
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: 'My Brushly visualisation',
        text: 'Here’s my room, visualised by Brushly.',
      })
      return 'shared'
    } catch {
      // user cancelled or share failed — fall back to download
    }
  }
  triggerDownload(blob, 'brushly-visualisation.jpg')
  return 'downloaded'
}
