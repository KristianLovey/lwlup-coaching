import { roundToPlate, weightFromRpe } from './training-setplan'
import { pctForExercise } from './lift-variations'
import type { SetPlanRow } from './types'

/**
 * Račun za planer bloka (Walterova tablica).
 *
 * Primarni lift: linearno od kilaže na početku bloka do kilaže na kraju, po
 * tjednima, zaokruženo na 2.5 kg. Trener smije bilo koji tjedan pregaziti ručnim
 * upisom top seta (weekOverrides) — tada taj tjedan koristi njegovu kilažu.
 *
 * Dodatni liftovi (sekundarni, tercijarni… — trener ih ima i po četiri tjedno):
 * 1RM varijacije = natjecateljski 1RM × postotak varijacije (lift-variations.ts,
 * isti izvor koji koristi i RPE tablica), a kilaža po tjednu ide kroz RPE tablicu
 * za zadani broj ponavljanja, s RPE-om koji linearno raste od početnog do završnog.
 *
 * Serije: svaka sljedeća je postotak PRETHODNE (kaskadno) — ispod 100 % je pad
 * (backoff), iznad 100 % je skok (ascending). To set_plan već podržava.
 */

export type ExtraLift = {
  /** stabilan ključ liste (React) — ne dolazi iz baze */
  id: string
  exerciseId: string | null
  exerciseName: string | null
  oneRm: number | null
  reps: number
  startRpe: number | null
  endRpe: number | null
  backoffSets: number
  backoffPct: number
}

export type LiftPlan = {
  weeks: number
  primary1rm: number | null
  startKg: number | null
  endKg: number | null
  primaryReps: number
  primaryBackoffSets: number
  primaryBackoffPct: number
  extras: ExtraLift[]
  weekOverrides: Record<string, number>
}

export type WeekRow = {
  week: number
  primaryKg: number | null
  /** kilaža dolazi iz ručnog upisa, ne iz izračuna */
  primaryManual: boolean
  /** po jedan unos za svaki dodatni lift, istim redoslijedom kao plan.extras */
  extras: { kg: number | null; rpe: number | null }[]
}

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `x${Date.now()}${Math.random().toString(36).slice(2, 8)}`)

export const newExtra = (): ExtraLift => ({
  id: uid(),
  exerciseId: null, exerciseName: null, oneRm: null,
  reps: 3, startRpe: null, endRpe: null,
  backoffSets: 0, backoffPct: 92.5,
})

export const emptyPlan = (weeks: number): LiftPlan => ({
  weeks,
  primary1rm: null, startKg: null, endKg: null,
  primaryReps: 3, primaryBackoffSets: 0, primaryBackoffPct: 92.5,
  extras: [],
  weekOverrides: {},
})

/** Iz baze (jsonb) u tipiziranu listu — nedostajuće vrijednosti dobiju zadane. */
export function extrasFromJson(raw: unknown, nameOf: (id: string) => string | null): ExtraLift[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: any) => {
    const exerciseId = e?.exerciseId ?? null
    return {
      id: e?.id ?? uid(),
      exerciseId,
      exerciseName: exerciseId ? nameOf(exerciseId) : null,
      oneRm: e?.oneRm != null ? Number(e.oneRm) : null,
      reps: e?.reps != null ? Number(e.reps) : 3,
      startRpe: e?.startRpe != null ? Number(e.startRpe) : null,
      endRpe: e?.endRpe != null ? Number(e.endRpe) : null,
      backoffSets: e?.backoffSets != null ? Number(e.backoffSets) : 0,
      backoffPct: e?.backoffPct != null ? Number(e.backoffPct) : 92.5,
    }
  })
}

/** Natrag u jsonb — ime vježbe se ne sprema, izvodi se iz exerciseId. */
export const extrasToJson = (extras: ExtraLift[]) =>
  extras.map(e => ({
    id: e.id, exerciseId: e.exerciseId, oneRm: e.oneRm, reps: e.reps,
    startRpe: e.startRpe, endRpe: e.endRpe,
    backoffSets: e.backoffSets, backoffPct: e.backoffPct,
  }))

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
export function autoExtra1rm(primary1rm: number | null, exerciseName: string | null): number | null {
  const pct = pctForExercise(exerciseName)
  if (!primary1rm || !pct) return null
  return roundToPlate(primary1rm * pct / 100)
}

/** 1RM koji se stvarno koristi za dodatni lift: ručni ako postoji, inače izračunat. */
export const extra1rm = (plan: LiftPlan, e: ExtraLift): number | null =>
  e.oneRm ?? autoExtra1rm(plan.primary1rm, e.exerciseName)

/**
 * set_plan za jednu vježbu: prva serija je top set (ručna kilaža), a svaka
 * sljedeća je `pct` % prethodne. Bez dodatnih serija vraća samo top set.
 */
export function backoffRows(backoffSets: number, pct: number): SetPlanRow[] {
  const rows: SetPlanRow[] = [{ mode: 'manual', pct, ref: 1 }]
  for (let i = 1; i <= Math.max(0, backoffSets); i++) rows.push({ mode: 'backoff', pct, ref: i - 1 })
  return rows
}

/** Kilaže po tjednima — točno ono što se prikaže u tablici i upiše u blok. */
export function planWeeks(plan: LiftPlan): WeekRow[] {
  const oneRms = plan.extras.map(e => extra1rm(plan, e))
  const out: WeekRow[] = []

  for (let w = 1; w <= Math.max(0, plan.weeks); w++) {
    const override = plan.weekOverrides[String(w)]
    const hasOverride = typeof override === 'number' && override > 0

    const primaryKg = hasOverride
      ? roundToPlate(override)
      : plan.startKg != null && plan.endKg != null
        ? rampKg(plan.startKg, plan.endKg, w, plan.weeks)
        : null

    const extras = plan.extras.map((e, i) => {
      const rpe = e.startRpe != null && e.endRpe != null ? rampRpe(e.startRpe, e.endRpe, w, plan.weeks) : null
      const oneRm = oneRms[i]
      return { kg: oneRm != null && rpe != null ? weightFromRpe(oneRm, e.reps, rpe) : null, rpe }
    })

    out.push({ week: w, primaryKg, primaryManual: hasOverride, extras })
  }
  return out
}

/** Je li plan dovoljno popunjen da se smije upisati u blok. */
export function planReady(plan: LiftPlan): { ok: boolean; reason?: string } {
  if (!plan.weeks) return { ok: false, reason: 'Blok nema tjedana.' }
  if (plan.startKg == null || plan.endKg == null) return { ok: false, reason: 'Upiši kilažu na početku i na kraju bloka.' }

  for (const [i, e] of plan.extras.entries()) {
    if (!e.exerciseId) return { ok: false, reason: `${i + 1}. dodatni lift nema odabranu vježbu.` }
    if (extra1rm(plan, e) == null) {
      return { ok: false, reason: `${e.exerciseName ?? `${i + 1}. dodatni lift`}: nedostaje 1RM — upiši ga ili upiši natjecateljski 1RM.` }
    }
    if (e.startRpe == null || e.endRpe == null) {
      return { ok: false, reason: `${e.exerciseName ?? `${i + 1}. dodatni lift`}: upiši početni i završni RPE.` }
    }
  }
  return { ok: true }
}
