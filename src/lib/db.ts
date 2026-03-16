import { supabase } from './supabase'
import { WeekPlan } from './exercises'

// ─── PROFILES ────────────────────────────────────────────────────────────────

export async function getProfile(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  console.log('getProfile result:', { data, error, uid })  // ← dodaj ovo
  return { data, error }
}

export async function getAllLifters() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'lifter')
    .order('full_name')
  return { data: data ?? [], error }
}

// ─── TRAINING BLOCKS ─────────────────────────────────────────────────────────

export async function getActiveBlock(userId: string) {
  const { data, error } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data, error }
}

export async function createBlock(userId: string, name = 'Blok 1') {
  const initialData: WeekPlan[] = [
    {
      weekNumber: 1,
      days: [
        { id: crypto.randomUUID(), dayNumber: 1, date: '', blocks: [] },
        { id: crypto.randomUUID(), dayNumber: 2, date: '', blocks: [] },
        { id: crypto.randomUUID(), dayNumber: 3, date: '', blocks: [] },
        { id: crypto.randomUUID(), dayNumber: 4, date: '', blocks: [] },
      ],
    },
  ]

  const { data, error } = await supabase
    .from('training_blocks')
    .insert({ user_id: userId, name, data: initialData })
    .select()
    .single()

  return { data, error }
}

export async function updateBlock(blockId: string, weeks: WeekPlan[]) {
  const { data, error } = await supabase
    .from('training_blocks')
    .update({ data: weeks, updated_at: new Date().toISOString() })
    .eq('id', blockId)
    .select()
    .single()

  return { data, error }
}

// ─── ADMIN: CREATE LIFTER ─────────────────────────────────────────────────────
// Poziva Next.js API route jer Supabase Admin SDK ne smije biti na klientu

export async function createLifterViaApi(email: string, fullName: string) {
  const res = await fetch('/api/admin/create-lifter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName }),
  })

  const json = await res.json()
  if (!res.ok) return { data: null, error: { message: json.error || 'Greška' } }
  return { data: json, error: null }
}

// ─── EXERCISES ───────────────────────────────────────────────────────────────

export async function getExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('category')
    .order('name')
  return { data: data ?? [], error }
}

export async function createExercise(exercise: {
  name: string
  category: string
  default_sets: number
  default_reps: number
  notes?: string
}) {
  const { data, error } = await supabase
    .from('exercises')
    .insert(exercise)
    .select()
    .single()
  return { data, error }
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  return { error }
}

export const db = {
  getProfile,
  getAllLifters,
  getActiveBlock,
  createBlock,
  updateBlock,
  createLifterViaApi,
  getExercises,
  createExercise,
  deleteExercise,
}
