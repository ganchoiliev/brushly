import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /q/ and /i/ are private tokenised quote/invoice links; /api is
      // machine-only. None of these may enter the index.
      disallow: ['/admin', '/api/', '/q/', '/i/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
