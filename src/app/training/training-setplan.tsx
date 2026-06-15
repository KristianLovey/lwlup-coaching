import type { SetPlanRow } from './types'

// ── Per-set weight calculation ─────────────────────────────────────────
// Given each set's manual weight (null when not typed) and the per-set plan
// rows, resolve the effective weight of every set. "backoff" sets are a % of
// the weight of an earlier referenced set (resolved recursively). A cycle or
// missing reference resolves to null.
export function computeWeights(
  manual: (number | null | undefined)[],
  rows: SetPlanRow[],
): (number | null)[] {
  const n = manual.length
  const out: (number | null)[] = new Array(n).fill(null)

  const resolve = (i: number, seen: Set<number>): number | null => {
    if (i < 0 || i >= n) return null
    if (out[i] != null) return out[i]
    if (seen.has(i)) return null // cycle guard
    seen.add(i)
    const row = rows[i] ?? { mode: 'manual' as const, pct: 90, ref: Math.max(0, i - 1) }
    if (row.mode !== 'backoff') {
      out[i] = manual[i] ?? null
    } else {
      const base = resolve(row.ref, seen)
      out[i] = base != null ? Math.round(base * (row.pct || 0) / 100 * 10) / 10 : null
    }
    return out[i]
  }

  for (let i = 0; i < n; i++) out[i] = resolve(i, new Set())
  return out
}

export function defaultRow(i: number): SetPlanRow {
  return { mode: 'manual', pct: 90, ref: Math.max(0, i - 1) }
}
