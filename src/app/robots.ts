import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/page-metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // API, prijava i rute iza prijave (admin, trenerski panel, trening, profil)
      disallow: ['/api/', '/admin', '/trainer', '/training', '/profile', '/auth', '/403'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
