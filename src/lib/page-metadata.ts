import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legal'

export const SITE_URL = 'https://lwlup.com'
export const SITE_NAME = 'LWL UP Powerlifting'

// Počinje imenom stranice (isto kao og:site_name i WebSite.name u JSON-LD), da Google
// dosljedno prikazuje naziv stranice u rezultatima.
export const HOME_TITLE = `${SITE_NAME} | Powerlifting klub Zagreb, treninzi i natjecanja`
export const HOME_DESCRIPTION =
  'LWL UP je powerlifting klub sa zagrebačkog područja. Individualni programi, analiza tehnike i priprema za natjecanja uz trenera Waltera Smajlovića.'

// Isti sufiks kao title.template u root layoutu. og:title i twitter:title ne
// nasljeđuju title.template, pa ih slažemo ručno.
const TITLE_SUFFIX = ' | LWL UP Powerlifting Zagreb'

// Slika iz app/opengraph-image.tsx. Metadata se spaja plitko: podstranica koja
// postavi openGraph zamjenjuje CIJELI roditeljski openGraph (i sliku), pa je
// svaka stranica mora navesti sama.
const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'LWL UP – Powerlifting klub Zagreb' }

export function socialMetadata(fullTitle: string, description: string, path?: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      title: fullTitle,
      description,
      ...(path ? { url: path } : {}),
      siteName: SITE_NAME,
      locale: 'hr_HR',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [OG_IMAGE.url] },
  }
}

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialMetadata(`${title}${TITLE_SUFFIX}`, description, path),
  }
}

/** Rute iza prijave / interne rute: vlastiti naslov, ali bez indeksiranja. */
export function privatePageMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } }
}

/** schema.org podaci o klubu. Prazna polja adrese se izostavljaju. */
const CLUB = {
  '@type': 'SportsClub',
  '@id': `${SITE_URL}/#club`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description: HOME_DESCRIPTION,
  email: LEGAL.email,
  sport: 'Powerlifting',
  foundingDate: '2026',
  address: {
    '@type': 'PostalAddress',
    ...(LEGAL.street ? { streetAddress: LEGAL.street } : {}),
    ...(LEGAL.postalCode ? { postalCode: LEGAL.postalCode } : {}),
    addressLocality: LEGAL.locality,
    addressCountry: 'HR',
  },
  areaServed: [
    { '@type': 'City', name: 'Zagreb' },
    { '@type': 'AdministrativeArea', name: 'Zagrebačka županija' },
  ],
  sameAs: [LEGAL.instagram],
  founder: [
    { '@type': 'Person', name: 'Walter Smajlović', jobTitle: 'Glavni trener' },
    { '@type': 'Person', name: 'Luka Grežina', jobTitle: 'Potpredsjednik' },
  ],
}

/** WebSite: iz njega Google uzima naziv stranice (site name) u rezultatima pretrage. */
const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ['LWL UP', 'LWLUP'],
  url: SITE_URL,
  inLanguage: 'hr-HR',
  publisher: { '@id': CLUB['@id'] },
}

/** JSON-LD za root layout: WebSite + SportsClub u jednom grafu. */
export const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [WEBSITE, CLUB],
}

/** JSON za <script type="application/ld+json">. "<" je escapiran da sadržaj ne može zatvoriti script tag. */
export const jsonLd = (data: object): string => JSON.stringify(data).replace(/</g, '\\u003c')
