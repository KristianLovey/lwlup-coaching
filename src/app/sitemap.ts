import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/page-metadata'

// Samo javne rute. Dinamičkih ruta (npr. [slug]) trenutno nema; kad se dodaju,
// njihove URL-ove treba ovdje generirati iz baze.
const PUBLIC_ROUTES = ['', '/team', '/competitions', '/records', '/treneri', '/survey', '/pravila']

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(path => ({
    url: `${SITE_URL}${path}`,
  }))
}
