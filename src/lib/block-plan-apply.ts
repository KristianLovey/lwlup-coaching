/**
 * Upis projekcije u blok — projekcija ima prednost.
 *
 * Što planer kaže, to blok postane: za svaki tjedan i svaku vježbu red dobije
 * točno onoliko serija koliko ima top setova + backoffa, top setovi su prve
 * serije i označeni su zvjezdicom (★), a backoff kreće od top seta koji je
 * trener odabrao (zadano glavnog).
 * Ako vježba u tjednu fali, dodaje se u isti dan u kojem stoji u ostalim
 * tjednima (inače u prvi slobodni trening tog tjedna).
 *
 * Jedino što se NE dira: trening koji je već započet (odrađen trening ili ijedna
 * odrađena serija u toj vježbi). Tu je ono što je lifter digao važnije od plana.
 *
 * Isti kod vrti planer (pregled promjena uživo) i ruta (stvarni upis), pa ekran
 * i server nikad ne kažu različito. Bez ovisnosti o Reactu ili Supabaseu — radi
 * i u pregledniku i na serveru.
 */

// ── oblik bloka ───────────────────────────────────────────────────

export type BlockRow = {
  id: string
  exerciseId: string
  week: number
  workoutId: string
  workoutDate: string | null
  dayName: string | null
  order: number
  plannedSets: number
  /** set_number-i označeni zvjezdicom, uzlazno — samo unutar broja serija */
  topSets: number[]
  /** odrađen trening ili ijedna odrađena serija — takav red se ne dira */
  started: boolean
  /** trenutna kilaža po set_number, za prikaz "u bloku" */
  weights: Record<number, number | null>
}

export type WorkoutSlot = {
  id: string
  week: number
  dayName: string | null
  date: string | null
  completed: boolean
  maxOrder: number
  exerciseIds: string[]
}

export type BlockShape = { rows: BlockRow[]; slots: WorkoutSlot[] }

/**
 * Jedan upit za cijeli oblik bloka, polazeći od treninga. Filtriraj ga s
 * `.eq('weeks.block_id', blockId)` — pripadnost bloku ide isključivo relacijom
 * workout → week → block, nikad po datumima.
 */
export const BLOCK_SHAPE_SELECT =
  'id, day_name, workout_date, completed, weeks!inner(week_number, block_id), '
  + 'workout_exercises(id, exercise_id, exercise_order, planned_sets, set_logs(set_number, is_top_set, completed, weight_kg))'

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export function blockShapeFrom(rawWorkouts: any[]): BlockShape {
  const rows: BlockRow[] = []
  const slots: WorkoutSlot[] = []

  for (const wo of rawWorkouts ?? []) {
    const wk = one<any>(wo.weeks)
    if (!wk) continue
    const week = Number(wk.week_number)
    const woDone = !!wo.completed
    const exs = (wo.workout_exercises ?? []) as any[]

    slots.push({
      id: wo.id, week, dayName: wo.day_name ?? null, date: wo.workout_date ?? null, completed: woDone,
      maxOrder: exs.reduce((m, e) => Math.max(m, Number(e.exercise_order) || 0), 0),
      exerciseIds: exs.map(e => e.exercise_id),
    })

    for (const r of exs) {
      const plannedSets = Math.max(0, Number(r.planned_sets) || 0)
      const all = (r.set_logs ?? []) as any[]
      // zvjezdica na seriji koja više ne postoji (broj serija smanjen) se ne broji
      const logs = all.filter(l => Number(l.set_number) >= 1 && Number(l.set_number) <= plannedSets)
      const weights: Record<number, number | null> = {}
      for (const l of logs) weights[Number(l.set_number)] = l.weight_kg != null ? Number(l.weight_kg) : null
      rows.push({
        id: r.id,
        exerciseId: r.exercise_id,
        week,
        workoutId: wo.id,
        workoutDate: wo.workout_date ?? null,
        dayName: wo.day_name ?? null,
        order: Number(r.exercise_order) || 0,
        plannedSets,
        topSets: logs.filter(l => l.is_top_set).map(l => Number(l.set_number)).sort((a, b) => a - b),
        started: woDone || all.some(l => l.completed),
        weights,
      })
    }
  }
  return { rows, slots }
}

