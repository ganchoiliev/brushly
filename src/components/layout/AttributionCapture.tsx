'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/attribution'

/** Mount-only side effect; renders nothing. Lives in MarketingChrome. */
export default function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
