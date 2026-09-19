'use client'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estimate1RM, roundToPlate, weightFromRpe } from './training-setplan'
import { COMP_CATEGORIES, LIFT_OF_CATEGORY, pctForExercise, type LiftK } from './lift-variations'

/**
 * Prijedlog kilaže (sivi tekst) za svaku top seriju u bloku.
 *
 * Trener upiše kilaže za 1. tjedan i projekciju za kraj bloka (točan broj ili raspon):
 *   • glavni lift  → linearni put od kilaže 1. tjedna do projekcije, po tjednima
 *   • varijacija   → comp kilaža tog tjedna se pretvori u procijenjeni 1RM,
 *                    pomnoži postotkom varijacije i kroz RPE tablicu da kilažu
 *                    za točan broj ponavljanja te serije
 *
 * Prijedlog ide samo u seriju označenu zvjezdicom (top set). Ostale serije već
 * računa backoff (postotak ranije serije). Ako serija nema ciljani RPE, računa
 * se @8. Sve zaokruženo na 2.5 kg.
 */

const DEFAULT_RPE = 8

type Target = { min: number; max: number | null }
type Anchor = { week: number; kg: number; reps: number; rpe: number }
type Data = { firstWeek: number; lastWeek: number; targets: Partial<Record<LiftK, Target>>; anchors: Partial<Record<LiftK, Anchor>> }

type Ctx = { data: Data | null }
const SuggestionCtx = createContext<Ctx>({ data: null })

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }

/** Linearno od sidra (1. tjedan) do cilja u zadnjem tjednu, zaokruženo na 2.5 kg. */
function rampTo(anchor: Anchor, target: number, week: number, lastWeek: number): number {
  if (week <= anchor.week || lastWeek <= anchor.week) return roundToPlate(anchor.kg)
  if (week >= lastWeek) return roundToPlate(target)
  const span = lastWeek - anchor.week
  return roundToPlate(anchor.kg + (target - anchor.kg) * (week - anchor.week) / span)
}

async function loadBlock(athleteId: string, blockId: string): Promise<Data | null> {
  const supabase = createClient()
  const [projRes, weeksRes] = await Promise.all([
    supabase.from('block_projections').select('lift, target_min, target_max').eq('block_id', blockId),
    supabase.from('weeks').select('id, week_number').eq('block_id', blockId).order('week_number'),
  ])
  const weeks = (weeksRes.data ?? []) as { id: string; week_number: number }[]
  if (projRes.error || weeksRes.error || weeks.length === 0) return null

  const targets: Partial<Record<LiftK, Target>> = {}
  for (const p of (projRes.data ?? []) as any[]) {
    targets[p.lift as LiftK] = { min: Number(p.target_min), max: p.target_max != null ? Number(p.target_max) : null }
  }
  if (Object.keys(targets).length === 0) return null

  const firstWeek = weeks[0].week_number
  const lastWeek = weeks[weeks.length - 1].week_number

  // Sidro = comp serije iz prvog tjedna (ono što je trener upisao)
  const { data: wes } = await supabase.from('workout_exercises')
    .select('id, planned_reps, planned_rpe, target_rpe, planned_weight_kg, exercises(name, category), workouts!inner(week_id, athlete_id)')
    .eq('workouts.athlete_id', athleteId)
    .eq('workouts.week_id', weeks[0].id)

  const compWes = new Map<string, { lift: LiftK; reps: number; rpe: number; planned: number | null }>()
  for (const r of (wes ?? []) as any[]) {
    const ex = one<any>(r.exercises)
    if (!ex || !COMP_CATEGORIES.has(ex.category)) continue
    const lift = LIFT_OF_CATEGORY[ex.category]
    compWes.set(r.id, {
      lift,
      reps: Math.max(1, Math.round(parseFloat(String(r.planned_reps ?? '')) || 1)),
      rpe: num(r.target_rpe) ?? num(r.planned_rpe) ?? DEFAULT_RPE,
      planned: num(r.planned_weight_kg),
    })
  }

  const anchors: Partial<Record<LiftK, Anchor>> = {}
  if (compWes.size > 0) {
    const { data: sets } = await supabase.from('set_logs')
      .select('workout_exercise_id, weight_kg, reps, rpe, is_top_set')
      .in('workout_exercise_id', [...compWes.keys()])
      .limit(500)
    for (const s of (sets ?? []) as any[]) {
      const m = compWes.get(s.workout_exercise_id)
      const kg = num(s.weight_kg)
      if (!m || !kg) continue
      const cur = anchors[m.lift]
      // top set pobjeđuje; inače najteža serija prvog tjedna
      const better = !cur || (s.is_top_set && cur.kg <= kg) || kg > cur.kg
      if (better) {
        anchors[m.lift] = {
          week: firstWeek, kg,
          reps: Math.max(1, Math.round(parseFloat(String(s.reps ?? '')) || m.reps)),
          rpe: num(s.rpe) ?? m.rpe,
        }
      }
    }
    // bez upisanih serija: uzmi planiranu kilažu vježbe
    for (const m of compWes.values()) {
      if (!anchors[m.lift] && m.planned) anchors[m.lift] = { week: firstWeek, kg: m.planned, reps: m.reps, rpe: m.rpe }
    }
  }

  return { firstWeek, lastWeek, targets, anchors }
}

