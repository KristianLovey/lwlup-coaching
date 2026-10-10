import type { Metadata } from 'next'
import Landing from './landing'
import { HOME_TITLE, HOME_DESCRIPTION, socialMetadata, jsonLd } from '@/lib/page-metadata'
import { FAQ_JSON_LD } from '@/lib/faq'

// Serverski omotač naslovnice: landing.tsx je 'use client' i ne može izvesti metadata.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  ...socialMetadata(HOME_TITLE, HOME_DESCRIPTION, '/'),
}

export default function HomePage() {
  return (
    <>
      {/* ista pitanja i odgovori kao u sekciji ČESTA PITANJA (src/lib/faq.ts) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(FAQ_JSON_LD) }} />
      <Landing />
    </>
  )
}
