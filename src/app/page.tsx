import type { Metadata } from 'next'
import Landing from './landing'
import { HOME_TITLE, HOME_DESCRIPTION, socialMetadata } from '@/lib/page-metadata'

// Serverski omotač naslovnice: landing.tsx je 'use client' i ne može izvesti metadata.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  ...socialMetadata(HOME_TITLE, HOME_DESCRIPTION, '/'),
}

export default function HomePage() {
  return <Landing />
}
