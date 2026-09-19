import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/team', '/competitions', '/records', '/treneri', '/survey', '/pravila'].map(path => ({
    url: `https://lwlup.com${path}`,
  }))
}