export function BlockSuggestionsProvider({ athleteId, blockId, children }: {
  athleteId: string; blockId: string | null | undefined; children: ReactNode
}) {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => {
    let alive = true
    setData(null)
    if (!athleteId || !blockId) return
    loadBlock(athleteId, blockId).then(d => { if (alive) setData(d) }).catch(() => { /* prijedlozi su opcionalni */ })
    return () => { alive = false }
  }, [athleteId, blockId])
  const value = useMemo(() => ({ data }), [data])
  return <SuggestionCtx.Provider value={value}>{children}</SuggestionCtx.Provider>
}

/** Argumenti za prijedlog jedne serije. */
export type SuggestArgs = {
  category?: string | null; exerciseName?: string | null
  weekNumber?: number | null; reps?: string | number | null; rpe?: number | null; isTopSet?: boolean
}

/**
 * Vraća funkciju koja za jednu seriju daje tekst prijedloga ("175" ili "175–180"),
 * ili null kad se ne može izračunati: nema projekcije, nema kilaže iz 1. tjedna,
 * serija nije top set, ili vježba nema zadani postotak.
 *
 * Namjerno funkcija, a ne hook: tablica serija je poziva unutar petlje po serijama.
 */
export function useSuggestFn(): (args: SuggestArgs) => string | null {
  const { data } = useContext(SuggestionCtx)

  return useMemo(() => (args: SuggestArgs) => {
    const { category, exerciseName, weekNumber, reps, rpe, isTopSet } = args
    if (!data || !isTopSet || !category || !weekNumber) return null
    const lift = LIFT_OF_CATEGORY[category]
    if (!lift) return null
    const target = data.targets[lift]
    const anchor = data.anchors[lift]
    if (!target || !anchor) return null

    const isComp = COMP_CATEGORIES.has(category)
    const repsN = Math.max(1, Math.round(parseFloat(String(reps ?? '')) || 0)) || null
    const rpeN = num(rpe) ?? DEFAULT_RPE

    const forTarget = (t: number): number | null => {
      const compKg = rampTo(anchor, t, weekNumber, data.lastWeek)
      if (isComp) return compKg
      // varijacija: comp kilaža tjedna → procijenjeni 1RM → postotak varijacije → RPE tablica
      const pct = pctForExercise(exerciseName)
      if (!pct || !repsN) return null
      const compE1 = estimate1RM(compKg, anchor.reps, anchor.rpe)
      if (!compE1) return null
      return weightFromRpe(roundToPlate(compE1 * pct / 100), repsN, rpeN)
    }

    const lo = forTarget(target.min)
    const hi = target.max != null ? forTarget(target.max) : null
    if (lo == null) return null
    return hi != null && hi !== lo ? `${lo}–${hi}` : String(lo)
  }, [data])
}
