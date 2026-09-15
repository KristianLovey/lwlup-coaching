import type { Metadata } from 'next'

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | LWL UP Coaching`
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: 'LWL UP Coaching',
      type: 'website',
      images: [{ url: '/icon.png', width: 1302, height: 980, alt: 'LWL UP Coaching Logo' }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: ['/icon.png'] },
  }
}