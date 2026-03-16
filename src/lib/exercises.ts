// Types
export type ExerciseCategory =
  | 'Primary Squat'
  | 'Secondary Squat'
  | 'Primary Bench'
  | 'Secondary Bench'
  | 'Tertiary Bench'
  | 'Quaternary Bench'
  | 'Primary Deadlift'
  | 'Secondary Deadlift'
  | 'Chest 1 (Upper)'
  | 'Chest 2 (Mid)'
  | 'Delts 1 (Side)'
  | 'Delts 2 (Rear)'
  | 'Back 1 (Upper)'
  | 'Back 2 (Mid)'
  | 'Back 3 (Lower)'
  | 'Back 4 (Lats)'
  | 'Biceps 1 (Inner)'
  | 'Biceps 2 (Outer)'
  | 'Biceps 3 (Brachialis)'
  | 'Triceps 1 (Long)'
  | 'Triceps 2 (Lateral)'
  | 'Triceps 3 (Medial)'
  | 'Quads 1'
  | 'Quads 2'
  | 'Hamstring 1'
  | 'Hamstring 2'
  | 'Glute 1'
  | 'Glute 2'

export interface Exercise {
  name: string
  category: ExerciseCategory
  defaultReps?: number
  defaultSets?: number
  notes?: string
}

export interface SetEntry {
  id: string
  reps: number
  load: number | string // can be formula like "0.9*prev"
  rpe?: number
  resolvedLoad?: number
  tonnage?: number
  isTopSet?: boolean
}

export interface ExerciseBlock {
  id: string
  exercise: Exercise
  sets: SetEntry[]
  notes?: string
  videoUrl?: string
}

export interface DayPlan {
  id: string
  dayNumber: number
  date?: string
  blocks: ExerciseBlock[]
}

export interface WeekPlan {
  weekNumber: number
  days: DayPlan[]
}