// ── plan ──────────────────────────────────────────────────────────

export type TopSetPlan = { kg: number | null; reps: number }

export type PlanEntry = {
  exerciseId: string
  /** ime vježbe za poruke */
  label: string
  /** top setovi redoslijedom u bloku (serije 1..n) */
  tops: TopSetPlan[]
  /** koji je od njih glavni: on je sažetak reda (KG / REPS u zaglavlju vježbe) */
  mainIndex: number
  /** od kojeg top seta kreće prvi backoff (indeks u tops); backoff ponavlja i njegova ponavljanja */
  backoffFrom: number
  backoffSets: number
  /** postotak prethodne serije; iznad 100 = skok */
  backoffPct: number
  rpe: number | null
}

export type WeekEntries = { week: number; entries: PlanEntry[] }

export type Target =
  | { kind: 'update'; week: number; entry: PlanEntry; row: BlockRow; change: string | null }
  | { kind: 'insert'; week: number; entry: PlanEntry; slot: WorkoutSlot; order: number }

export type Skip = { week: number; label: string; reason: string }

export type ApplyPlan = { targets: Target[]; skips: Skip[] }

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const setWord = (n: number) => (n === 1 ? 'serija' : n >= 2 && n <= 4 ? 'serije' : 'serija')
const dayLabel = (s: { dayName: string | null }) => (s.dayName?.trim() ? s.dayName.trim() : 'trening')

/** Što će se promijeniti u strukturi reda; null kad se mijenjaju samo kilaže. */
function describeChange(row: BlockRow, entry: PlanEntry): string | null {
  const sets = entry.tops.length + Math.max(0, entry.backoffSets)
  const wantTops = entry.tops.map((_, i) => i + 1)
  const parts: string[] = []
  if (row.plannedSets !== sets) parts.push(`${row.plannedSets} → ${sets} ${setWord(sets)}`)
  if (row.topSets.length !== wantTops.length) parts.push(`★ ${row.topSets.length} → ${wantTops.length}`)
  else if (row.topSets.some((n, i) => n !== wantTops[i])) parts.push('★ na prve serije')
  return parts.length ? parts.join(' · ') : null
}

/**
 * Za svaki tjedan i vježbu odluči: koji red se prepisuje, gdje se dodaje nova
 * vježba ili zašto se preskače. Ako ista vježba dolazi više puta u tjednu,
 * prednost imaju redovi koji već imaju ★ (teški dan), pa po datumu i redoslijedu.
 */
