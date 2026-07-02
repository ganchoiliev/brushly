import { notFound } from 'next/navigation'
import SegmentationDebug from './SegmentationDebug'

export const metadata = {
  title: 'Wall segmentation debug',
  robots: { index: false, follow: false },
}

// Dev-only harness for eyeballing the on-device wall-segmentation mask.
// Never ships: production requests 404.
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <SegmentationDebug />
}
