import { roundToPlate, weightFromRpe } from './training-setplan'
import { pctForExercise } from './lift-variations'
import type { SetPlanRow } from './types'

/**
 * Račun za planer bloka (Walterova tablica).
 *
 * Primarni lift: linearno od kilaže na početku bloka do kilaže na kraju, po
 * tjednima, zaokruženo na 2.5 kg. Trener smije bilo koji tjedan pregaziti ručnim
 * upisom top seta (week_overrides) — tada taj tjedan koristi njegovu kilažu.
 *
 * Sekundarni lift: 1RM varijacije = natjecateljski 1RM × postotak varijacije
 * (lift-variations.ts, isti izvor koji koristi i kalkulator), a kilaža po tjednu
 * ide kroz RPE tablicu za zadani broj ponavljanja, s RPE-om koji linearno raste
 * od početnog do završnog.
 *
 * Backoff serije: svaka sljedeća serija je postotak PRETHODNE (kaskadno), što je
 * točno ono što set_plan već podržava (mode 'backoff', ref = prethodna serija).
 */

export type LiftPlan = {
  weeks: number
  primary1rm: number | null
  startKg: number | null
  endKg: number | null
  primaryReps: number
  primaryBackoffSets: number
  primaryBackoffPct: number
  secondaryExerciseId: string | null
  secondaryExerciseName: string | null
  secondary1rm: number | null
  secondaryReps: number
  secondaryStartRpe: number | null
  secondaryEndRpe: number | null
  secondaryBackoffSets: number
  secondaryBackoffPct: number
  weekOverrides: Record<string, number>
}

export type WeekRow = {
  week: number
  primaryKg: number | null
  /** kilaža dolazi iz ručnog upisa, ne iz izračuna */
  primaryManual: boolean
  secondaryKg: number | null
  secondaryRpe: number | null
}

export const emptyPlan = (weeks: number): LiftPlan => ({
  weeks,
  primary1rm: null, startKg: null, endKg: null,
  primaryReps: 3, primaryBackoffSets: 0, primaryBackoffPct: 92.5,
  secondaryExerciseId: null, secondaryExerciseName: null, secondary1rm: null,
  secondaryReps: 3, secondaryStartRpe: null, secondaryEndRpe: null,
  secondaryBackoffSets: 0, secondaryBackoffPct: 92.5,
  weekOverrides: {},
})

/** Linearno od početne do završne kilaže: 1. tjedan = početak, zadnji = kraj. */
export function rampKg(start: number, end: number, week: number, weeks: number): number {
  if (weeks <= 1 || week <= 1) return roundToPlate(start)
  if (week >= weeks) return roundToPlate(end)
  return roundToPlate(start + (end - start) * (week - 1) / (weeks - 1))
}

/** Isti raspored za RPE, zaokružen na 0.5 (RPE tablica ide u pola stepenice). */
export function rampRpe(start: number, end: number, week: number, weeks: number): number {
  const raw = weeks <= 1 || week <= 1 ? start : week >= weeks ? end : start + (end - start) * (week - 1) / (weeks - 1)
  return Math.round(raw * 2) / 2
}

/** 1RM varijacije iz natjecateljskog 1RM-a; null ako varijacija nema zadan postotak. */
export function autoSecondary1rm(primary1rm: number | null, exerciseName: string | null): number | null {
  const pct = pctForExercise(exerciseName)
  if (!primary1rm || !pct) return null
  return roundToPlate(primary1rm * pct / 100)
}

/**
 * set_plan za jednu vježbu: prva serija je top set (ručna kilaža), a svaka
 * sljedeća je `pct` % prethodne. Bez backoff serija vraća samo top set.
 */
export function backoffRows(backoffSets: number, pct: number): SetPlanRow[] {
  const rows: SetPlanRow[] = [{ mode: 'manual', pct, ref: 1 }]
  for (let i = 1; i <= Math.max(0, backoffSets); i++) rows.push({ mode: 'backoff', pct, ref: i - 1 })
  return rows
}

/** Kilaže po tjednima — točno ono što se prikaže u tablici i upiše u blok. */
export function planWeeks(plan: LiftPlan): WeekRow[] {
  const out: WeekRow[] = []
  const sec1rm = plan.secondary1rm ?? autoSecondary1rm(plan.primary1rm, plan.secondaryExerciseName)

  for (let w = 1; w <= Math.max(0, plan.weeks); w++) {
    const override = plan.weekOverrides[String(w)]
    const hasOverride = typeof override === 'number' && override > 0

    const primaryKg = hasOverride
      ? roundToPlate(override)
      : plan.startKg != null && plan.endKg != null
        ? rampKg(plan.startKg, plan.endKg, w, plan.weeks)
        : null

    const rpe = plan.secondaryStartRpe != null && plan.secondaryEndRpe != null
      ? rampRpe(plan.secondaryStartRpe, plan.secondaryEndRpe, w, plan.weeks)
      : null
    const secondaryKg = sec1rm != null && rpe != null ? weightFromRpe(sec1rm, plan.secondaryReps, rpe) : null

    out.push({ week: w, primaryKg, primaryManual: hasOverride, secondaryKg, secondaryRpe: rpe })
  }
  return out
}

/** Je li plan dovoljno popunjen da se smije upisati u blok. */
export function planReady(plan: LiftPlan): { ok: boolean; reason?: string } {
  if (!plan.weeks) return { ok: false, reason: 'Blok nema tjedana.' }
  if (plan.startKg == null || plan.endKg == null) return { ok: false, reason: 'Upiši kilažu na početku i na kraju bloka.' }
  if (plan.secondaryExerciseId) {
    const sec1rm = plan.secondary1rm ?? autoSecondary1rm(plan.primary1rm, plan.secondaryExerciseName)
    if (sec1rm == null) return { ok: false, reason: 'Sekundarni lift nema 1RM — upiši ga ili upiši natjecateljski 1RM.' }
    if (plan.secondaryStartRpe == null || plan.secondaryEndRpe == null) {
      return { ok: false, reason: 'Upiši početni i završni RPE za sekundarni lift.' }
    }
  }
  return { ok: true }
}
