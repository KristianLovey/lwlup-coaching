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
    const row = rows[i] ?? { mode: 'manual' as const, pct: 90, ref: i > 0 ? i - 1 : 1 }
    if (row.mode !== 'backoff') {
      out[i] = manual[i] ?? null
    } else {
      const base = resolve(row.ref, seen)
      out[i] = base != null ? roundToPlate(base * (row.pct || 0) / 100) : null
    }
    return out[i]
  }

  for (let i = 0; i < n; i++) out[i] = resolve(i, new Set())
  return out
}

// Round to the nearest 2.5 kg plate increment (e.g. 23.1 → 22.5, 24.6 → 25)
export function roundToPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}

export function defaultRow(i: number): SetPlanRow {
  // Default reference is the previous set; the very first set falls back to the second
  return { mode: 'manual', pct: 90, ref: i > 0 ? i - 1 : 1 }
}

// ── Estimated 1RM ──────────────────────────────────────────────────────
// Epley formula with RPE-derived reps-in-reserve. Returns the estimate
// rounded to the nearest 2.5 kg plate, or null when there isn't enough data.
export function estimate1RM(
  weight: number | null | undefined,
  reps: string | number | null | undefined,
  rpe: number | null | undefined,
): number | null {
  const w = Number(weight)
  const r = parseFloat(String(reps ?? ''))
  if (!w || !Number.isFinite(r) || r < 1) return null
  const rpeNum = Number(rpe)
  // Only trust RPE within a realistic top-set range; otherwise just use reps
  const rir = Number.isFinite(rpeNum) && rpeNum >= 5 && rpeNum <= 10 ? 10 - rpeNum : 0
  const eff = r + rir
  const oneRm = eff <= 1 ? w : w * (1 + eff / 30)
  return roundToPlate(oneRm)
}
