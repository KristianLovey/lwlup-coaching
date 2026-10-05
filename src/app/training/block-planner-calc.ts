import { roundToPlate, weightFromRpe } from './training-setplan'
import { pctForExercise } from './lift-variations'

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
 * Top setovi: svaki lift ima GLAVNI top set (gore opisan) i do tri dodatna — npr.
 * trojke pa fatigue single, ili dvije teške serije zaredom. Dodatni se planiraju
 * kao kilaža od početka do kraja bloka sa svojim ponavljanjima, a `before` kaže
 * ide li u bloku prije ili poslije glavnog.
 *
 * Backoff: prva backoff serija je postotak GLAVNOG top seta, svaka sljedeća
 * postotak prethodne (kaskadno). Ispod 100 % je pad, iznad 100 % skok.
 */

/** Najviše top setova po liftu, glavni uključen. */
export const MAX_TOPS = 4

/** Dodatni top set iste vježbe u istom danu. */
export type ExtraTop = {
  /** stabilan ključ liste (React) */
  id: string
  /** ponavljanja; 1 = single */
  reps: number
  startKg: number | null
  endKg: number | null
  /** true = u bloku ide prije glavnog top seta, false = poslije */
  before: boolean
}

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `x${Date.now()}${Math.random().toString(36).slice(2, 8)}`)

export const newTop = (): ExtraTop => ({ id: uid(), reps: 1, startKg: null, endKg: null, before: false })

const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

function topFromJson(t: any): ExtraTop {
  return {
    id: typeof t?.id === 'string' ? t.id : uid(),
    reps: t?.reps != null ? Math.max(1, Math.round(Number(t.reps)) || 1) : 1,
    startKg: numOrNull(t?.startKg),
    endKg: numOrNull(t?.endKg),
    before: !!t?.before,
  }
}

/**
 * Dodatni top setovi iz baze. Prihvaća sva tri oblika koja su ikad spremljena:
 * novi `{ tops: [...] }`, goli niz i stari jedan "drugi top set" `{ enabled, ... }`.
 */
export function topsFromJson(raw: unknown): ExtraTop[] {
  const r = raw as any
  let list: any[] = []
  if (Array.isArray(r)) list = r
  else if (r && typeof r === 'object') {
    if (Array.isArray(r.tops)) list = r.tops
    else if (r.enabled) list = [r]
  }
  return list.slice(0, MAX_TOPS - 1).map(topFromJson)
}

export const topsToJson = (tops: ExtraTop[]) =>
  tops.map(t => ({ id: t.id, reps: t.reps, startKg: t.startKg, endKg: t.endKg, before: t.before }))

/**
 * Redoslijed u bloku: dodatni "prije" (svojim redom), glavni, pa dodatni "poslije".
 * Vraća indekse: -1 je glavni, ostalo indeks u listi dodatnih.
 */
export const topOrder = (tops: ExtraTop[]): number[] => [
  ...tops.flatMap((t, i) => (t.before ? [i] : [])),
  -1,
  ...tops.flatMap((t, i) => (t.before ? [] : [i])),
]

/**
 * Pomakni dodatni top set za jedno mjesto u bloku. Prelazak preko glavnog samo
 * mijenja `before`; lista se uvijek vraća kao [prije…, poslije…] da redoslijed
 * liste i redoslijed u bloku ostanu isti.
 */
export function moveTop(tops: ExtraTop[], index: number, dir: -1 | 1): ExtraTop[] {
  const order = topOrder(tops)
  const pos = order.indexOf(index)
  const to = pos + dir
  if (pos < 0 || to < 0 || to >= order.length) return tops
  const next = [...order]
  ;[next[pos], next[to]] = [next[to], next[pos]]
  const mainAt = next.indexOf(-1)
  return next
    .map((idx, p) => (idx === -1 ? null : { ...tops[idx], before: p < mainAt }))
    .filter((t): t is ExtraTop => t != null)
}

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
  tops: ExtraTop[]
}

export type LiftPlan = {
  weeks: number
  primary1rm: number | null
  startKg: number | null
  endKg: number | null
  primaryReps: number
  primaryBackoffSets: number
  primaryBackoffPct: number
  primaryTops: ExtraTop[]
  extras: ExtraLift[]
  weekOverrides: Record<string, number>
}

