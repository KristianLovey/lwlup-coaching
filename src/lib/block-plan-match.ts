/**
 * Odgovara li blok projekciji — provjera prije "UPIŠI U BLOK".
 *
 * Aplikacija nikad sama ne slaže strukturu bloka: ne dodaje vježbe, ne mijenja
 * broj serija ni backoff. Trener složi blok (serije, ★ na top setovima), a upis
 * samo popuni kilaže i ponavljanja označenih top setova. Zato upis smije krenuti
 * tek kad u svakom tjednu red vježbe ima točno onoliko serija i zvjezdica koliko
 * projekcija traži.
 *
 * Isti kod vrti planer (uživo, dok trener tipka) i ruta (prije pisanja), pa
 * ekran i server nikad ne kažu različito.
 */

export type BlockRow = {
  id: string
  exerciseId: string
  week: number
  workoutDate: string | null
  dayName: string | null
  order: number
  plannedSets: number
  /** set_number-i označeni zvjezdicom, uzlazno — samo unutar broja serija */
  topSets: number[]
  /** označeni set_number-i koje je lifter već odradio — njih upis ne dira */
  doneTopSets: number[]
  /** trenutna kilaža po set_number, za prikaz "u bloku" */
  weights: Record<number, number | null>
}

export type TopSetPlan = { kg: number | null; reps: number }

export type PlanEntry = {
  exerciseId: string
  /** ime vježbe za poruke */
  label: string
  /** ukupno serija koje projekcija očekuje (top setovi + backoff) */
  sets: number
  /** top setovi redoslijedom zvjezdica u bloku */
  tops: TopSetPlan[]
  /** sažetak reda (KG / REPS u zaglavlju vježbe): glavni top set */
  rowKg: number | null
  rowReps: number
  rpe: number | null
}

export type WeekEntries = { week: number; entries: PlanEntry[] }
export type Problem = { week: number; label: string; message: string }
export type Assignment = { week: number; entry: PlanEntry; row: BlockRow }

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

/**
 * Iz sirovog PostgREST reda u BlockRow. Očekuje:
 * workout_exercises(id, exercise_id, exercise_order, planned_sets,
 *   workouts(workout_date, day_name, weeks(week_number)),
 *   set_logs(set_number, is_top_set, completed, weight_kg))
 */
export function blockRowsFrom(raw: any[]): BlockRow[] {
  const out: BlockRow[] = []
  for (const r of raw ?? []) {
    const wo = one<any>(r.workouts)
    const wk = one<any>(wo?.weeks)
    if (!wk) continue
    const plannedSets = Math.max(0, Number(r.planned_sets) || 0)
    // zvjezdica na seriji koja više ne postoji (broj serija smanjen) se ne broji
    const logs = ((r.set_logs ?? []) as any[]).filter(l => Number(l.set_number) >= 1 && Number(l.set_number) <= plannedSets)
    const tops = logs.filter(l => l.is_top_set).map(l => Number(l.set_number)).sort((a, b) => a - b)
    const weights: Record<number, number | null> = {}
    for (const l of logs) weights[Number(l.set_number)] = l.weight_kg != null ? Number(l.weight_kg) : null
    out.push({
      id: r.id,
      exerciseId: r.exercise_id,
      week: Number(wk.week_number),
      workoutDate: wo?.workout_date ?? null,
      dayName: wo?.day_name ?? null,
      order: Number(r.exercise_order) || 0,
      plannedSets,
      topSets: tops,
      doneTopSets: logs.filter(l => l.is_top_set && l.completed).map(l => Number(l.set_number)),
      weights,
    })
  }
  return out
}

const topWord = (n: number) => (n === 1 ? 'top set' : n >= 2 && n <= 4 ? 'top seta' : 'top setova')
const setWord = (n: number) => (n === 1 ? 'serija' : n >= 2 && n <= 4 ? 'serije' : 'serija')

/**
 * Za svaki tjedan i svaku vježbu nađi red u bloku. Ako ista vježba dolazi više
 * puta u tjednu, prednost imaju redovi koji već imaju ★ (teški dan), pa onda po
 * datumu i redoslijedu — k-ti unos plana ide u k-ti takav red.
 */
export function matchPlan(weeks: WeekEntries[], rows: BlockRow[]): { problems: Problem[]; assignments: Assignment[] } {
  const problems: Problem[] = []
  const assignments: Assignment[] = []

  for (const wp of weeks) {
    const groups = new Map<string, PlanEntry[]>()
    for (const e of wp.entries) {
      const g = groups.get(e.exerciseId)
      if (g) g.push(e); else groups.set(e.exerciseId, [e])
    }

    for (const [exerciseId, group] of groups) {
      const candidates = rows
        .filter(r => r.week === wp.week && r.exerciseId === exerciseId)
        .sort((a, b) =>
          Number(b.topSets.length > 0) - Number(a.topSets.length > 0)
          || (a.workoutDate ?? '').localeCompare(b.workoutDate ?? '')
          || a.order - b.order)

      group.forEach((entry, k) => {
        const row = candidates[k]
        if (!row) {
          problems.push({
            week: wp.week, label: entry.label,
            message: k === 0 ? 'vježba nije u bloku' : `vježba je u bloku ${candidates.length}×, projekcija traži ${group.length}×`,
          })
          return
        }
        const msgs: string[] = []
        if (row.plannedSets !== entry.sets) {
          msgs.push(`${row.plannedSets} ${setWord(row.plannedSets)} u bloku, projekcija traži ${entry.sets}`)
        }
        if (row.topSets.length !== entry.tops.length) {
          msgs.push(`označen${row.topSets.length === 1 ? '' : 'o'} ${row.topSets.length} ${topWord(row.topSets.length)} (★), treba ${entry.tops.length}`)
        }
        if (msgs.length > 0) {
          problems.push({ week: wp.week, label: entry.label + (row.dayName ? ` · ${row.dayName}` : ''), message: msgs.join('; ') })
          return
        }
        assignments.push({ week: wp.week, entry, row })
      })
    }
  }

  problems.sort((a, b) => a.week - b.week)
  return { problems, assignments }
}
