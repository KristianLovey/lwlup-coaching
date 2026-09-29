/**
 * Slaganje redova vjezbi po danu za "UPIŠI U BLOK".
 *
 * Ista vjezba smije doci vise puta u istom tjednu — npr. top set ponavljanja i
 * fatigue single. Klijent salje unose vec u zeljenom redoslijedu, pa ovdje samo
 * pazimo da svaki unos dobije SVOJ red u bloku (prije su se oba stopila u prvi
 * pronadeni red) i da u danu stoje jedan do drugoga tim redoslijedom.
 *
 * exercise_order se dodjeljuje tek kad su sve grupe tog dana obradene, inace bi
 * se dvije grupe u istom danu (npr. primarni i sekundarni lift) sudarile oko
 * istog broja.
 */

export type SetPlanRow = { mode: 'manual' | 'backoff'; pct: number; ref: number }
export type ExercisePlan = {
  exerciseId: string; kg: number | null; reps: number
  sets: number; rpe: number | null; setPlan: SetPlanRow[]
}
export type WeekPlan = {
  week: number
  entries?: (ExercisePlan | null)[]
  /** stari oblik — podrzan dok se ne osvjeze otvorene sesije */
  primary?: ExercisePlan | null
  secondary?: ExercisePlan | null
}
export type WoRow = {
  id: string
  day_name: string | null
  workout_exercises: { id: string; exercise_id: string; exercise_order: number; planned_reps?: string | null }[]
}

export const entriesOf = (wp: WeekPlan): ExercisePlan[] =>
  (wp.entries ?? [wp.primary, wp.secondary]).filter((e): e is ExercisePlan => !!e)

export const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

export const fieldsOf = (p: ExercisePlan): Record<string, unknown> => ({
  planned_weight_kg: p.kg,
  planned_reps: String(p.reps),
  planned_sets: Math.max(1, p.sets),
  target_rpe: p.rpe,
  set_plan: { rows: p.setPlan },
})

/** Dan u kojem lift vec zivi — po njemu se slaze tjedan u kojem vjezba fali. */
export function refDayOf(weeks: WeekPlan[], byWeek: Map<number, WoRow[]>): Map<string, string> {
  const refDay = new Map<string, string>()
  for (const wp of weeks) {
    for (const p of entriesOf(wp)) {
      if (refDay.has(p.exerciseId)) continue
      for (const wo of byWeek.get(wp.week) ?? []) {
        if (wo.workout_exercises?.some(we => we.exercise_id === p.exerciseId)) {
          refDay.set(p.exerciseId, norm(wo.day_name))
          break
        }
      }
    }
  }
  return refDay
}

/** Radni model dirnutog treninga: redoslijed vjezbi kakav ce biti na kraju. */
type Item =
  | { kind: 'existing'; id: string; exerciseId: string; order: number; reps: string | null; fields?: Record<string, unknown> }
  | { kind: 'new'; exerciseId: string; fields: Record<string, unknown> }

export type Writes = {
  updates: { id: string; fields: Record<string, unknown> }[]
  inserts: Record<string, unknown>[]
  skipped: string[]
}

export function buildWrites(weeks: WeekPlan[], byWeek: Map<number, WoRow[]>): Writes {
  const refDay = refDayOf(weeks, byWeek)
  const skipped: string[] = []
  const layout = new Map<string, Item[]>()

  const layoutOf = (wo: WoRow): Item[] => {
    let items = layout.get(wo.id)
    if (!items) {
      items = [...(wo.workout_exercises ?? [])]
        .sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0))
        .map(r => ({
          kind: 'existing' as const, id: r.id, exerciseId: r.exercise_id,
          order: r.exercise_order ?? 0, reps: r.planned_reps ?? null,
        }))
      layout.set(wo.id, items)
    }
    return items
  }

  const planGroup = (weekNo: number, exerciseId: string, group: ExercisePlan[]) => {
    const workouts = byWeek.get(weekNo) ?? []
    if (workouts.length === 0) { skipped.push(`tjedan ${weekNo}: nema treninga`); return }

    // prvi trening u tjednu koji vec sadrzi tu vjezbu; ostala pojavljivanja
    // (npr. cetiri bencha tjedno) ostaju netaknuta, kao i dosad
    const host = workouts.find(wo => wo.workout_exercises?.some(we => we.exercise_id === exerciseId))
      ?? (() => {
        const day = refDay.get(exerciseId)
        return (day ? workouts.find(wo => norm(wo.day_name) === day) : null) ?? workouts[0]
      })()

    const items = layoutOf(host)
    const mine = items.filter(i => i.exerciseId === exerciseId)
    const claimed = new Set<Item>()
    const slot: (Item | null)[] = group.map(() => null)

    // Prvo uparivanje po ponavljanjima: red koji je vec planiran na 3 ponavljanja
    // ostaje top set i kad se ukljuci single ISPRED njega. Bez toga bi postojeci
    // red (s odradenim serijama) postao single, a top set bi zavrsio u novom redu.
    group.forEach((p, i) => {
      const hit = mine.find(m => !claimed.has(m) && m.kind === 'existing' && m.reps === String(p.reps))
      if (hit) { slot[i] = hit; claimed.add(hit) }
    })
    // ostatak se upari redom
    group.forEach((_, i) => {
      if (slot[i]) return
      const hit = mine.find(m => !claimed.has(m))
      if (hit) { slot[i] = hit; claimed.add(hit) }
    })

    const block: Item[] = group.map((p, i) => {
      const s = slot[i]
      if (s) { s.fields = fieldsOf(p); return s }
      return { kind: 'new' as const, exerciseId, fields: fieldsOf(p) }
    })

    // grupa ide kao cjelina na mjesto svog prvog reda, redoslijedom kako je stigla
    const anchor = mine.length > 0 ? items.indexOf(mine[0]) : items.length
    const head = items.slice(0, anchor).filter(i => !mine.includes(i))
    const tail = items.slice(anchor).filter(i => !mine.includes(i))
    items.length = 0
    items.push(...head, ...block, ...tail)
  }

  for (const wp of weeks) {
    const groups = new Map<string, ExercisePlan[]>()
    for (const p of entriesOf(wp)) {
      const g = groups.get(p.exerciseId)
      if (g) g.push(p); else groups.set(p.exerciseId, [p])
    }
    for (const [exerciseId, group] of groups) planGroup(wp.week, exerciseId, group)
  }

  const updates: Writes['updates'] = []
  const inserts: Writes['inserts'] = []
  for (const [workoutId, items] of layout) {
    items.forEach((it, idx) => {
      if (it.kind === 'new') {
        inserts.push({ workout_id: workoutId, exercise_id: it.exerciseId, exercise_order: idx, ...it.fields })
        return
      }
      const fields: Record<string, unknown> = { ...(it.fields ?? {}) }
      if (it.order !== idx) fields.exercise_order = idx
      if (Object.keys(fields).length > 0) updates.push({ id: it.id, fields })
    })
  }
  return { updates, inserts, skipped }
}
