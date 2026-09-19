// Postotci sekundarnih (varijacijskih) liftova — jedini izvor istine.
// Preuzeto iz trenerske tablice: pct je postotak koji ona stvarno koristi,
// range je raspon naveden uz njega. SSB i Pin Squat namjerno koriste 87 %,
// iako im je raspon 87.5–90 % — tako računa i tablica.
// db = naziv vježbe u bazi, gdje se razlikuje od naziva u tablici.

export type LiftK = 'squat' | 'bench' | 'deadlift'

export type LiftVariation = { lift: LiftK; label: string; pct: number; range: string; db?: string }

/** Kategorija vježbe u bazi → glavni lift. Varijacije imaju sufiks " Variation". */
export const LIFT_OF_CATEGORY: Record<string, LiftK> = {
  'Squat': 'squat', 'Squat Variation': 'squat',
  'Bench': 'bench', 'Bench Variation': 'bench',
  'Deadlift': 'deadlift', 'Deadlift Variation': 'deadlift',
}

export const COMP_CATEGORIES = new Set(['Squat', 'Bench', 'Deadlift'])

export const LIFT_LABEL: Record<LiftK, string> = { squat: 'SQUAT', bench: 'BENCH', deadlift: 'DEADLIFT' }

/** Stupac u tablici lifters s natjecateljskim 1RM-om. */
export const LIFT_1RM_COLUMN: Record<LiftK, string> = {
  squat: 'current_squat_1rm', bench: 'current_bench_1rm', deadlift: 'current_deadlift_1rm',
}

export const VARIATIONS: LiftVariation[] = [
  { lift: 'squat', label: 'Paused Squat',   pct: 93,   range: '92–94',     db: 'Paused Squat' },
  { lift: 'squat', label: 'High Bar Squat', pct: 93,   range: '90–97.5',   db: 'HB Squat' },
  { lift: 'squat', label: 'Tempo Squat',    pct: 90,   range: '87.5–92.5', db: 'Tempo Squat' },
  { lift: 'squat', label: 'SSB Squat',      pct: 87,   range: '87.5–90',   db: 'SSB Squat' },
  { lift: 'squat', label: 'Pin Squat',      pct: 87,   range: '87.5–90',   db: 'Pin Squat' },
  { lift: 'squat', label: 'Front Squat',    pct: 83,   range: '80–87.5' },

  { lift: 'bench', label: 'Close Grip Bench Press', pct: 96,   range: '96–98',     db: 'Close Grip Bench' },
  { lift: 'bench', label: '3ct Bench Press',        pct: 95,   range: '92.5–97.5', db: 'Bench 3cnt' },
  { lift: 'bench', label: 'Tempo Bench Press',      pct: 93,   range: '90–97',     db: 'Tempo Bench' },
  { lift: 'bench', label: 'Spoto Press',            pct: 93,   range: '92.5–95',   db: 'Spoto Bench' },
  { lift: 'bench', label: 'T-Shirt Bench Press',    pct: 93,   range: '92.5–95' },
  { lift: 'bench', label: 'Larsen Bench Press',     pct: 92.5, range: '90–95' },

  { lift: 'deadlift', label: 'Trap Bar',                        pct: 107.5, range: '105–110' },
  { lift: 'deadlift', label: 'Block Pull',                      pct: 103,   range: '97.5–107.5', db: 'Block Deadlift' },
  { lift: 'deadlift', label: 'Paused Deadlift (ispod koljena)', pct: 93,    range: '92.5–95',    db: 'Paused Deadlift' },
  { lift: 'deadlift', label: 'Paused Deadlift (sa poda)',       pct: 92.5,  range: '90–95' },
  { lift: 'deadlift', label: 'Deficit Pull',                    pct: 92.5,  range: '90–95',      db: 'Deficit Deadlift' },
  { lift: 'deadlift', label: 'Romanian Deadlift',               pct: 80,    range: '75–85',      db: 'RDL' },
]

/** Postotak za vježbu iz baze; null ako za nju nema zadanog postotka. */
export function pctForExercise(name: string | null | undefined): number | null {
  if (!name) return null
  const n = name.trim().toLowerCase()
  const hit = VARIATIONS.find(v => (v.db ?? v.label).toLowerCase() === n) ?? VARIATIONS.find(v => v.label.toLowerCase() === n)
  return hit ? hit.pct : null
}
