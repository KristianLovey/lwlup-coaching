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

// ── Total tonnage ──────────────────────────────────────────────────────
// Sum of weight × reps across every logged set (the work actually done).
export function totalTonnage(
  sets: { weight_kg: number | null; reps: string | number | null }[],
): number {
  let t = 0
  for (const s of sets) {
    const w = Number(s.weight_kg)
    const r = parseFloat(String(s.reps ?? ''))
    if (w > 0 && Number.isFinite(r) && r > 0) t += w * r
  }
  return Math.round(t * 10) / 10
}

// ── Estimated 1RM ──────────────────────────────────────────────────────
// RPE / reps → % of 1RM chart (RTS). Index [reps-1], keyed by RPE (1..10, 0.5 step).
// 1RM = weight / pct. Covers every RPE value from 1 to 10.
const RPE_PCT: Record<string, number[]> = {
  '10':  [1, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599],
  '9.5': [0.9775, 0.9385, 0.907, 0.8775, 0.85, 0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855],
  '9':   [0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572],
  '8.5': [0.9385, 0.907, 0.8775, 0.85, 0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585],
  '8':   [0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545],
  '7.5': [0.907, 0.8775, 0.85, 0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315],
  '7':   [0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518],
  '6.5': [0.8775, 0.85, 0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045],
  '6':   [0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491],
  '5.5': [0.85, 0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045, 0.4775],
  '5':   [0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464],
  '4.5': [0.824, 0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045, 0.4775, 0.4505],
  '4':   [0.811, 0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437],
  '3.5': [0.7985, 0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045, 0.4775, 0.4505, 0.4235],
  '3':   [0.786, 0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437, 0.41],
  '2.5': [0.774, 0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045, 0.4775, 0.4505, 0.4235, 0.3965],
  '2':   [0.762, 0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437, 0.41, 0.383],
  '1.5': [0.7505, 0.723, 0.6935, 0.6665, 0.6395, 0.6125, 0.5855, 0.5585, 0.5315, 0.5045, 0.4775, 0.4505, 0.4235, 0.3965, 0.3695],
  '1':   [0.739, 0.707, 0.68, 0.653, 0.626, 0.599, 0.572, 0.545, 0.518, 0.491, 0.464, 0.437, 0.41, 0.383, 0.356],
}

// Returns the estimate rounded to the nearest 2.5 kg plate, or null when
// there isn't enough data. Uses the RPE chart for any RPE 1..10; if RPE is
// missing or reps exceed the chart, falls back to Epley.
export function estimate1RM(
  weight: number | null | undefined,
  reps: string | number | null | undefined,
  rpe: number | null | undefined,
): number | null {
  const w = Number(weight)
  const r = parseFloat(String(reps ?? ''))
  if (!w || !Number.isFinite(r) || r < 1) return null
  const reps1 = Math.max(1, Math.min(15, Math.round(r)))
  const rpeNum = Number(rpe)
  if (Number.isFinite(rpeNum) && rpeNum >= 1 && rpeNum <= 10 && r <= 15) {
    const key = String(Math.max(1, Math.min(10, Math.round(rpeNum * 2) / 2)))
    const pct = RPE_PCT[key]?.[reps1 - 1]
    if (pct) return roundToPlate(w / pct)
  }
  // fallback (no/invalid RPE or reps > 15) — Epley
  return roundToPlate(reps1 <= 1 ? w : w * (1 + reps1 / 30))
}
