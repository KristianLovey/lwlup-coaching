'use client'
import { useEffect, useState } from 'react'

/**
 * true dok media query vrijedi. Na serveru i u prvom renderu je false (desktop),
 * pa se mobilni raspored uključi odmah nakon hidracije.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return matches
}