export type WeekRow = {
  week: number
  primaryKg: number | null
  /** kilaža dolazi iz ručnog upisa, ne iz izračuna */
  primaryManual: boolean
  /** dodatni top setovi primarnog lifta, istim redoslijedom kao plan.primaryTops */
  primaryTopKgs: (number | null)[]
  /** po jedan unos za svaki dodatni lift, istim redoslijedom kao plan.extras */
  extras: { kg: number | null; rpe: number | null; topKgs: (number | null)[] }[]
}

export const newExtra = (): ExtraLift => ({
  id: uid(),
  exerciseId: null, exerciseName: null, oneRm: null,
  reps: 3, startRpe: null, endRpe: null,
  backoffSets: 0, backoffPct: 92.5,
  tops: [],
})

export const emptyPlan = (weeks: number): LiftPlan => ({
  weeks,
  primary1rm: null, startKg: null, endKg: null,
  primaryReps: 3, primaryBackoffSets: 0, primaryBackoffPct: 92.5,
  primaryTops: [],
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
      // stari zapis ima jedan `top2`
      tops: topsFromJson(e?.tops ?? e?.top2),
    }
  })
}

/** Natrag u jsonb — ime vježbe se ne sprema, izvodi se iz exerciseId. */
export const extrasToJson = (extras: ExtraLift[]) =>
  extras.map(e => ({
    id: e.id, exerciseId: e.exerciseId, oneRm: e.oneRm, reps: e.reps,
    startRpe: e.startRpe, endRpe: e.endRpe,
    backoffSets: e.backoffSets, backoffPct: e.backoffPct,
    tops: topsToJson(e.tops),
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

const topKg = (t: ExtraTop, week: number, weeks: number): number | null =>
  t.startKg != null && t.endKg != null ? rampKg(t.startKg, t.endKg, week, weeks) : null

/** 1RM varijacije iz natjecateljskog 1RM-a; null ako varijacija nema zadan postotak. */
export function autoExtra1rm(primary1rm: number | null, exerciseName: string | null): number | null {
  const pct = pctForExercise(exerciseName)
  if (!primary1rm || !pct) return null
  return roundToPlate(primary1rm * pct / 100)
}

/** 1RM koji se stvarno koristi za dodatni lift: ručni ako postoji, inače izračunat. */
export const extra1rm = (plan: LiftPlan, e: ExtraLift): number | null =>
  e.oneRm ?? autoExtra1rm(plan.primary1rm, e.exerciseName)

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
      const kg = oneRm != null && rpe != null ? weightFromRpe(oneRm, e.reps, rpe) : null
      return { kg, rpe, topKgs: e.tops.map(t => topKg(t, w, plan.weeks)) }
    })

    out.push({
      week: w, primaryKg, primaryManual: hasOverride,
      primaryTopKgs: plan.primaryTops.map(t => topKg(t, w, plan.weeks)),
      extras,
    })
  }
  return out
}

const topsReady = (tops: ExtraTop[], who: string): string | null =>
  tops.some(t => t.startKg == null || t.endKg == null)
    ? `${who}: upiši početak i kraj svakog dodatnog top seta.`
    : null

/** Je li plan dovoljno popunjen da se smije upisati u blok. */
export function planReady(plan: LiftPlan): { ok: boolean; reason?: string } {
  if (!plan.weeks) return { ok: false, reason: 'Blok nema tjedana.' }
  if (plan.startKg == null || plan.endKg == null) return { ok: false, reason: 'Upiši kilažu na početku i na kraju bloka.' }
  const primaryTops = topsReady(plan.primaryTops, 'Primarni lift')
  if (primaryTops) return { ok: false, reason: primaryTops }

  for (const [i, e] of plan.extras.entries()) {
    const who = e.exerciseName ?? `${i + 1}. dodatni lift`
    if (!e.exerciseId) return { ok: false, reason: `${i + 1}. dodatni lift nema odabranu vježbu.` }
    if (extra1rm(plan, e) == null) {
      return { ok: false, reason: `${who}: nedostaje 1RM — upiši ga ili upiši natjecateljski 1RM.` }
    }
    if (e.startRpe == null || e.endRpe == null) {
      return { ok: false, reason: `${who}: upiši početni i završni RPE.` }
    }
    const extraTops = topsReady(e.tops, who)
    if (extraTops) return { ok: false, reason: extraTops }
  }
  return { ok: true }
}
