/**
 * Pravni podaci o subjektu — jedno mjesto iz kojeg ih povlače footer i pravila.
 *
 * POPUNI prije objave: naziv, OIB i sjedište obvezni su po Zakonu o elektroničkoj
 * trgovini (čl. 6), a kontakt e-mail je kanal za zahtjeve iz GDPR-a (uvid, ispravak,
 * brisanje, prenosivost). Prazna polja se nigdje ne ispisuju, pa stranica izgleda
 * ispravno i dok su prazna — ali obveza je ispunjena tek kad se popune.
 */
export const LEGAL = {
  /** Puni registrirani naziv, npr. "Powerlifting klub LWL UP" */
  entity: 'PLK LWL UP',
  /** OIB pravne osobe ili obrta */
  oib: '', // TODO: upisati čim bude poznat — bez njega podnožje nije potpuno
  /** Sjedište: ulica i kućni broj, poštanski broj i grad */
  address: 'Celine',
  /** Registar u koji je subjekt upisan, npr. "Registar udruga RH" (neobvezno) */
  registry: '',
  /** E-mail za upite, pritužbe i zahtjeve za podatke */
  email: 'lwlup.coaching@gmail.com',
  instagram: 'https://www.instagram.com/lwlup/',
  instagramHandle: '@lwlup',
  /** Datum stupanja na snagu zadnje verzije pravila */
  updated: '1. listopada 2026.',
} as const

/** Identifikacijski redci za ispis — bez praznih vrijednosti. */
export const legalLines = (): string[] =>
  [
    LEGAL.entity,
    LEGAL.oib ? `OIB: ${LEGAL.oib}` : '',
    LEGAL.address,
    LEGAL.registry,
  ].filter(Boolean)

/** Kanal za zahtjeve: e-mail ako je upisan, inače Instagram. */
export const contactLabel = (): string => LEGAL.email || `Instagram ${LEGAL.instagramHandle}`
export const contactHref = (): string => (LEGAL.email ? `mailto:${LEGAL.email}` : LEGAL.instagram)

/**
 * Tekstovi privole uz prijavne obrasce.
 *
 * GDPR čl. 7. st. 1. traži da možemo dokazati da je osoba pristala i na što
 * točno — zato se uz prijavu šalje i verzija teksta i vrijeme potvrde. Ako se
 * tekst promijeni, podigni CONSENT_VERSION da se stare i nove privole razlikuju.
 */
export const CONSENT_VERSION = '2026-10-01'

export const CONSENT = {
  general:
    'Suglasan/na sam da LWL UP obrađuje podatke upisane u ovaj obrazac radi kontakta i procjene prijave. Potvrđujem da sam pročitao/la Pravila privatnosti i korištenja.',
  health:
    'Izričito dopuštam obradu podataka o ozljedama i zdravstvenim ograničenjima koje sam upisao/la, isključivo radi prilagodbe trenažnog programa (čl. 9. GDPR-a). Privolu mogu povući u svakom trenutku.',
  guardian:
    'Mlađa/i sam od 18 godina i potvrđujem da roditelj ili zakonski skrbnik zna za ovu prijavu i daje privolu za obradu mojih podataka.',
} as const