export function planApply(weeks: WeekEntries[], shape: BlockShape): ApplyPlan {
  const targets: Target[] = []
  const skips: Skip[] = []
  const nextOrder = new Map<string, number>()
  const taken = new Map<string, Set<string>>() // slot → vježbe koje će u njemu biti

  // dan u kojem vježba inače stoji (najčešći naziv dana u ostatku bloka)
  const usualDay = (exerciseId: string): string => {
    const count = new Map<string, number>()
    for (const r of shape.rows) {
      if (r.exerciseId !== exerciseId) continue
      const d = norm(r.dayName)
      if (d) count.set(d, (count.get(d) ?? 0) + 1)
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  }

  for (const wp of weeks) {
    const groups = new Map<string, PlanEntry[]>()
    for (const e of wp.entries) {
      const g = groups.get(e.exerciseId)
      if (g) g.push(e); else groups.set(e.exerciseId, [e])
    }

    for (const [exerciseId, group] of groups) {
      const candidates = shape.rows
        .filter(r => r.week === wp.week && r.exerciseId === exerciseId)
        .sort((a, b) =>
          Number(b.topSets.length > 0) - Number(a.topSets.length > 0)
          || (a.workoutDate ?? '').localeCompare(b.workoutDate ?? '')
          || a.order - b.order)

      group.forEach((entry, k) => {
        const row = candidates[k]
        if (row) {
          if (row.started) {
            skips.push({ week: wp.week, label: `${entry.label} · ${dayLabel(row)}`, reason: 'trening je već započet' })
          } else {
            targets.push({ kind: 'update', week: wp.week, entry, row, change: describeChange(row, entry) })
          }
          return
        }

        // vježbe nema (dovoljno puta) u tjednu → dodaj je
        const day = usualDay(exerciseId)
        const free = shape.slots
          .filter(s => s.week === wp.week && !s.completed)
          .filter(s => !s.exerciseIds.includes(exerciseId) && !(taken.get(s.id)?.has(exerciseId)))
          .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        const slot = (day && free.find(s => norm(s.dayName) === day)) || free[0]
        if (!slot) {
          skips.push({ week: wp.week, label: entry.label, reason: 'tjedan nema slobodnog treninga za ovu vježbu' })
          return
        }
        const order = (nextOrder.get(slot.id) ?? slot.maxOrder) + 1
        nextOrder.set(slot.id, order)
        if (!taken.has(slot.id)) taken.set(slot.id, new Set())
        taken.get(slot.id)!.add(exerciseId)
        targets.push({ kind: 'insert', week: wp.week, entry, slot, order })
      })
    }
  }

  targets.sort((a, b) => a.week - b.week)
  skips.sort((a, b) => a.week - b.week)
  return { targets, skips }
}

/** Kratki opis promjene za popis u planeru. */
export function targetSummary(t: Target): string | null {
  if (t.kind === 'insert') return `dodaje se u ${dayLabel(t.slot)}${t.slot.date ? ` (${t.slot.date.slice(8, 10)}.${t.slot.date.slice(5, 7)}.)` : ''}`
  return t.change
}

// ── upis jednog reda ──────────────────────────────────────────────

export type SetPlanRow = { mode: 'manual' | 'backoff'; pct: number; ref: number }

export type RowWrite = {
  fields: {
    planned_sets: number
    planned_reps: string
    planned_weight_kg: number | null
    set_plan: { rows: SetPlanRow[] }
    target_rpe?: number
  }
  /** svaka serija reda, 1..planned_sets */
  logs: { set_number: number; weight_kg: number | null; reps: string; is_top_set: boolean }[]
}

const plate = (kg: number) => Math.round(kg / 2.5) * 2.5

/**
 * Točan sadržaj reda prema projekciji: top setovi su prve serije (★), a backoff
 * je kaskada — prva backoff serija je postotak odabranog top seta, svaka
 * sljedeća postotak prethodne. Isto pravilo zapisano je i u set_plan, pa trening-ekran
 * backoff računa jednako ako trener kasnije promijeni kilažu top seta.
 */
export function rowWrite(entry: PlanEntry): RowWrite {
  const main = entry.tops[entry.mainIndex] ?? entry.tops[0]
  const fromIdx = entry.tops[entry.backoffFrom] ? entry.backoffFrom : entry.mainIndex
  const base = entry.tops[fromIdx] ?? main
  const backoffs = Math.max(0, Math.round(entry.backoffSets))
  const planRows: SetPlanRow[] = []
  const logs: RowWrite['logs'] = []

  entry.tops.forEach((t, i) => {
    planRows.push({ mode: 'manual', pct: entry.backoffPct, ref: i > 0 ? i - 1 : 1 })
    logs.push({ set_number: i + 1, weight_kg: t.kg, reps: String(t.reps), is_top_set: true })
  })

  let prevKg = base?.kg ?? null
  for (let b = 0; b < backoffs; b++) {
    const idx = entry.tops.length + b
    planRows.push({ mode: 'backoff', pct: entry.backoffPct, ref: b === 0 ? fromIdx : idx - 1 })
    const kg = prevKg != null ? plate(prevKg * entry.backoffPct / 100) : null
    logs.push({ set_number: idx + 1, weight_kg: kg, reps: String(base?.reps ?? ''), is_top_set: false })
    prevKg = kg
  }

  return {
    fields: {
      planned_sets: logs.length,
      planned_reps: String(main?.reps ?? ''),
      planned_weight_kg: main?.kg ?? null,
      set_plan: { rows: planRows },
      ...(entry.rpe != null ? { target_rpe: entry.rpe } : {}),
    },
    logs,
  }
}