// Exercise library from spreadsheet
export const EXERCISES: Exercise[] = [
  // Squat variants
  { name: 'Tempo Squat', category: 'Primary Squat', defaultSets: 3, defaultReps: 7 },
  { name: 'Competition Squat', category: 'Primary Squat', defaultSets: 3, defaultReps: 5 },
  { name: 'Paused Squat', category: 'Primary Squat', defaultSets: 3, defaultReps: 3 },
  { name: 'HB Squat', category: 'Secondary Squat', defaultSets: 4, defaultReps: 6 },
  { name: 'LB Squat', category: 'Secondary Squat', defaultSets: 3, defaultReps: 5 },
  { name: 'Box Squat', category: 'Secondary Squat', defaultSets: 3, defaultReps: 5 },
  { name: 'SSB Squat', category: 'Secondary Squat', defaultSets: 3, defaultReps: 8 },

  // Bench variants
  { name: 'Comp Bench', category: 'Primary Bench', defaultSets: 3, defaultReps: 4 },
  { name: 'Paused Bench', category: 'Primary Bench', defaultSets: 3, defaultReps: 5 },
  { name: 'Bench 3cnt', category: 'Secondary Bench', defaultSets: 3, defaultReps: 2 },
  { name: 'Bench 2cnt', category: 'Quaternary Bench', defaultSets: 1, defaultReps: 1 },
  { name: 'Bench Comp', category: 'Quaternary Bench', defaultSets: 3, defaultReps: 5 },
  { name: 'Close Grip Bench', category: 'Tertiary Bench', defaultSets: 3, defaultReps: 8 },
  { name: 'Slingshot Bench', category: 'Tertiary Bench', defaultSets: 3, defaultReps: 5 },
  { name: 'Incline Bench', category: 'Tertiary Bench', defaultSets: 3, defaultReps: 8 },

  // Deadlift variants
  { name: 'Paused Deadlift', category: 'Primary Deadlift', defaultSets: 4, defaultReps: 5 },
  { name: 'Conv Deadlift', category: 'Primary Deadlift', defaultSets: 3, defaultReps: 5 },
  { name: 'Sumo Deadlift', category: 'Secondary Deadlift', defaultSets: 3, defaultReps: 5 },
  { name: 'RDL', category: 'Secondary Deadlift', defaultSets: 3, defaultReps: 8 },
  { name: 'Deficit Deadlift', category: 'Secondary Deadlift', defaultSets: 3, defaultReps: 5 },

  // Chest accessories
  { name: 'Incline Press', category: 'Chest 1 (Upper)', defaultSets: 3, defaultReps: 8 },
  { name: 'Incline Dumbbell Press', category: 'Chest 1 (Upper)', defaultSets: 3, defaultReps: 10 },
  { name: 'Chest Press', category: 'Chest 2 (Mid)', defaultSets: 3, defaultReps: 12 },
  { name: 'Pec Dec', category: 'Chest 2 (Mid)', defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Fly', category: 'Chest 2 (Mid)', defaultSets: 3, defaultReps: 12 },

  // Delts
  { name: 'Cable Fly (Side)', category: 'Delts 1 (Side)', defaultSets: 3, defaultReps: 8 },
  { name: 'Lateral Raise', category: 'Delts 1 (Side)', defaultSets: 3, defaultReps: 12 },
  { name: 'DB Lateral Raise', category: 'Delts 1 (Side)', defaultSets: 3, defaultReps: 15 },
  { name: 'Reverse Fly', category: 'Delts 2 (Rear)', defaultSets: 3, defaultReps: 8 },
  { name: 'Face Pull', category: 'Delts 2 (Rear)', defaultSets: 3, defaultReps: 15 },
  { name: 'Band Pull Apart', category: 'Delts 2 (Rear)', defaultSets: 3, defaultReps: 20 },

  // Back
  { name: 'Chest Supp Row', category: 'Back 2 (Mid)', defaultSets: 3, defaultReps: 12 },
  { name: 'DB Row', category: 'Back 2 (Mid)', defaultSets: 3, defaultReps: 10 },
  { name: 'Barbell Row', category: 'Back 2 (Mid)', defaultSets: 3, defaultReps: 8 },
  { name: 'Lat Pulldown', category: 'Back 4 (Lats)', defaultSets: 3, defaultReps: 8 },
  { name: 'Pull Up', category: 'Back 4 (Lats)', defaultSets: 3, defaultReps: 8 },
  { name: 'Seated Cable Row', category: 'Back 1 (Upper)', defaultSets: 3, defaultReps: 12 },
  { name: 'T-Bar Row', category: 'Back 3 (Lower)', defaultSets: 3, defaultReps: 10 },
  { name: 'Hyperextension', category: 'Back 3 (Lower)', defaultSets: 3, defaultReps: 12 },

  // Biceps
  { name: 'Biceps Curl', category: 'Biceps 1 (Inner)', defaultSets: 3, defaultReps: 8 },
  { name: 'Hammer Curl', category: 'Biceps 1 (Inner)', defaultSets: 3, defaultReps: 10 },
  { name: 'Incline Curl', category: 'Biceps 2 (Outer)', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Curl', category: 'Biceps 2 (Outer)', defaultSets: 3, defaultReps: 15 },
  { name: 'Preacher Curl', category: 'Biceps 3 (Brachialis)', defaultSets: 3, defaultReps: 10 },

  // Triceps
  { name: 'Skull Crusher', category: 'Triceps 1 (Long)', defaultSets: 3, defaultReps: 8 },
  { name: 'Overhead Extension', category: 'Triceps 1 (Long)', defaultSets: 3, defaultReps: 10 },
  { name: 'Dip', category: 'Triceps 2 (Lateral)', defaultSets: 3, defaultReps: 12 },
  { name: 'Pushdown', category: 'Triceps 2 (Lateral)', defaultSets: 3, defaultReps: 15 },
  { name: 'Reverse Pushdown', category: 'Triceps 3 (Medial)', defaultSets: 3, defaultReps: 15 },
  { name: 'Diamond Push Up', category: 'Triceps 3 (Medial)', defaultSets: 3, defaultReps: 12 },

  // Quads
  { name: 'Quad Extension', category: 'Quads 1', defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Extension', category: 'Quads 1', defaultSets: 3, defaultReps: 15 },
  { name: 'Leg Press', category: 'Quads 2', defaultSets: 3, defaultReps: 8 },
  { name: 'Hack Squat', category: 'Quads 2', defaultSets: 3, defaultReps: 10 },
  { name: 'Bulgarian Split Squat', category: 'Quads 2', defaultSets: 3, defaultReps: 8 },

  // Hamstrings
  { name: 'Hyper Back Ext', category: 'Hamstring 1', defaultSets: 3, defaultReps: 8 },
  { name: 'Nordic Curl', category: 'Hamstring 1', defaultSets: 3, defaultReps: 6 },
  { name: 'Leg Curl', category: 'Hamstring 2', defaultSets: 3, defaultReps: 12 },
  { name: 'Seated Leg Curl', category: 'Hamstring 2', defaultSets: 3, defaultReps: 12 },

  // Glutes
  { name: 'Hip Thrust', category: 'Glute 1', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Kickback', category: 'Glute 1', defaultSets: 3, defaultReps: 15 },
  { name: 'Sumo RDL', category: 'Glute 2', defaultSets: 3, defaultReps: 10 },
  { name: 'Abduction Machine', category: 'Glute 2', defaultSets: 3, defaultReps: 15 },
]

export const CATEGORY_GROUPS = {
  'SQUAT': ['Primary Squat', 'Secondary Squat'],
  'BENCH': ['Primary Bench', 'Secondary Bench', 'Tertiary Bench', 'Quaternary Bench'],
  'DEADLIFT': ['Primary Deadlift', 'Secondary Deadlift'],
  'CHEST': ['Chest 1 (Upper)', 'Chest 2 (Mid)'],
  'SHOULDERS': ['Delts 1 (Side)', 'Delts 2 (Rear)'],
  'BACK': ['Back 1 (Upper)', 'Back 2 (Mid)', 'Back 3 (Lower)', 'Back 4 (Lats)'],
  'BICEPS': ['Biceps 1 (Inner)', 'Biceps 2 (Outer)', 'Biceps 3 (Brachialis)'],
  'TRICEPS': ['Triceps 1 (Long)', 'Triceps 2 (Lateral)', 'Triceps 3 (Medial)'],
  'QUADS': ['Quads 1', 'Quads 2'],
  'HAMSTRINGS': ['Hamstring 1', 'Hamstring 2'],
  'GLUTES': ['Glute 1', 'Glute 2'],
}

// Formula resolver: supports expressions like "0.9*prev", "90%prev", number
export function resolveLoad(input: string | number, prevLoad?: number): number {
  if (typeof input === 'number') return input
  const str = input.toString().trim()

  // Pure number
  if (!isNaN(Number(str))) return Number(str)

  // Percentage: "90%prev" or "90% prev"
  const pctMatch = str.match(/^(\d+(?:\.\d+)?)\s*%/)
  if (pctMatch && prevLoad !== undefined) {
    return Math.round((Number(pctMatch[1]) / 100) * prevLoad * 2) / 2 // round to 0.5
  }

  // Decimal multiplier: "0.9*prev" or "0.9 prev"
  const multMatch = str.match(/^(\d+(?:\.\d+)?)\s*\*?\s*prev/i)
  if (multMatch && prevLoad !== undefined) {
    return Math.round(Number(multMatch[1]) * prevLoad * 2) / 2
  }

  // Subtraction: "prev-10" or "prev -10"
  const subMatch = str.match(/^prev\s*-\s*(\d+(?:\.\d+)?)/i)
  if (subMatch && prevLoad !== undefined) {
    return prevLoad - Number(subMatch[1])
  }

  // Addition: "prev+5"
  const addMatch = str.match(/^prev\s*\+\s*(\d+(?:\.\d+)?)/i)
  if (addMatch && prevLoad !== undefined) {
    return prevLoad + Number(addMatch[1])
  }

  return 0
}

export function calcEstimated1RM(load: number, reps: number): number {
  if (reps === 1) return load
  return Math.round(load * (1 + reps / 30))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}
