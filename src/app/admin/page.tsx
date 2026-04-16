'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, ChevronDown, Check, Search,
  Loader2, Settings,
  FolderOpen, Copy, Bell,
  AlertCircle, ChevronLeft, Eye, Trophy, Send
} from 'lucide-react'
import { CompetitionsManager } from './competitions-manager'
import { AppNav, WeekPanel, EditableField } from '../training/training-components'
import type { Block, Week, Workout, WorkoutExercise, Exercise, BlockSummary } from '../training/types'

const supabase = createClient()

type AthleteNote = {
  id: string
  athlete_id: string
  admin_id: string
  content: string
  created_at: string
}

type AthleteProfile = {
  id: string
  full_name: string
  email?: string
  role: string
  created_at: string
  blocks?: Block[]
  notes?: AthleteNote[]
}


// ── Athlete Detail Panel (training-page style) ─────────────────────
function AthletePanel({
  athlete, exercises, allAthletes, adminId, onBack, onRefresh
}: {
  athlete: AthleteProfile
  exercises: Exercise[]
  allAthletes: AthleteProfile[]
  adminId: string
  onBack: () => void
  onRefresh: () => void
}) {
  const [block, setBlock] = useState<Block | null>(null)
  const [allBlocks, setAllBlocks] = useState<BlockSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState('')
  const [duplicateName, setDuplicateName] = useState('')
  const [showDupModal, setShowDupModal] = useState(false)
  const blockSelectorRef = useRef<HTMLDivElement>(null)
  const addingWorkout = useRef(false)

  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  // Close block selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (blockSelectorRef.current && !blockSelectorRef.current.contains(e.target as Node))
        setShowBlockSelector(false)
    }
    if (showBlockSelector) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBlockSelector])

  useEffect(() => { loadData() }, [athlete.id])

  const loadData = async () => {
    setLoadingBlock(true)
    const { data: blocksData } = await supabase.from('blocks')
      .select('id, name, status, start_date, end_date')
      .eq('athlete_id', athlete.id)
      .order('created_at', { ascending: false })
    const summaries = (blocksData ?? []) as BlockSummary[]
    setAllBlocks(summaries)

    const { data: activeBlock } = await supabase
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('athlete_id', athlete.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (activeBlock) {
      activeBlock.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      activeBlock.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(activeBlock as Block)
    } else {
      setBlock(null)
    }
    setLoadingBlock(false)
  }

  const switchBlock = async (blockId: string) => {
    setLoadingBlock(true)
    setShowBlockSelector(false)
    const { data } = await supabase
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(data as Block)
    }
    setLoadingBlock(false)
  }

  const createBlock = async () => {
    const name = prompt('Naziv novog bloka:')
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    // Deactivate current active block
    if (block) {
      await supabase.from('blocks').update({ status: 'planned' }).eq('id', block.id)
      setAllBlocks(bs => bs.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))
    }
    const { data } = await supabase.from('blocks').insert({
      athlete_id: athlete.id, name: name.trim(),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('id, name, status, start_date, end_date').single()
    if (data) {
      setAllBlocks(bs => [data as BlockSummary, ...bs])
      setBlock({ ...data, weeks: [] } as unknown as Block)
    }
    setSaving(false)
  }

  const copyBlock = async () => {
    if (!block) return
    const name = prompt(`Kopiraj blok "${block.name}" pod nazivom:`)
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data: nb } = await supabase.from('blocks').insert({
      athlete_id: athlete.id, name: name.trim(),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('id, name, status, start_date, end_date').single()
    if (!nb) { setSaving(false); return }
    for (let wi = 0; wi < (block.weeks?.length ?? 0); wi++) {
      const sw = block.weeks![wi]
      const wStart = new Date(today); wStart.setDate(today.getDate() + wi * 7)
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6)
      const { data: nw } = await supabase.from('weeks').insert({
        block_id: nb.id, week_number: sw.week_number,
        start_date: wStart.toISOString().split('T')[0],
        end_date: wEnd.toISOString().split('T')[0], notes: sw.notes,
      }).select('*').single()
      if (!nw) continue
      for (let di = 0; di < (sw.workouts?.length ?? 0); di++) {
        const wo = sw.workouts![di]
        const d = new Date(wStart); d.setDate(wStart.getDate() + di)
        const { data: nwo } = await supabase.from('workouts').insert({
          week_id: nw.id, athlete_id: athlete.id,
          day_name: wo.day_name, workout_date: d.toISOString().split('T')[0],
          completed: false, notes: wo.notes,
        }).select('*').single()
        if (!nwo) continue
        for (const ex of (wo.workout_exercises ?? [])) {
          await supabase.from('workout_exercises').insert({
            workout_id: nwo.id, exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            planned_sets: ex.planned_sets, planned_reps: ex.planned_reps,
            planned_weight_kg: ex.planned_weight_kg, planned_rpe: ex.planned_rpe,
            planned_rest_seconds: ex.planned_rest_seconds, planned_tempo: ex.planned_tempo,
            target_rpe: ex.target_rpe, coach_note: ex.coach_note,
          })
        }
      }
    }
    setAllBlocks(bs => [nb as BlockSummary, ...bs])
    await switchBlock(nb.id)
    setSaving(false)
  }

  const deleteBlock = async () => {
    if (!block) return
    if (!confirm(`Briši blok "${block.name}"? Ova radnja je nepovratna.`)) return
    setSaving(true)
    await supabase.from('blocks').delete().eq('id', block.id)
    const remaining = allBlocks.filter(b => b.id !== block.id)
    setAllBlocks(remaining)
    if (remaining.length > 0) {
      await switchBlock(remaining[0].id)
    } else {
      setBlock(null)
    }
    setSaving(false)
  }

  const duplicateBlockTo = async () => {
    if (!block || !duplicateTarget || !duplicateName) return
    setSaving(true)
    const { data: newBlock } = await supabase.from('blocks').insert({
      athlete_id: duplicateTarget, name: duplicateName,
      start_date: block.start_date, end_date: block.end_date,
      status: 'planned', goal: block.goal
    }).select('*').single()
    if (!newBlock) { setSaving(false); return }
    for (const week of (block.weeks ?? [])) {
      const { data: newWeek } = await supabase.from('weeks').insert({
        block_id: newBlock.id, week_number: week.week_number,
        start_date: week.start_date, end_date: week.end_date
      }).select('*').single()
      if (!newWeek) continue
      for (const workout of (week.workouts ?? [])) {
        const { data: newWorkout } = await supabase.from('workouts').insert({
          week_id: newWeek.id, athlete_id: duplicateTarget,
          day_name: workout.day_name, workout_date: workout.workout_date,
          completed: false, notes: workout.notes
        }).select('*').single()
        if (!newWorkout) continue
        for (const we of (workout.workout_exercises ?? [])) {
          await supabase.from('workout_exercises').insert({
            workout_id: newWorkout.id, exercise_id: we.exercise_id,
            exercise_order: we.exercise_order, planned_sets: we.planned_sets,
            planned_reps: we.planned_reps, planned_weight_kg: we.planned_weight_kg,
            planned_rpe: we.planned_rpe, planned_tempo: we.planned_tempo,
            planned_rest_seconds: we.planned_rest_seconds,
            target_rpe: we.target_rpe, coach_note: we.coach_note,
          })
        }
      }
    }
    setSaving(false)
    setShowDupModal(false)
    alert('Blok uspješno dupliciran!')
    onRefresh()
  }

  // ── CRUD ────────────────────────────────────────────────────────
  const addWeek = async () => {
    if (!block) return; setSaving(true)
    const ew = block.weeks ?? []; const weekNum = ew.length + 1
    const lastEnd = ew.length > 0 ? new Date(ew[ew.length - 1].end_date) : new Date(block.start_date)
    const startDate = new Date(lastEnd); if (ew.length > 0) startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data, error } = await supabase.from('weeks').insert({
      block_id: block.id, week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    }).select('*').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...data, workouts: [] }] } : b)
    setSaving(false)
  }

  const deleteWeek = useCallback(async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
  }, [])

  const copyWeek = useCallback(async (weekId: string) => {
    setSaving(true)
    let src: Week | undefined
    setBlock(b => { src = b?.weeks?.find(w => w.id === weekId); return b })
    if (!src || !block) { setSaving(false); return }
    const ew = block.weeks ?? []
    const weekNum = ew.length + 1
    const lastEnd = new Date(ew[ew.length - 1].end_date)
    const startDate = new Date(lastEnd); startDate.setDate(lastEnd.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data: newWeek } = await supabase.from('weeks').insert({
      block_id: block.id, week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0], notes: src.notes,
    }).select('*').single()
    if (!newWeek) { setSaving(false); return }
    const newWorkouts: Workout[] = []
    for (let i = 0; i < (src.workouts?.length ?? 0); i++) {
      const wo = src.workouts![i]
      const d = new Date(startDate); d.setDate(startDate.getDate() + i)
      const { data: nwo } = await supabase.from('workouts').insert({
        week_id: newWeek.id, athlete_id: athlete.id,
        day_name: wo.day_name, workout_date: d.toISOString().split('T')[0],
        completed: false, notes: wo.notes,
      }).select('*').single()
      if (!nwo) continue
      const newExercises: WorkoutExercise[] = []
      for (const ex of (wo.workout_exercises ?? [])) {
        const { data: nex } = await supabase.from('workout_exercises').insert({
          workout_id: nwo.id, exercise_id: ex.exercise_id,
          exercise_order: ex.exercise_order,
          planned_sets: ex.planned_sets, planned_reps: ex.planned_reps,
          planned_weight_kg: ex.planned_weight_kg, planned_rpe: ex.planned_rpe,
          planned_rest_seconds: ex.planned_rest_seconds, planned_tempo: ex.planned_tempo,
          target_rpe: ex.target_rpe, coach_note: ex.coach_note,
        }).select('*, exercise:exercises(*)').single()
        if (nex) newExercises.push(nex as WorkoutExercise)
      }
      newWorkouts.push({ ...nwo, workout_exercises: newExercises })
    }
    setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...newWeek, workouts: newWorkouts }] } : b)
    setSaving(false)
  }, [block, athlete.id])

  const updateWeek = useCallback(async (weekId: string, data: Partial<Week>) => {
    await supabase.from('weeks').update(data).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, ...data } : w) } : b)
  }, [])

  const addWorkout = useCallback(async (weekId: string) => {
    if (addingWorkout.current) return
    addingWorkout.current = true
    setSaving(true)
    const week = block?.weeks?.find(w => w.id === weekId)
    if (!week) { setSaving(false); return }
    const nd = week.workouts?.length ?? 0
    const d = new Date(week.start_date); d.setDate(d.getDate() + nd)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/add-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        weekId, athleteId: athlete.id,
        dayName: `Dan ${nd + 1}`,
        workoutDate: d.toISOString().split('T')[0],
      }),
    })
    const json = await res.json()
    if (json.data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, workouts: [...(w.workouts ?? []), { ...json.data, workout_exercises: [] }] } : w) } : b)
    addingWorkout.current = false
    setSaving(false)
  }, [block, athlete.id])

  const updateWorkout = useCallback(async (workoutId: string, data: Partial<Workout>) => {
    // Never save 'completed' from admin panel — that's the lifter's domain
    const { completed: _c, ...forDb } = data as any
    if (Object.keys(forDb).length > 0) await supabase.from('workouts').update(forDb).eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, ...forDb } : wo) })) } : b)
  }, [])

  const deleteWorkout = useCallback(async (workoutId: string) => {
    await supabase.from('workouts').delete().eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.filter(wo => wo.id !== workoutId) })) } : b)
  }, [])

  const addExercise = useCallback(async (workoutId: string, ex: Exercise) => {
    setSaving(true)
    let order = 1
    setBlock(b => {
      const workout = b?.weeks?.flatMap(w => w.workouts ?? []).find(w => w.id === workoutId)
      order = (workout?.workout_exercises?.length ?? 0) + 1
      return b
    })
    const { data, error } = await supabase.from('workout_exercises').insert({
      workout_id: workoutId, exercise_id: ex.id, exercise_order: order, planned_sets: 3, planned_reps: '5'
    }).select('*, exercise:exercises(*)').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, workout_exercises: [...(wo.workout_exercises ?? []), data as WorkoutExercise] } : wo) })) } : b)
    setSaving(false)
  }, [])

  const updateExercise = useCallback(async (weId: string, data: Partial<WorkoutExercise>) => {
    const RUNTIME_ONLY = ['_completedSets', '_totalSets']
    const forDb = Object.fromEntries(Object.entries(data).filter(([k]) => !RUNTIME_ONLY.includes(k)))
    if (Object.keys(forDb).length > 0) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/admin/update-exercise', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ weId, data: forDb }),
      })
    }
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...data } : we) })) })) } : b)
  }, [])

  const deleteExercise = useCallback(async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }, [])

  const { totalWorkouts, completedWorkouts, totalSets, doneSets, pct } = useMemo(() => {
    const allWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []) ?? []
    const totalWorkouts = allWorkouts.length
    const completedWorkouts = allWorkouts.filter(w => w.completed).length
    const allExercises = allWorkouts.flatMap(wo => wo.workout_exercises ?? [])
    const totalSets = allExercises.reduce((s, e) => s + (e.planned_sets ?? 0), 0)
    const doneSets = 0
    const pct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
    return { totalWorkouts, completedWorkouts, totalSets, doneSets, pct }
  }, [block])

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', borderRadius: '8px', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
          <ChevronLeft size={13} /> NAZAD
        </button>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.1))', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#c7d2fe', fontFamily: 'var(--fm)', flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f0f0ff', fontFamily: 'var(--fd)', lineHeight: 1, letterSpacing: '-0.02em' }}>{athlete.full_name}</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: '4px' }}>
            {athlete.email} · <span style={{ color: athlete.role === 'admin' ? '#ef4444' : athlete.role === 'trener' ? '#fbbf24' : '#4ade80' }}>{(athlete.role ?? 'lifter').toUpperCase()}</span>
          </div>
        </div>
        {/* Stats */}
        {block && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            {[
              { val: allBlocks.length, label: 'BLOKOVA' },
              { val: totalWorkouts, label: 'TRENINGA' },
              { val: `${pct}%`, label: 'NAPREDAK' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '10px 18px', background: '#08080e', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: '#f0f0ff', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Block bar (identical to training page) ── */}
      <div style={{ position: 'relative', marginBottom: '24px' }} ref={blockSelectorRef}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>

          {/* Block switcher */}
          <button onClick={() => setShowBlockSelector(!showBlockSelector)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: showBlockSelector ? '#111113' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', flex: 1, textAlign: 'left', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!showBlockSelector) e.currentTarget.style.background = '#111113' }}
            onMouseLeave={e => { if (!showBlockSelector) e.currentTarget.style.background = 'transparent' }}>
            <FolderOpen size={14} color="#555" />
            <div>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: '#888', marginBottom: '2px', fontFamily: 'var(--fm)' }}>AKTIVNI BLOK</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{block?.name ?? 'Nema bloka'}</div>
            </div>
            <ChevronDown size={12} color="#444" style={{ marginLeft: 'auto', transform: showBlockSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Block name edit */}
          {block && (
            <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
              <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: '#888', flexShrink: 0, fontFamily: 'var(--fm)' }}>NAZIV</div>
              <EditableField value={block.name} placeholder="Naziv programa"
                onSave={async v => {
                  await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                  setBlock(b => b ? { ...b, name: v } : b)
                  setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2))
                }} />
            </div>
          )}

          {/* Actions */}
          <button onClick={createBlock}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#111113' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}>
            <Plus size={11} /> NOVI BLOK
          </button>
          {block && <>
            <button onClick={copyBlock}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#111113' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}>
              <Copy size={11} /> KOPIRAJ BLOK
            </button>
            <button onClick={() => { setDuplicateName(`${block.name} (kopija)`); setDuplicateTarget(''); setShowDupModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = '#111113' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent' }}>
              <Copy size={11} /> DUPLICIRAJ NA...
            </button>
            <button onClick={deleteBlock}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; e.currentTarget.style.background = 'transparent' }}>
              <Trash2 size={11} /> BRIŠI BLOK
            </button>
          </>}

          {saving && (
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
              <Loader2 size={13} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
        </div>

        {/* Block dropdown */}
        {showBlockSelector && allBlocks.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#09090e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '280px', overflowY: 'auto', animation: 'dropDown 0.18s ease' }}>
            {allBlocks.map(b => (
              <button key={b.id} onClick={() => switchBlock(b.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: b.id === block?.id ? '#111113' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111113'}
                onMouseLeave={e => e.currentTarget.style.background = b.id === block?.id ? '#111113' : 'transparent'}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.status === 'active' ? '#22c55e' : b.status === 'completed' ? '#60a5fa' : '#333', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{b.name}</div>
                  <div style={{ fontSize: '0.56rem', color: '#444', marginTop: '1px', fontFamily: 'var(--fm)' }}>{b.start_date} — {b.end_date}</div>
                </div>
                {b.id === block?.id && <Check size={12} color="#22c55e" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {loadingBlock ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', color: '#444' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
        </div>
      ) : !block ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '3rem', opacity: 0.1, marginBottom: '12px', color: '#fff' }}>—</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '24px', fontFamily: 'var(--fm)' }}>NEMA AKTIVNOG BLOKA</div>
          <button onClick={createBlock}
            style={{ padding: '12px 28px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '8px' }}>
            + KREIRAJ PRVI BLOK
          </button>
        </div>
      ) : (
        <>
          {(block.weeks?.length ?? 0) === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '16px', fontFamily: 'var(--fm)' }}>
              BLOK JE PRAZAN — DODAJ TJEDAN
            </div>
          )}
          {block.weeks?.map(week => (
            <WeekPanel
              key={week.id}
              week={week}
              exercises={exercises}
              isAdmin={true}
              userId={athlete.id}
              onDeleteWeek={deleteWeek}
              onCopyWeek={copyWeek}
              onUpdateWeek={updateWeek}
              onAddWorkout={addWorkout}
              onUpdateWorkout={updateWorkout}
              onDeleteWorkout={deleteWorkout}
              onAddExercise={addExercise}
              onUpdateExercise={updateExercise}
              onDeleteExercise={deleteExercise}
            />
          ))}
          <button onClick={addWeek}
            style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px dashed rgba(99,102,241,0.25)', color: 'rgba(165,180,252,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.68rem', letterSpacing: '0.3em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', borderRadius: '8px' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; e.currentTarget.style.color = '#a5b4fc' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = 'rgba(165,180,252,0.5)' }}>
            <Plus size={13} /> DODAJ TJEDAN {(block.weeks?.length ?? 0) + 1}
          </button>
        </>
      )}

      {/* Duplicate to another athlete modal */}
      {showDupModal && block && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setShowDupModal(false)}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#0d0d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '28px', animation: 'slideUp 0.25s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>DUPLICIRAJ BLOK</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', marginBottom: '24px' }}>{block.name}</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>NAZIV KOPIJE</div>
              <input value={duplicateName} onChange={e => setDuplicateName(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--fm)', borderRadius: '8px', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>KOPIRAJ NA KORISNIKA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {allAthletes.filter(a => a.id !== athlete.id).map(a => (
                  <button key={a.id} onClick={() => setDuplicateTarget(a.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: duplicateTarget === a.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: `1px solid ${duplicateTarget === a.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, fontFamily: 'var(--fm)' }}>{a.full_name}</div>
                      <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{a.role}</div>
                    </div>
                    {duplicateTarget === a.id && <Check size={12} color="#818cf8" />}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowDupModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.68rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', borderRadius: '8px' }}>
                ODUSTANI
              </button>
              <button onClick={duplicateBlockTo} disabled={!duplicateTarget || !duplicateName || saving}
                style={{ flex: 1, padding: '10px', background: duplicateTarget && duplicateName ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${duplicateTarget && duplicateName ? 'rgba(99,102,241,0.5)' : 'transparent'}`, color: duplicateTarget && duplicateName ? '#a5b4fc' : 'rgba(255,255,255,0.2)', cursor: duplicateTarget && duplicateName ? 'pointer' : 'not-allowed', fontSize: '0.68rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '8px', transition: 'all 0.2s' }}>
                {saving ? 'DUPLICIRA...' : 'DUPLICIRAJ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .add-btn { display:flex; align-items:center; gap:6px; width:100%; padding:10px 14px; background:transparent; border:1px dashed rgba(99,102,241,0.2); color:rgba(165,180,252,0.5); cursor:pointer; font-size:0.65rem; letter-spacing:0.2em; font-family:var(--fm); font-weight:700; transition:all 0.2s; border-radius:7px; justify-content:center; margin-top:6px; }
        .add-btn:hover { border-color:rgba(99,102,241,0.5); color:#a5b4fc; background:rgba(99,102,241,0.05); }
        .icon-btn-danger { background:transparent; border:none; cursor:pointer; color:rgba(255,255,255,0.2); padding:6px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:all 0.15s; }
        .icon-btn-danger:hover { color:#ef4444; background:rgba(239,68,68,0.08); }
        .cat-btn { padding:4px 12px; font-size:0.62rem; letter-spacing:0.1em; font-weight:700; cursor:pointer; font-family:var(--fm); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:6px; transition:all 0.15s; }
        .cat-btn-active, .cat-btn:hover { background:rgba(99,102,241,0.15); color:#a5b4fc; border-color:rgba(99,102,241,0.4); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────
export default function AdminPage() {
  const [adminName, setAdminName] = useState('')
  const [adminId, setAdminId] = useState('')
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [managingUsers, setManagingUsers] = useState(false)
  const [dashSection, setDashSection] = useState<'athletes' | 'competitions' | 'obavijesti' | 'treneri'>('athletes')
  const [notifMsg, setNotifMsg] = useState('')
  const [notifSelected, setNotifSelected] = useState<string[]>([])
  const [notifSending, setNotifSending] = useState(false)
  const [coaches, setCoaches] = useState<AthleteProfile[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // lifter_id → coach_id
  const [assignSaving, setAssignSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddLifter, setShowAddLifter] = useState(false)
  const [newLifterEmail, setNewLifterEmail] = useState('')
  const [newLifterName, setNewLifterName] = useState('')
  const [addLifterLoading, setAddLifterLoading] = useState(false)
  const [addLifterError, setAddLifterError] = useState('')
  const [addLifterSuccess, setAddLifterSuccess] = useState('')
  const router = useRouter()

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const handleAddLifter = async () => {
    setAddLifterError('')
    setAddLifterSuccess('')
    if (!newLifterEmail || !newLifterName) { setAddLifterError('Email i ime su obavezni.'); return }
    setAddLifterLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/create-lifter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: newLifterEmail, fullName: newLifterName }),
      })
      const json = await res.json()
      if (!res.ok) { setAddLifterError(json.error ?? 'Greška.'); return }
      setAddLifterSuccess(`${newLifterName} uspješno dodan!`)
      setNewLifterEmail('')
      setNewLifterName('')
      // Refresh athletes
      const { data } = await supabase.from('profiles').select('*, blocks:training_blocks(*), notes:athlete_notes(*)').order('full_name')
      if (data) setAthletes(data)
    } catch (e: any) {
      setAddLifterError(e.message)
    } finally {
      setAddLifterLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Nisi prijavljen/a.')
          setLoading(false)
          return
        }

        setAdminId(user.id)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        // Debug: log what we got
        console.log('Profile data:', profile, 'Profile error:', profileError)

        if (profileError) {
          setError(`Greška čitanja profila: ${profileError.message}. Provjeri RLS policies na tablici profiles.`)
          setLoading(false)
          return
        }

        if (!profile) {
          setError('Profil ne postoji u bazi.')
          setLoading(false)
          return
        }

        if (profile.role !== 'admin') {
          setError(`Pristup odbijen — tvoja rola je "${profile.role}", treba biti "admin".`)
          setLoading(false)
          return
        }

        setAdminName(profile.full_name ?? 'Admin')

        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])

        await loadAthletes()
      } catch (e: any) {
        setError(`Neočekivana greška: ${e?.message ?? String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadAthletes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('full_name')

    if (data) {
      const withBlocks = await Promise.all(data.map(async (p) => {
        const { data: blocks } = await supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', p.id)
        return { ...p, blocks: blocks ?? [] } as AthleteProfile
      }))
      setAthletes(withBlocks)
      setCoaches(withBlocks.filter(p => p.role === 'trener' || p.role === 'admin'))

      // Load existing assignments
      const { data: asgn } = await supabase.from('coach_assignments').select('coach_id, lifter_id')
      const map: Record<string, string> = {}
      for (const a of (asgn ?? [])) map[a.lifter_id] = a.coach_id
      setAssignments(map)
    }
  }

  const assignLifterToCoach = async (lifterId: string, coachId: string | null) => {
    setAssignSaving(true)
    if (!coachId) {
      await supabase.from('coach_assignments').delete().eq('lifter_id', lifterId)
      setAssignments(prev => { const n = { ...prev }; delete n[lifterId]; return n })
    } else {
      await supabase.from('coach_assignments').upsert({ coach_id: coachId, lifter_id: lifterId }, { onConflict: 'lifter_id' })
      setAssignments(prev => ({ ...prev, [lifterId]: coachId }))
    }
    setAssignSaving(false)
  }

  const updateRole = async (athleteId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', athleteId)
    setAthletes(a => {
      const updated = a.map(x => x.id === athleteId ? { ...x, role: newRole } : x)
      setCoaches(updated.filter(p => p.role === 'trener' || p.role === 'admin'))
      return updated
    })
  }

  const deleteUser = async (athleteId: string) => {
    if (!confirm('Jesi li siguran/na? Ovo će obrisati sve podatke korisnika.')) return
    // Note: In production, use admin API or edge function to delete auth user
    await supabase.from('profiles').delete().eq('id', athleteId)
    setAthletes(a => a.filter(x => x.id !== athleteId))
    if (selectedAthlete?.id === athleteId) setSelectedAthlete(null)
  }

  const filteredAthletes = athletes.filter(a =>
    a.full_name?.toLowerCase().includes(searchQ.toLowerCase())
  )

  const totalAthletes = athletes.length
  const activeBlocks = athletes.reduce((s, a) => s + ((a.blocks as Block[])?.filter(b => b.status === 'active').length ?? 0), 0)
  const lifters = athletes // svi korisnici mogu primati obavijesti

  if (loading) return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'var(--fm)' }}>
      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.8rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>UČITAVANJE ADMIN PANELA...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'var(--fm)', padding: '40px' }}>
      <AlertCircle size={32} color="#ff4444" />
      <div style={{ fontSize: '0.9rem', color: '#ff7070', textAlign: 'center', maxWidth: '520px', lineHeight: 1.7 }}>{error}</div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
          POKUŠAJ PONOVO
        </button>
        <Link href="/" style={{ padding: '10px 20px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.2em', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>← POČETNA</Link>
      </div>
      <div style={{ marginTop: '8px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', maxWidth: '520px' }}>
        Otvori F12 → Console za više detalja o grešci.
      </div>
    </div>
  )

  return (
    <div style={{ background: '#04040a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative' }}>

      {/* ── BACKGROUND ── */}
      {/* Noise */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px' }} />
      {/* Grid */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)' }} />
      {/* Aurora — top right, red tint (admin feel) */}
      <div style={{ position: 'fixed', top: '-20vh', right: '-15vw', width: '70vw', height: '70vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 40%, rgba(220,38,38,0.1) 0%, rgba(239,68,68,0.05) 40%, transparent 70%)',
        filter: 'blur(70px)', transform: 'rotate(10deg)' }} />
      {/* Aurora — bottom left, indigo */}
      <div style={{ position: 'fixed', bottom: '-20vh', left: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 60%, rgba(79,70,229,0.1) 0%, rgba(99,102,241,0.05) 45%, transparent 70%)',
        filter: 'blur(80px)' }} />
      {/* Top beam */}
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.3) 30%, rgba(239,68,68,0.4) 50%, rgba(220,38,38,0.3) 70%, transparent 100%)',
        boxShadow: '0 0 40px 8px rgba(220,38,38,0.08)' }} />
      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
      {/* ipflogo — top left, very faint */}
      <div style={{ position: 'fixed', top: '12vh', left: '-1vw', zIndex: 0, pointerEvents: 'none', opacity: 0.035, filter: 'blur(1px) grayscale(1)' }}>
        <img src="/slike/ipflogo.png" alt="" style={{ width: '200px', height: 'auto' }} />
      </div>

      <AppNav athleteName={adminName} isAdmin={true} onLogout={handleLogout} />

      {/* MAIN */}
      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1 }}>

        {selectedAthlete ? (
          /* ─── ATHLETE DETAIL VIEW ─── */
          <div className="admin-outer" style={{ padding: '48px 60px 100px', maxWidth: '1300px', margin: '0 auto' }}>
            <AthletePanel
              athlete={selectedAthlete}
              exercises={exercises}
              allAthletes={athletes}
              adminId={adminId}
              onBack={() => setSelectedAthlete(null)}
              onRefresh={loadAthletes}
            />
          </div>
        ) : (
          /* ─── DASHBOARD ─── */
          <div className="admin-outer" style={{ padding: '48px 60px 100px', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.6em', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' }}>LWL UP · UPRAVLJANJE LIFERIMA</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4.5vw,4.5rem)', fontWeight: 800, lineHeight: 0.88, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
                ADMIN<br /><span style={{ color: 'rgba(255,255,255,0.15)' }}>PANEL</span>
              </h1>

              {/* Section switcher */}
              <div className="admin-section-switcher" style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', width: 'fit-content', marginBottom: '32px' }}>
                {([['athletes', 'Lifteri'], ['treneri', 'Treneri'], ['competitions', 'Natjecanja'], ['obavijesti', 'Obavijesti']] as [string,string][]).map(([sec, label]) => (
                  <button key={sec} onClick={() => setDashSection(sec as any)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', background: dashSection === sec ? 'rgba(255,255,255,0.1)' : 'transparent', border: dashSection === sec ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: dashSection === sec ? 700 : 400, color: dashSection === sec ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '0.04em' }}>
                    {sec === 'competitions' && <Trophy size={13} />}
                    {sec === 'obavijesti' && <Bell size={13} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Summary stats */}
              <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', maxWidth: '450px' }}>
                {[
                  { val: totalAthletes, label: 'LIFERA', color: '#fff' },
                  { val: activeBlocks, label: 'AKT. BLOKOVA', color: '#4ade80' },
                  { val: athletes.reduce((s, a) => s + ((a.blocks as Block[])?.length ?? 0), 0), label: 'UK. BLOKOVA', color: '#fff' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '18px 20px', background: '#08080a', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {dashSection === 'competitions' && <CompetitionsManager />}

            {dashSection === 'obavijesti' && (
              <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: '680px' }}>
                {/* Compose box */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>NOVA OBAVIJEST</div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
                    <textarea
                      value={notifMsg}
                      onChange={e => setNotifMsg(e.target.value)}
                      placeholder="Upiši poruku za lifere..."
                      style={{ width: '100%', minHeight: '90px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.6, borderRadius: '6px' }}
                    />

                    {/* Lifter selection */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>PRIMATELJI ({notifSelected.length}/{lifters.length})</div>
                        <button
                          onClick={() => setNotifSelected(notifSelected.length === lifters.length ? [] : lifters.map(a => a.id))}
                          style={{ background: notifSelected.length === lifters.length ? 'rgba(251,191,36,0.12)' : 'transparent', border: `1px solid ${notifSelected.length === lifters.length ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.12)'}`, color: notifSelected.length === lifters.length ? '#fbbf24' : 'rgba(255,255,255,0.4)', padding: '4px 14px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '5px', transition: 'all 0.15s' }}>
                          SVI KORISNICI
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', maxHeight: '220px', overflowY: 'auto' as const }}>
                        {lifters.map(a => {
                          const sel = notifSelected.includes(a.id)
                          const initials = a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                          return (
                            <button key={a.id} onClick={() => setNotifSelected(sel ? notifSelected.filter(id => id !== a.id) : [...notifSelected, a.id])}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: sel ? 'rgba(251,191,36,0.06)' : 'transparent', border: `1px solid ${sel ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '7px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: 'var(--fm)' }}>{initials}</div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: sel ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', flex: 1 }}>{a.full_name}</span>
                              <span style={{ fontSize: '0.45rem', letterSpacing: '0.1em', color: a.role === 'admin' ? '#ef4444' : a.role === 'trener' ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{(a.role ?? 'lifter').toUpperCase()}</span>
                              {sel && <Check size={13} color="#fbbf24" />}
                            </button>
                          )
                        })}
                        {lifters.length === 0 && <div style={{ padding: '16px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nema korisnika.</div>}
                      </div>
                    </div>

                    {/* Send button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        disabled={!notifMsg.trim() || notifSelected.length === 0 || notifSending}
                        onClick={async () => {
                          if (!notifMsg.trim() || notifSelected.length === 0) return
                          setNotifSending(true)
                          await supabase.from('notifications').insert(
                            notifSelected.map(rid => ({ recipient_id: rid, sender_id: adminId, message: notifMsg.trim(), read: false }))
                          )
                          setNotifMsg('')
                          setNotifSelected([])
                          setNotifSending(false)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#fbbf24' : 'rgba(255,255,255,0.06)', border: 'none', color: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? '#000' : 'rgba(255,255,255,0.2)', cursor: notifMsg.trim() && notifSelected.length > 0 && !notifSending ? 'pointer' : 'not-allowed', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '7px', transition: 'all 0.2s' }}>
                        {notifSending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                        POŠALJI OBAVIJEST {notifSelected.length > 0 && `(${notifSelected.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dashSection === 'treneri' && (
              <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: '780px' }}>
                <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '20px' }}>
                  UPRAVLJANJE TRENERIMA — dodjeli liftera treneru ili promijeni rolu korisnika u trenera
                </div>

                {/* Coach-lifter assignment */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>DODJELA LIFTERA TRENERU</span>
                    {assignSaving && <span style={{ fontSize: '0.55rem', color: '#fbbf24', fontFamily: 'var(--fm)' }}>Sprema...</span>}
                  </div>
                  {athletes.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>Nema korisnika.</div>
                  ) : athletes.map(lifter => (
                    <div key={lifter.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{lifter.full_name}</div>
                      </div>
                      <select
                        value={assignments[lifter.id] ?? ''}
                        onChange={e => assignLifterToCoach(lifter.id, e.target.value || null)}
                        style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.12)', color: assignments[lifter.id] ? '#fff' : 'rgba(255,255,255,0.35)', padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--fm)', borderRadius: '6px', outline: 'none', cursor: 'pointer', minWidth: '180px' }}>
                        <option value="">— Bez trenera —</option>
                        {coaches.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {coaches.length === 0 && (
                    <div style={{ padding: '16px 20px', background: 'rgba(251,191,36,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem', color: '#fbbf24', fontFamily: 'var(--fm)' }}>
                      Nema trenera — promijeni rolu korisnika u "trener" ispod.
                    </div>
                  )}
                </div>

                {/* Role management for coaches */}
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>ROLE KORISNIKA</div>
                  {athletes.filter(a => a.role !== 'admin').map(a => (
                    <div key={a.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{a.full_name}</div>
                      </div>
                      <select
                        value={a.role}
                        onChange={e => updateRole(a.id, e.target.value)}
                        style={{ background: '#0f0f14', border: `1px solid ${a.role === 'trener' ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.12)'}`, color: a.role === 'trener' ? '#fbbf24' : '#fff', padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--fm)', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}>
                        <option value="lifter">Lifter</option>
                        <option value="trener">Trener</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dashSection === 'athletes' && <>
            {/* Search + manage */}
            <div className="admin-search-row" style={{ display: 'flex', gap: '12px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', maxWidth: '360px' }}>
                <Search size={14} color="rgba(255,255,255,0.3)" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Pretraži lifere..."
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.88rem', width: '100%', fontFamily: 'var(--fm)' }} />
              </div>
              <button onClick={() => setManagingUsers(!managingUsers)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: managingUsers ? 'rgba(239,68,68,0.1)' : 'transparent', border: `1px solid ${managingUsers ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, color: managingUsers ? '#ef4444' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
                <Settings size={13} /> {managingUsers ? 'ZATVORI UPRAVLJANJE' : 'UPRAVLJAJ KORISNICIMA'}
              </button>
              <button onClick={() => { setShowAddLifter(true); setAddLifterError(''); setAddLifterSuccess('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                <Plus size={13} /> DODAJ LIFTERA
              </button>
            </div>

            {/* Athlete circles grid */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.2)', marginBottom: '20px', fontFamily: 'var(--fm)' }}>KORISNICI — KLIKNI NA PROFIL ZA UREĐIVANJE</div>
              <div className="admin-athlete-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {filteredAthletes.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', padding: '40px 0' }}>Nema lifera.</div>
                )}
                {filteredAthletes.map(athlete => {
                  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                  const activeBlock = (athlete.blocks as Block[])?.find(b => b.status === 'active')
                  const blockCount = (athlete.blocks as Block[])?.length ?? 0
                  const noteCount = (athlete.notes as any[])?.length ?? 0

                  return (
                    <div key={athlete.id} style={{ position: 'relative', animation: 'fadeUp 0.4s ease', minWidth: 0 }}>
                      {/* Card */}
                      <div
                        onClick={() => !managingUsers && setSelectedAthlete(athlete)}
                        style={{ width: '160px', minWidth: 0, padding: '20px 16px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', cursor: managingUsers ? 'default' : 'pointer', transition: 'all 0.25s', textAlign: 'center', position: 'relative', boxSizing: 'border-box' as const }}
                        onMouseEnter={e => { if (!managingUsers) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                      >
                        {/* Avatar circle */}
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%)', border: '2px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fm)', margin: '0 auto 12px', position: 'relative' }}>
                          {initials}
                          {/* Active indicator */}
                          {(activeBlock || athlete.role === 'admin') && <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '10px', height: '10px', borderRadius: '50%', background: athlete.role === 'admin' ? '#ef4444' : '#4ade80', border: '2px solid #08080a', boxShadow: athlete.role === 'admin' ? '0 0 6px #ef4444' : '0 0 6px #4ade80' }} />}
                        </div>

                        {/* Name */}
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', marginBottom: '4px', lineHeight: 1.2 }}>{athlete.full_name}</div>

                        {/* Active block name */}
                        <div style={{ fontSize: '0.58rem', color: athlete.role === 'admin' ? '#ef4444' : (activeBlock ? '#4ade80' : 'rgba(255,255,255,0.2)'), letterSpacing: '0.08em', marginBottom: '12px', minHeight: '16px' }}>
                          {athlete.role === 'admin' ? '⚙ ADMINISTRATOR' : (activeBlock ? activeBlock.name : 'Nema ak. bloka')}
                        </div>

                        {/* Micro stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ padding: '6px', background: '#08080a', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)' }}>{blockCount}</div>
                            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>BLOKOVA</div>
                          </div>
                          <div style={{ padding: '6px', background: '#08080a', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: noteCount > 0 ? '#facc15' : '#fff', fontFamily: 'var(--fd)' }}>{noteCount}</div>
                            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>BILJEŠKI</div>
                          </div>
                        </div>

                        {/* Manage overlay */}
                        {managingUsers && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '4px' }}>
                            <select
                              value={athlete.role}
                              onChange={e => { e.stopPropagation(); updateRole(athlete.id, e.target.value) }}
                              style={{ flex: 1, background: '#0d0d10', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '5px 8px', fontSize: '0.6rem', fontFamily: 'var(--fm)', cursor: 'pointer', outline: 'none' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="lifter">lifter</option>
                              <option value="trener">trener</option>
                              <option value="admin">admin</option>
                            </select>
                            <button onClick={e => { e.stopPropagation(); deleteUser(athlete.id) }}
                              style={{ padding: '5px 8px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', color: '#ff7070', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,60,60,0.18)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,60,60,0.08)'}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}

                        {/* View arrow */}
                        {!managingUsers && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0, transition: 'opacity 0.2s' }} className="view-arrow">
                            <Eye size={12} color="rgba(255,255,255,0.4)" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            </>}
          </div>
        )}
      </div>

      {/* Add Lifter Modal */}
      {showAddLifter && (
        <div onClick={() => setShowAddLifter(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.1)', padding: '36px', width: '100%', maxWidth: '420px', animation: 'slideUp 0.25s ease' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '24px', fontFamily: 'var(--fm)', fontWeight: 700 }}>DODAJ NOVOG LIFTERA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>IME I PREZIME</div>
                <input value={newLifterName} onChange={e => setNewLifterName(e.target.value)} placeholder="Ime Prezime"
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem', padding: '8px 0', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>EMAIL</div>
                <input value={newLifterEmail} onChange={e => setNewLifterEmail(e.target.value)} placeholder="email@gmail.com" type="email"
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem', padding: '8px 0', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>Defaultna lozinka: <span style={{ color: 'rgba(255,255,255,0.5)' }}>LwlupChange123!</span></div>
              {addLifterError && <div style={{ fontSize: '0.75rem', color: '#ef4444', fontFamily: 'var(--fm)' }}>{addLifterError}</div>}
              {addLifterSuccess && <div style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'var(--fm)' }}>{addLifterSuccess}</div>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setShowAddLifter(false)}
                  style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                  ODUSTANI
                </button>
                <button onClick={handleAddLifter} disabled={addLifterLoading}
                  style={{ flex: 1, padding: '12px', background: addLifterLoading ? 'rgba(255,255,255,0.05)' : '#fff', color: addLifterLoading ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', cursor: addLifterLoading ? 'not-allowed' : 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {addLifterLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> DODAVANJE...</> : 'DODAJ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown{ from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp  { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes dropDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        @keyframes pingPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        div:hover .view-arrow { opacity: 1 !important; }

        /* ── Nav styles (same as training) ── */
        .tnav-pill { display: flex; align-items: center; }
        .nav-menu-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; background: transparent; border: none;
          cursor: pointer; color: #999; font-size: 0.82rem;
          font-family: var(--fm); transition: all 0.15s; text-align: left;
          border-radius: 6px;
        }
        .nav-menu-item:hover { background: rgba(255,255,255,0.07); color: #e0e0e0; }
        .nav-menu-logout { color: rgba(255,80,80,0.7) !important; }
        .nav-menu-logout:hover { background: rgba(255,60,60,0.08) !important; color: #ff6060 !important; }
        .profile-dropdown { width: min(220px, calc(100vw - 32px)) !important; right: 0 !important; }

        /* ── Navbar ── */
        @media (max-width: 640px) { .appnav-status { display: none !important; } }
        @media (max-width: 520px) { .appnav-name { display: none !important; } }

        /* ── Main outer padding ── */
        .admin-outer { padding: 32px 24px 100px !important; }
        @media (max-width: 600px) { .admin-outer { padding: 20px 14px 90px !important; } }

        /* ── Dashboard hero title ── */
        @media (max-width: 480px) {
          .admin-outer h1 { font-size: 2.6rem !important; }
        }

        /* ── Section switcher: full width + scrollable ── */
        .admin-section-switcher {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
          width: 100% !important;
          max-width: 100% !important;
          scrollbar-width: none;
        }
        .admin-section-switcher::-webkit-scrollbar { display: none; }
        .admin-section-switcher button { white-space: nowrap; flex-shrink: 0; }

        /* ── Summary stats: 3→1 row on mobile ── */
        .admin-stats-grid { max-width: 100% !important; }
        @media (max-width: 480px) {
          .admin-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .admin-stats-grid > div { padding: 12px 10px !important; }
        }

        /* ── Search row: stack on mobile ── */
        @media (max-width: 520px) {
          .admin-search-row { flex-direction: column !important; align-items: stretch !important; }
          .admin-search-row > div { max-width: 100% !important; }
          .admin-search-row > button { justify-content: center; width: 100%; }
        }

        /* ── Athlete cards grid ── */
        .admin-athlete-grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .admin-athlete-grid > div { flex: 0 0 150px; }
        @media (max-width: 520px) {
          .admin-athlete-grid { gap: 10px; }
          .admin-athlete-grid > div { flex: 1 1 calc(50% - 5px); max-width: calc(50% - 5px); }
          .admin-athlete-grid > div > div { width: 100% !important; }
        }

        /* ── Treneri section ── */
        @media (max-width: 520px) {
          .admin-outer select { min-width: 0 !important; width: 100% !important; }
        }

        /* ══ ATHLETE DETAIL (training-style) ══ */

        /* ── Detail header: stack vertically on mobile ── */
        .admin-detail-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
        @media (max-width: 600px) {
          .admin-detail-header { gap: 12px; }
        }

        /* ── Detail stats pill: full width on mobile ── */
        .admin-detail-stats-pill { margin-left: auto; }
        @media (max-width: 600px) {
          .admin-detail-stats-pill { margin-left: 0; width: 100%; }
          .admin-detail-stats-pill > div { flex: 1; }
        }
        @media (max-width: 380px) {
          .admin-detail-stats-pill > div { padding: 8px 10px !important; }
          .admin-detail-stats-pill > div > div:first-child { font-size: 1.1rem !important; }
        }

        /* ── Block bar: wrap + compact on mobile ── */
        @media (max-width: 600px) {
          .admin-outer [style*="borderRadius: '12px'"] { border-radius: 10px; }
        }
        @media (max-width: 520px) {
          /* Block name edit field: hide on very small */
          .block-bar-name { display: none !important; }
        }
        @media (max-width: 480px) {
          /* Block bar action buttons: smaller text */
          .admin-outer button[style*="0 14px"] { padding: 0 10px !important; font-size: 0.55rem !important; }
        }

        /* ── WeekPanel ── */
        .week-header-top { padding: clamp(12px,3vw,20px) clamp(14px,4vw,24px) 0 !important; }
        .week-w-num { font-size: clamp(1.6rem,5vw,3.6rem) !important; }
        @media (max-width: 480px) {
          .day-grid > div { padding: 8px 6px !important; }
        }

        /* ── WorkoutCard ── */
        .workout-card { border-radius: 8px !important; }
        .workout-header-inner { padding: 12px 14px !important; gap: 10px !important; }
        @media (max-width: 480px) {
          .workout-header-inner { padding: 10px 12px !important; }
          .workout-controls { gap: 6px !important; }
          .done-badge { padding: 5px 8px !important; }
          .done-badge span { font-size: 0.46rem !important; letter-spacing: 0.12em !important; }
        }
        @media (max-width: 360px) {
          .done-badge span { display: none !important; }
        }

        /* ── ExerciseRow (admin isAdmin=true layout) ── */
        /* Main row: grip 48px | content 1fr | delete 44px */
        .ex-row-main { min-height: 52px !important; }
        @media (max-width: 480px) {
          .ex-row-main { grid-template-columns: 36px 1fr 36px !important; }
          .ex-row-main > div:first-child { width: 36px !important; }
        }

        /* Inline plan fields below exercise name */
        @media (max-width: 400px) {
          .ex-row-main [style*="paddingLeft: '18px'"] { padding-left: 8px !important; gap: 6px !important; }
        }

        /* ── SetLogSection (admin per-set KG/RPE grid) ── */
        /* COACH_GRID: 48px 1fr 88px */
        @media (max-width: 480px) {
          /* Shrink set label col */
          .ex-row-wrap > div > div[style*="gridTemplateColumns: '48px 1fr 88px'"] {
            grid-template-columns: 36px 1fr 72px !important;
          }
        }

        /* ── Footer add button ── */
        .ex-table-footer { flex-wrap: wrap !important; }
        @media (max-width: 480px) {
          .ex-table-footer { padding: 10px 12px !important; gap: 8px !important; }
          .ex-table-footer .add-btn { width: 100% !important; }
        }

        /* ── Notif section ── */
        @media (max-width: 520px) {
          .admin-outer textarea { font-size: 0.85rem !important; }
        }

        /* ── Add week button ── */
        @media (max-width: 480px) {
          .admin-outer button[style*="DODAJ TJEDAN"] { font-size: 0.6rem !important; padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}