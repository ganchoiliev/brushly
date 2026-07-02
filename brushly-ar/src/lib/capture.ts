import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Image } from 'react-native'

/* Prepare a captured AR frame for the render API: downscale to the same
   1600px longest side the web uploader uses and re-encode as JPEG. The
   re-encode also strips any metadata, matching the site's privacy stance. */

const MAX_DIM = 1600

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Could not read the captured photo.')),
    ),
  )
}

export async function toUploadJpeg(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri)
  const context = ImageManipulator.manipulate(uri)
  if (Math.max(width, height) > MAX_DIM) {
    context.resize(width >= height ? { width: MAX_DIM } : { height: MAX_DIM })
  }
  const image = await context.renderAsync()
  const saved = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG })
  return saved.uri
}
