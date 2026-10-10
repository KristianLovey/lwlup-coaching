'use client'
import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { LEGAL } from '@/lib/legal'

/**
 * Kontakt e-mail koji se slaže tek u pregledniku.
 *
 * U HTML-u koji šalje server adrese nema, pa je botovi koji skupljaju adrese za
 * spam ne vide; čovjek je vidi trenutak nakon učitavanja. Zakon traži da je
 * adresa dostupna korisniku — i jest, samo nije u izvornom kodu stranice.
 */
export function EmailLink({ render, fallback = 'E-MAIL', ...rest }: {
  /** kako prikazati adresu, npr. a => `KONTAKT · ${a.toUpperCase()}` */
  render?: (address: string) => ReactNode
  /** tekst dok se adresa ne složi */
  fallback?: ReactNode
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'>) {
  const [address, setAddress] = useState<string | null>(null)
  useEffect(() => { setAddress(LEGAL.email || null) }, [])
  if (!LEGAL.email) return null
  return (
    <a {...rest} href={address ? `mailto:${address}` : undefined}>
      {address ? (render ? render(address) : address) : fallback}
    </a>
  )
}
