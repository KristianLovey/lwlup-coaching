// src/app/training/types.ts
export type Exercise = { id: string; name: string; category: string; notes: string | null }
export type WorkoutExercise = {
  id: string; workout_id: string; exercise_id: string; exercise_order: number
  planned_sets: number; planned_reps: string | null; planned_weight_kg: number | null
  planned_rpe: number | null; planned_rest_seconds: number | null; planned_tempo: string | null
  target_rpe: number | null; coach_note: string | null
  actual_sets: number | null; actual_reps: string | null; actual_weight_kg: number | null
  actual_rpe: number | null; actual_note: string | null
  notes: string | null; completed: boolean; exercise?: Exercise
}
export type Workout = {
  id: string; week_id: string; athlete_id: string; day_name: string; workout_date: string
  completed: boolean; notes: string | null; overall_rpe: number | null; duration_minutes: number | null
  workout_exercises?: WorkoutExercise[]
}
export type Week = {
  id: string; block_id: string; week_number: number; start_date: string; end_date: string
  notes: string | null; workouts?: Workout[]
}
export type Block = {
  id: string; athlete_id: string; name: string; start_date: string; end_date: string
  goal: string | null; status: 'active' | 'completed' | 'planned'; notes: string | null; weeks?: Week[]
}
export type BlockSummary = { id: string; name: string; status: string; start_date: string; end_date: string }
export type CoachTip = { id: string; title: string; content: string; category: string; priority: number; created_at: string }
export type Competition = { id: string; name: string; date: string; location: string | null; status: string }
export type SetLog = { set_number: number; weight_kg: number | null; reps: string | null; rpe: number | null; completed: boolean }
export interface MeetAttempt {
  id: string;
  athlete_id: string;
  meet_date: string;
  lift: 'squat' | 'bench' | 'deadlift';
  competition_id?: string | null;
  
  warmup1_kg?: number | null;
  warmup2_kg?: number | null;
  warmup3_kg?: number | null;

  attempt1_min?: number | null;
  attempt1_max?: number | null;
  attempt1_actual?: number | null; // Missing in your current type
  attempt1_good?: boolean | null;   // Missing in your current type

  attempt2_min?: number | null;
  attempt2_max?: number | null;
  attempt2_actual?: number | null; // Missing in your current type
  attempt2_good?: boolean | null;   // Missing in your current type

  attempt3_min?: number | null;
  attempt3_max?: number | null;
  attempt3_actual?: number | null; // Missing in your current type
  attempt3_good?: boolean | null;   // Missing in your current type

  admin_notes?: string | null;
  lifter_notes?: string | null;     // Missing in your current type
  
  created_at?: string;
  updated_at?: string;
}