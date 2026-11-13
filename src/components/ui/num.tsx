'use client'
import NumberFlow, { type Format } from '@number-flow/react'

/**
 * Broj koji se animira pri promjeni (NumberFlow): kg, total, %, dani.
 * Tekst (npr. '—') i prazna vrijednost ispisuju se kakvi jesu, bez animacije.
 * Bez grupiranja tisućica (1000 kg total ostaje "1000"). Poštuje prefers-reduced-motion.
 */
export function Num({ value, format, locales = 'en-US', fallback = '—' }: {
  value: number | string | null | undefined
  format?: Format
  /** 'hr-HR' za decimalni zarez (meet card) */
  locales?: string
  fallback?: string
}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    // Iste vertikalne mjere kao NumberFlow: line-height 1 + padding maske na dvije razine
    // (oko broja i oko svake znamenke, po pola visine maske). Inače je redak s '—' niži
    // od retka s brojem i sve ispod se pomakne (KPI "Predviđeni total"). Izmjereno na 0.6.2.
    const pad = 'calc(2 * round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px))'
    return (
      <span style={{ display: 'inline-block', lineHeight: 1, padding: `${pad} 0` }}>
        {value ?? fallback}
      </span>
    )
  }
  return <NumberFlow value={value} locales={locales} format={{ useGrouping: false, maximumFractionDigits: 2, ...format }} />
}
