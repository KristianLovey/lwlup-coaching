'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, Plus, Check, FolderOpen, ChevronDown, X, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Block, BlockSummary, Week, Exercise, WorkoutExercise, Workout } from './types'
import { AppNav, EditableField, CompetitionBanner, WeekPanel } from './training-components'
import { HubTab } from './training-hub'
import { MeetDayTab } from './training-meet'

const supabase = createClient()

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function TrainingPage() {
  const [block, setBlock] = useState<Block | null>(null)
  const [allBlocks, setAllBlocks] = useState<BlockSummary[]>([])
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCoach, setIsCoach] = useState(false)
  const [avatarIcon, setAvatarIcon] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'program' | 'hub' | 'meet'>('program')
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const router = useRouter()
  const blockSelectorRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  // Close block selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (blockSelectorRef.current && !blockSelectorRef.current.contains(e.target as Node))
        setShowBlockSelector(false)
    }
    if (showBlockSelector) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBlockSelector])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Nisi prijavljen/a.'); setLoading(false); return }
        setUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('full_name, role, avatar_icon').eq('id', user.id).single()
        setAthleteName(profile?.full_name ?? user.email?.split('@')[0] ?? 'Atleta')
        const role = profile?.role
        setIsAdmin(role === 'admin')
        setIsCoach(role === 'trener')
        setAvatarIcon(profile?.avatar_icon ?? 'barbell')
        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])

        let { data: blockData } = await supabase
          .from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
          .eq('athlete_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
        if (!blockData && role !== 'trener') {
          const today = new Date(); const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
          const { data: nb } = await supabase.from('blocks').insert({ athlete_id: user.id, name: 'Moj program', start_date: today.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0], status: 'active' }).select('*').single()
          blockData = { ...nb, weeks: [] }
        }
        if (blockData?.weeks) {
          blockData.weeks.sort((a: Week, b: Week) => a.week_number - b.week_number)
          blockData.weeks.forEach((w: Week) => {
            w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
            w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
          })
        }
        setBlock(blockData)
        const { data: ab } = await supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', user.id).order('created_at', { ascending: false })
        setAllBlocks((ab ?? []) as BlockSummary[])
      } catch { setError('Greška pri učitavanju.') } finally { setLoading(false) }
    }
    init()
  }, [])

  const effectiveAthleteId = userId

  const addWeek = async () => {
    if (!block || !userId) return; setSaving(true)
    const ew = block.weeks ?? []; const weekNum = ew.length + 1
    const lastEnd = ew.length > 0 ? new Date(ew[ew.length - 1].end_date) : new Date(block.start_date)
    const startDate = new Date(lastEnd); if (ew.length > 0) startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data, error } = await supabase.from('weeks').insert({ block_id: block.id, week_number: weekNum, start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] }).select('*').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...data, workouts: [] }] } : b)
    setSaving(false)
  }

  const addBlock = async (name: string) => {
    if (!userId) return; setSaving(true)
    // Deactivate current block before creating new one
    if (block) {
      await supabase.from('blocks').update({ status: 'planned' }).eq('id', block.id)
      setAllBlocks(bs => bs.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))
    }
    const today = new Date(); const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data } = await supabase.from('blocks').insert({ athlete_id: effectiveAthleteId, name, start_date: today.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0], status: 'active' }).select('id, name, status, start_date, end_date').single()
    if (data) { setAllBlocks(b => [data as BlockSummary, ...b]); await switchBlock(data.id) }
    setSaving(false)
  }

  const switchBlock = async (blockId: string) => {
    setLoading(true)
    // Deactivate the current block
    if (block && block.id !== blockId) {
      await supabase.from('blocks').update({ status: 'planned' }).eq('id', block.id)
      setAllBlocks(bs => bs.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))
    }
    // Activate the new block
    await supabase.from('blocks').update({ status: 'active' }).eq('id', blockId)
    setAllBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'active' } : b))

    const { data } = await supabase.from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))').eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock({ ...data, status: 'active' })
    }
    setShowBlockSelector(false); setLoading(false)
  }

  const deleteWeek = async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
  }

  const copyWeek = async (weekId: string) => {
    if (!block) return; setSaving(true)
    const src = block.weeks?.find(w => w.id === weekId)
    if (!src) { setSaving(false); return }
    const ew = block.weeks ?? []
    const weekNum = ew.length + 1
    const lastEnd = new Date(ew[ew.length - 1].end_date)
    const startDate = new Date(lastEnd); startDate.setDate(lastEnd.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data: newWeek } = await supabase.from('weeks').insert({
      block_id: block.id, week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      notes: src.notes,
    }).select('*').single()
    if (!newWeek) { setSaving(false); return }
    const newWorkouts: Workout[] = []
    for (let i = 0; i < (src.workouts?.length ?? 0); i++) {
      const wo = src.workouts![i]
      const d = new Date(startDate); d.setDate(startDate.getDate() + i)
      const { data: nwo } = await supabase.from('workouts').insert({
        week_id: newWeek.id, athlete_id: effectiveAthleteId,
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
  }

  const copyBlock = async () => {
    if (!block) return
    const name = prompt(`Kopiraj blok "${block.name}" pod nazivom:`)
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data: nb } = await supabase.from('blocks').insert({
      athlete_id: effectiveAthleteId, name: name.trim(),
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
          week_id: nw.id, athlete_id: effectiveAthleteId,
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
    if (!confirm(`Briši blok "${block.name}"? Ova radnja je nepovratna i briše sve tjedne i treninge.`)) return
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

  const updateWeek = async (weekId: string, data: Partial<Week>) => {
    await supabase.from('weeks').update(data).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, ...data } : w) } : b)
  }
  const addWorkout = async (weekId: string) => {
    if (!userId) return; setSaving(true)
    const week = block?.weeks?.find(w => w.id === weekId); if (!week) return
    const nd = week.workouts?.length ?? 0
    const d = new Date(week.start_date); d.setDate(d.getDate() + nd)
    const { data, error } = await supabase.from('workouts').insert({ week_id: weekId, athlete_id: effectiveAthleteId, day_name: `Dan ${nd + 1}`, workout_date: d.toISOString().split('T')[0], completed: false }).select('*').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, workouts: [...(w.workouts ?? []), { ...data, workout_exercises: [] }] } : w) } : b)
    setSaving(false)
  }
  const updateWorkout = async (workoutId: string, data: Partial<Workout>) => {
    await supabase.from('workouts').update(data).eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, ...data } : wo) })) } : b)
  }
  const deleteWorkout = async (workoutId: string) => {
    await supabase.from('workouts').delete().eq('id', workoutId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.filter(wo => wo.id !== workoutId) })) } : b)
  }
  const addExercise = async (workoutId: string, ex: Exercise) => {
    setSaving(true)
    const workout = block?.weeks?.flatMap(w => w.workouts ?? []).find(w => w.id === workoutId)
    const order = (workout?.workout_exercises?.length ?? 0) + 1
    const { data, error } = await supabase.from('workout_exercises').insert({ workout_id: workoutId, exercise_id: ex.id, exercise_order: order, planned_sets: 3, planned_reps: '5' }).select('*, exercise:exercises(*)').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, workout_exercises: [...(wo.workout_exercises ?? []), data] } : wo) })) } : b)
    setSaving(false)
  }
  const LIFTER_FIELDS: (keyof WorkoutExercise)[] = ['actual_sets','actual_reps','actual_weight_kg','actual_rpe','actual_note','completed']

  // ── Notify mentor when lifter saves actual data ─────────────────
  const notifyMentor = async (msg: string) => {
    if (isAdmin || isCoach || !userId) return
    const recipients: string[] = []
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
    admins?.forEach(a => recipients.push(a.id))
    const { data: asgn } = await supabase.from('coach_assignments').select('coach_id').eq('lifter_id', userId).single()
    if (asgn?.coach_id) recipients.push(asgn.coach_id)
    if (!recipients.length) return
    const rows = recipients.map(r => ({ recipient_id: r, sender_id: userId, message: msg, read: false }))
    await supabase.from('notifications').insert(rows)
  }

  const canEdit = false // Admini/treneri editiraju isključivo kroz admin panel

  const updateExercise = async (weId: string, data: Partial<WorkoutExercise>) => {
    const filtered = canEdit
      ? data
      : Object.fromEntries(Object.entries(data).filter(([k]) => LIFTER_FIELDS.includes(k as keyof WorkoutExercise)))
    if (Object.keys(filtered).length === 0) return
    await supabase.from('workout_exercises').update(filtered).eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...filtered } : we) })) })) } : b)
    // Notify if lifter logged actual data
    if (!canEdit && (filtered.actual_weight_kg || filtered.actual_rpe || filtered.completed)) {
      const exerciseName = block?.weeks?.flatMap(w => w.workouts ?? [])
        .flatMap(wo => wo.workout_exercises ?? [])
        .find(we => we.id === weId)?.exercise?.name ?? 'vježba'
      if (filtered.completed) notifyMentor(`${athleteName} je završio/la set — ${exerciseName}`)
      else if (filtered.actual_weight_kg) notifyMentor(`${athleteName} je ulogirao/la ${filtered.actual_weight_kg}kg na ${exerciseName}`)
    }
  }
  const deleteExercise = async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }

  const totalWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).length ?? 0
  const completedWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).filter(w => w.completed).length ?? 0
  const pct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

  return (
    <div style={{ background: '#04040a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── BACKGROUND ── */}
      {/* Base noise texture */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.55,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.09'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px' }} />
      {/* Primary aurora — top left, electric indigo */}
      <div style={{ position: 'fixed', top: '-25vh', left: '-15vw', width: '85vw', height: '85vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 40%, rgba(79,70,229,0.28) 0%, rgba(99,102,241,0.14) 35%, transparent 68%)',
        filter: 'blur(60px)', transform: 'rotate(-15deg)' }} />
      {/* Secondary aurora — bottom right, deep violet */}
      <div style={{ position: 'fixed', bottom: '-20vh', right: '-10vw', width: '70vw', height: '70vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 60%, rgba(109,40,217,0.18) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)',
        filter: 'blur(70px)', transform: 'rotate(10deg)' }} />
      {/* Accent orb — top right, warm red/amber */}
      <div style={{ position: 'fixed', top: '5vh', right: '5vw', width: '55vw', height: '55vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.07) 0%, rgba(220,38,38,0.03) 50%, transparent 70%)',
        filter: 'blur(80px)' }} />
      {/* Center power orb */}
      <div style={{ position: 'fixed', top: '30vh', left: '35vw', width: '50vw', height: '50vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.09) 0%, transparent 65%)',
        filter: 'blur(90px)' }} />
      {/* Top beam — bright horizontal light streak */}
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.65) 25%, rgba(139,92,246,0.85) 50%, rgba(99,102,241,0.65) 75%, transparent 100%)',
        boxShadow: '0 0 50px 10px rgba(99,102,241,0.2)' }} />
      {/* Sharp grid — more visible, with clipping mask */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)' }} />
      {/* Corner vignette — deeper */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.8) 100%)' }} />
      {/* plate.png — bottom left, large, rotated */}
      <div className="bg-decorative" style={{ position: 'fixed', bottom: '-8vh', left: '-8vw', zIndex: 0, pointerEvents: 'none', opacity: 0.07, transform: 'rotate(12deg)', filter: 'blur(1px)' }}>
        <img src="/slike/plate.png" alt="" style={{ width: '380px', height: 'auto' }} />
      </div>
      {/* plate.png — top right, smaller */}
      <div className="bg-decorative" style={{ position: 'fixed', top: '6vh', right: '-6vw', zIndex: 0, pointerEvents: 'none', opacity: 0.05, transform: 'rotate(-18deg)', filter: 'blur(1.5px)' }}>
        <img src="/slike/plate.png" alt="" style={{ width: '260px', height: 'auto' }} />
      </div>
      {/* ipflogo.png — mid left, faded */}
      <div className="bg-decorative" style={{ position: 'fixed', top: '35vh', left: '-2vw', zIndex: 0, pointerEvents: 'none', opacity: 0.04, filter: 'blur(1px) grayscale(1)' }}>
        <img src="/slike/ipflogo.png" alt="" style={{ width: '220px', height: 'auto' }} />
      </div>
      {/* logopng.png — bottom right, very subtle */}
      <div className="bg-decorative" style={{ position: 'fixed', bottom: '6vh', right: '2vw', zIndex: 0, pointerEvents: 'none', opacity: 0.035, filter: 'blur(0.5px) grayscale(1)' }}>
        <img src="/slike/logopng.png" alt="" style={{ width: '180px', height: 'auto' }} />
      </div>

      <AppNav athleteName={athleteName} isAdmin={isAdmin} isCoach={isCoach} onLogout={handleLogout} avatarIcon={avatarIcon} userId={userId ?? undefined} />

      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Header glow strip at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '180px', zIndex: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(56,100,255,0.04) 0%, transparent 100%)' }} />

        <div className='page-header' style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 32px 0', position: 'relative', zIndex: 1 }}>

          {/* Tab switcher */}
          <div className="tab-switcher" style={{ display: 'flex', gap: '3px', marginBottom: '28px', animation: 'fadeUp 0.4s ease', padding: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content', overflowX: 'auto' as const }}>
            {([['program','Program'],['hub','Hub & Alati'],['meet','Meet Day']] as [string,string][]).map(([tab,label])=>(
              <button key={tab} onClick={()=>setActiveTab(tab as 'program'|'hub'|'meet')}
                className={`tab-btn${activeTab===tab ? ' tab-btn-active' : ''}`}
                style={{ padding:'8px 22px', background: activeTab===tab ? 'rgba(99,102,241,0.18)' : 'transparent', border: activeTab===tab ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', borderRadius: '8px', cursor:'pointer', fontSize:'0.75rem', fontFamily:'var(--fm)', fontWeight: activeTab===tab ? 700 : 400, color: activeTab===tab ? '#a5b4fc' : 'rgba(255,255,255,0.4)', transition:'all 0.18s', whiteSpace:'nowrap' as const, letterSpacing: activeTab===tab ? '0.04em' : '0.02em', textTransform: 'uppercase' as const, boxShadow: activeTab===tab ? '0 0 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Page title row — only in program tab */}
          {activeTab === 'program' && <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', gap: '20px', flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.05s both' }}>
            <div>
              <div className="athlete-name-label" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontFamily: 'var(--fm)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '18px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                {loading ? '...' : athleteName}
              </div>
              <h1 className="page-title-h1" style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,4.5vw,3.2rem)', fontWeight: 900, lineHeight: 0.9, margin: 0, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 60%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {loading ? 'Učitavanje…' : (block?.name ?? 'Moj program')}
              </h1>
            </div>

            {/* Stats row */}
            {!loading && block && (
              <div className="stats-row" style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                {[
                  { val: block.weeks?.length ?? 0, label: 'TJEDANA' },
                  { val: totalWorkouts, label: 'TRENINGA' },
                  { val: `${completedWorkouts}/${totalWorkouts}`, label: 'ZAVRŠENO', accent: completedWorkouts > 0 },
                  { val: `${pct}%`, label: 'NAPREDAK', accent: pct > 50 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '14px 20px', background: '#060610', textAlign: 'center', minWidth: '80px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.7rem', fontWeight: 800, lineHeight: 1, color: s.accent ? '#4ade80' : '#f0f0f8', letterSpacing: '-0.02em' }}>{s.val}</div>
                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.18em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {/* Block selector bar — only in program tab */}
          {activeTab === 'program' && <>
          {!loading && block && (
            <div style={{ position: 'relative', marginBottom: '24px' }} ref={blockSelectorRef}>
              <div className="block-bar" style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>

                {/* Block switcher */}
                <button onClick={() => setShowBlockSelector(!showBlockSelector)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: showBlockSelector ? '#111113' : 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', flex: 1, textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!showBlockSelector) e.currentTarget.style.background = '#111113' }}
                  onMouseLeave={e => { if (!showBlockSelector) e.currentTarget.style.background = 'transparent' }}>
                  <FolderOpen size={14} color="#555" />
                  <div>
                    <div style={{ fontSize: '0.5rem', letterSpacing: '0.35em', color: '#888', marginBottom: '2px' }}>AKTIVNI BLOK</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0' }}>{block.name}</div>
                  </div>
                  <ChevronDown size={12} color="#444" style={{ marginLeft: 'auto', transform: showBlockSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Name edit */}
                <div className="block-bar-name" style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: '#888', flexShrink: 0 }}>NAZIV</div>
                  <EditableField value={block.name} placeholder="Naziv programa"
                    onSave={async v => {
                      await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                      setBlock(b => b ? { ...b, name: v } : b)
                      setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2) as BlockSummary[])
                    }} />
                </div>

                {/* New block / Copy block */}
                {canEdit && (
                  <>
                    <button onClick={async () => { const n = prompt('Naziv novog bloka:'); if (n?.trim()) await addBlock(n.trim()) }}
                      className="action-btn" style={{ padding: '0 16px', borderRadius: 0 }}>
                      <Plus size={12} /> NOVI BLOK
                    </button>
                    <button onClick={copyBlock}
                      className="action-btn" style={{ padding: '0 16px', borderRadius: 0 }}>
                      <Copy size={12} /> KOPIRAJ BLOK
                    </button>
                    <button onClick={deleteBlock}
                      className="action-btn" style={{ padding: '0 16px', borderRadius: 0, color: 'rgba(239,68,68,0.6)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.6)'}>
                      BRIŠI BLOK
                    </button>
                  </>
                )}

                {saving && (
                  <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.09)' }}>
                    <Loader2 size={13} color="#555" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>

              {/* Block dropdown — solid, no transparency */}
              {showBlockSelector && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#09090e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)', maxHeight: '280px', overflowY: 'auto', animation: 'dropDown 0.18s ease' }}>
                  {allBlocks.map((b: BlockSummary) => (
                    <button key={b.id} onClick={() => switchBlock(b.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: b.id === block.id ? '#111113' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'left', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#111113'}
                      onMouseLeave={e => e.currentTarget.style.background = b.id === block.id ? '#111113' : 'transparent'}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.status === 'active' ? '#22c55e' : b.status === 'completed' ? '#60a5fa' : '#333', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#e0e0e0' }}>{b.name}</div>
                        <div style={{ fontSize: '0.56rem', color: '#444', marginTop: '1px' }}>{b.start_date} — {b.end_date}</div>
                      </div>
                      {b.id === block.id && <Check size={12} color="#22c55e" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </>}
        </div>

        {/* ─── CONTENT ─────────────────────────────────────────── */}
        <div className='page-content' style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 80px' }}>
          {/* Hub tab */}
          {activeTab === 'hub' && <HubTab athleteName={athleteName} userId={userId ?? undefined} />}
          {/* Meet day tab */}
          {activeTab === 'meet' && userId && <MeetDayTab userId={userId} isAdmin={isAdmin} />}
          {activeTab === 'program' && <>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '80px 0', color: '#444' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.78rem', letterSpacing: '0.2em' }}>UČITAVANJE...</span>
            </div>
          )}
          {error && (
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #1a0808, #120608)', border: '1px solid rgba(239,68,68,0.2)', color: '#ff7070', fontSize: '0.84rem', borderRadius: '10px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(239,68,68,0.08)' }}>{error}</div>
          )}
          {!loading && block && (
            <>
              {/* Competition countdown banner */}
              {userId && <CompetitionBanner userId={userId} />}

              {/* Admin/trener info banner */}
              {(isAdmin || isCoach) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', marginBottom: '20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Gledaš trening kao lifter. Za uređivanje programa idi na
                  </span>
                  <a href="/admin" style={{ fontSize: '0.62rem', color: '#fbbf24', fontFamily: 'var(--fm)', fontWeight: 800, letterSpacing: '0.08em', textDecoration: 'none', borderBottom: '1px solid rgba(251,191,36,0.4)', paddingBottom: '1px' }}>
                    ADMIN PANEL →
                  </a>
                </div>
              )}

              {(block.weeks?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', marginBottom: '14px', opacity: 0.3 }}>—</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '28px' }}>PROGRAM JE PRAZAN</div>
                </div>
              )}
              {block.weeks?.map(week => (
                <WeekPanel key={week.id} week={week} exercises={exercises} isAdmin={canEdit} userId={userId ?? ''}
                  onDeleteWeek={deleteWeek} onCopyWeek={copyWeek} onUpdateWeek={updateWeek} onAddWorkout={addWorkout}
                  onUpdateWorkout={updateWorkout} onDeleteWorkout={deleteWorkout}
                  onAddExercise={addExercise} onUpdateExercise={updateExercise} onDeleteExercise={deleteExercise} />
              ))}
              {canEdit && (
                <button onClick={addWeek} className="add-week-btn">
                  <Plus size={13} /> DODAJ TJEDAN {block.weeks ? block.weeks.length + 1 : 1}
                </button>
              )}
            </>
          )}
          </>}
        </div>
      </div>

      <style>{`
        /* ── Keyframes ── */
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }
        @keyframes spin     { to { transform:rotate(360deg) } }

        /* ── Nav menu items ── */
        .nav-menu-item {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:9px 10px; background:transparent; border:none;
          cursor:pointer; color:#999; font-size:0.82rem;
          font-family:var(--fm); transition:all 0.15s; text-align:left;
          border-radius:6px;
        }
        .nav-menu-item:hover { background:#161618; color:#e0e0e0; }
        .nav-menu-admin:hover { color:#f59e0b !important; }
        .nav-menu-logout { color:#666; }
        .nav-menu-logout:hover { background:#1a0a0a !important; color:#ff7070 !important; }

        /* ── Category buttons in picker ── */
        .cat-btn {
          padding:4px 12px; font-size:0.62rem; letter-spacing:0.12em;
          font-weight:600; cursor:pointer; transition:all 0.15s;
          font-family:var(--fm); background:transparent;
          color:#555; border:1px solid rgba(255,255,255,0.1); border-radius:5px;
        }
        .cat-btn:hover { border-color:rgba(255,255,255,0.3); color:#aaa; }
        .cat-btn-active { background:#e0e0e0 !important; color:#000 !important; border-color:#e0e0e0 !important; }

        /* ── Icon danger button ── */
        .icon-btn-danger {
          background:transparent; border:none; cursor:pointer;
          color:#555; padding:4px; display:flex; align-items:center;
          justify-content:center; transition:color 0.15s; border-radius:4px;
        }
        .icon-btn-danger:hover { color:#ef4444; background:#1a0a0a; }

        /* ── Done badge ── */
        .done-badge {
          display:flex; align-items:center; gap:6px;
          padding:6px 12px; border:1px solid rgba(255,255,255,0.12);
          cursor:pointer; transition:all 0.2s; border-radius:6px;
          background:rgba(255,255,255,0.04);
        }
        .done-badge span { font-size:0.54rem; letter-spacing:0.2em; color:#555; font-family:var(--fm); font-weight:800; }
        .done-badge:hover { border-color:rgba(255,255,255,0.28); background:rgba(255,255,255,0.07); }
        .done-badge-active { border-color:rgba(34,197,94,0.45) !important; background:rgba(34,197,94,0.1) !important; box-shadow:0 0 18px rgba(34,197,94,0.15) !important; }
        .done-badge-active span { color:#4ade80 !important; }

        /* ── Add buttons ── */
        .add-btn {
          width:100%; padding:10px; background:rgba(99,102,241,0.04);
          border:1px dashed rgba(99,102,241,0.2); color:rgba(129,140,248,0.5); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          gap:7px; font-size:0.6rem; letter-spacing:0.22em;
          font-family:var(--fm); font-weight:700; transition:all 0.2s; border-radius:6px;
        }
        .add-btn:hover { border-color:rgba(99,102,241,0.55); color:#818cf8; background:rgba(99,102,241,0.09); }

        .add-week-btn {
          width:100%; padding:18px; background:rgba(99,102,241,0.03);
          border:1px dashed rgba(99,102,241,0.18); color:rgba(129,140,248,0.4); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          gap:10px; font-size:0.66rem; letter-spacing:0.3em;
          font-family:var(--fm); font-weight:800; transition:all 0.2s;
          border-radius:8px; margin-top:8px;
        }
        .add-week-btn:hover { border-color:rgba(99,102,241,0.5); color:#818cf8; background:rgba(99,102,241,0.08); }

        /* ── Action btn ── */
        .action-btn {
          display:flex; align-items:center; gap:7px;
          background:transparent; border:none; border-left:1px solid rgba(255,255,255,0.08);
          color:#555; cursor:pointer; font-size:0.58rem; letter-spacing:0.2em;
          font-family:var(--fm); font-weight:800; transition:all 0.15s; white-space:nowrap;
        }
        .action-btn:hover { color:#c7d2fe; background:rgba(99,102,241,0.08); }

        /* ── Workout card hover ── */
        .workout-card:hover {
          border-color: rgba(99,102,241,0.3) !important;
          box-shadow: 0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1) !important;
        }

        /* ── Exercise row table ── */
        /* ── Base resets ── */
        .ex-row-wrap { border-bottom: none; }
        .ex-row-main { transition: background 0.12s; }
        .ex-row-main:hover { background: #0e0e18; }

        /* ── Week panel hover ── */
        div[class=""] div:hover > div[style*="borderRadius: \'12px\'"] {
          border-color: rgba(255,255,255,0.1);
        }

        /* ── Stat pills glow on hover ── */
        div[style*="minWidth: \'72px\'"] {
          transition: box-shadow 0.2s, transform 0.2s;
        }
        div[style*="minWidth: \'72px\'"]:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(56,100,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08) !important;
          transform: translateY(-1px);
        }

        /* ── Completed stripe glow ── */
        .workout-card .completed-stripe-active {
          box-shadow: 0 0 12px rgba(34,197,94,0.4);
        }

        /* ── Done badge active glow ── */
        .done-badge-active {
          box-shadow: 0 0 16px rgba(34,197,94,0.15) !important;
        }

        /* ── Buttons ── */
        .add-week-btn:hover {
          border-color: rgba(255,255,255,0.15) !important;
          color: #ddd !important;
          background: rgba(255,255,255,0.05) !important;
        }
        .add-btn, .action-btn {
          font-size: 0.65rem !important;
          letter-spacing: 0.06em !important;
        }

        /* ── Nav menu items — Apple style ── */
        .nav-menu-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; background: transparent; border: none;
          color: rgba(255,255,255,0.7); font-size: 0.82rem; font-family: var(--fm);
          font-weight: 450; cursor: pointer; border-radius: 9px;
          transition: background 0.15s, color 0.15s; text-align: left; letter-spacing: 0.01em;
        }
        .nav-menu-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .nav-menu-admin:hover { background: rgba(245,158,11,0.08) !important; }
        .nav-menu-logout { color: rgba(255,80,80,0.7) !important; }
        .nav-menu-logout:hover { background: rgba(255,60,60,0.08) !important; color: #ff6060 !important; }

        /* ── Nav pills ── */
        .tnav-pill { display: flex; align-items: center; }

        /* ── Status pill hide on small screens ── */
        @media (max-width: 640px) { .tnav-status { display: none !important; } }
        @media (max-width: 520px) { .tnav-name { display: none !important; } }

        /* ── Animations ── */
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes pingPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }

        /* ── Nav responsive ── */
        @media (max-width: 680px) {
          .tnav-links a { padding: 6px 10px !important; font-size: 0.7rem !important; }
        }
        @media (max-width: 480px) {
          .tnav-links { display: none !important; }
        }

        /* ══ MOBILE ══════════════════════════════════════════════ */

        /* ─ Header + content padding ─ */
        @media (max-width: 768px) {
          .page-header  { padding: 14px 16px 0 !important; }
          .page-content { padding: 0 16px 100px !important; }
        }

        /* ─ Hide decorative background images on mobile ─ */
        @media (max-width: 768px) {
          .bg-decorative { display: none !important; }
        }

        /* ─ Tab switcher → fixed bottom navigation bar ─ */
        @media (max-width: 768px) {
          .tab-switcher {
            position: fixed !important;
            bottom: 0 !important; left: 0 !important; right: 0 !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; padding: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
            background: rgba(4,4,10,0.96) !important;
            backdrop-filter: blur(28px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
            z-index: 999 !important;
            gap: 0 !important;
            overflow: visible !important;
            height: 64px !important;
            align-items: stretch !important;
            animation: none !important;
            box-shadow: 0 -1px 0 rgba(255,255,255,0.06), 0 -12px 40px rgba(0,0,0,0.6) !important;
          }
          .tab-btn {
            flex: 1 !important;
            border-radius: 0 !important;
            border: none !important;
            border-top: 2px solid transparent !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 8px 4px 12px !important;
            font-size: 0.55rem !important;
            letter-spacing: 0.08em !important;
            color: rgba(255,255,255,0.38) !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            transition: color 0.15s, border-color 0.15s !important;
          }
          .tab-btn-active {
            border-top-color: #818cf8 !important;
            color: #a5b4fc !important;
            background: rgba(99,102,241,0.06) !important;
            font-weight: 700 !important;
          }
        }

        /* ─ Block selector bar: stack vertically on mobile ─ */
        @media (max-width: 640px) {
          .block-bar { flex-direction: column !important; border-radius: 14px !important; }
          .block-bar > * { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; width: 100% !important; min-width: 0 !important; padding: 14px 16px !important; box-sizing: border-box !important; }
          .block-bar > *:last-child { border-bottom: none !important; }
          .action-btn { padding: 14px 16px !important; font-size: 0.68rem !important; letter-spacing: 0.1em !important; justify-content: flex-start !important; min-height: 48px !important; border-left: none !important; }
        }

        /* ─ Title row + header: compact on mobile ─ */
        @media (max-width: 640px) {
          .page-header { padding: 22px 16px 0 !important; }
          .page-title-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; margin-bottom: 12px !important; }
          .page-title-h1 { font-size: 1.7rem !important; margin-bottom: 0 !important; }
          .athlete-name-label { display: none !important; }
        }

        /* ─ Stats: compact single row on mobile ─ */
        @media (max-width: 640px) {
          .stats-row {
            display: flex !important;
            width: 100% !important; gap: 0 !important;
            grid-template-columns: unset !important;
          }
          .stats-row > div { flex: 1 !important; min-width: 0 !important; padding: 10px 6px !important; border-right: 1px solid rgba(255,255,255,0.07) !important; border-bottom: none !important; }
          .stats-row > div:nth-child(4) { border-right: none !important; }
          .stats-row > div > div:first-child { font-size: 1.25rem !important; }
          .stats-row > div > div:last-child { font-size: 0.42rem !important; margin-top: 2px !important; letter-spacing: 0.12em !important; }
        }

        /* ─ Block bar: only show switcher on mobile ─ */
        @media (max-width: 640px) {
          .block-bar-name { display: none !important; }
          .block-bar .action-btn { display: none !important; }
          /* Remove divider since only the switcher button is visible */
          .block-bar > * { border-bottom: none !important; }
        }

        /* ─ Week header: compact on mobile ─ */
        @media (max-width: 640px) {
          .week-w-num { font-size: 1.8rem !important; }
          .week-header-top { padding: 12px 16px 0 !important; }
          .week-date-range { display: none !important; }
        }

        /* ─ Day grid: scroll horizontally on mobile ─ */
        @media (max-width: 640px) {
          .day-grid { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .day-grid > div { min-width: 100px !important; }
        }

        /* ─ Workout card header: stack on very small ─ */
        @media (max-width: 500px) {
          .workout-header-inner { flex-wrap: wrap !important; gap: 8px !important; padding: 12px 14px !important; }
          .workout-controls { width: 100% !important; justify-content: flex-end !important; }
        }

        /* ─ Exercise rows: teal left accent — signals exercise level in hierarchy ─ */
        .ex-row-wrap { border-left: 2px solid rgba(20,184,166,0.18); }
        .ex-row-main:hover ~ * .ex-row-wrap, .ex-row-wrap:hover { border-left-color: rgba(20,184,166,0.35); }

        /* ─ Block bar: bigger touch target for switcher ─ */
        @media (max-width: 640px) {
          .block-bar > button:first-child { min-height: 56px !important; }
        }

        /* ─ Competition banner: better mobile layout ─ */
        @media (max-width: 500px) {
          .comp-days-pill { min-width: 70px !important; padding: 0 16px !important; }
          .comp-days-num { font-size: 1.6rem !important; }
        }

        /* ─ Hide default number input spinners (use custom StepInput instead) ─ */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        /* ─ Set log (lifter, 5 cols: 52px 1fr 1fr 88px 48px): tighten on mobile ─ */
        @media (max-width: 480px) {
          .set-log-header, .set-log-row {
            grid-template-columns: 44px 1fr 1fr 64px 36px !important;
          }
        }
        @media (max-width: 360px) {
          /* Hide REPS col on very small screens, keep KG */
          .set-log-header > *:nth-child(3),
          .set-log-row    > *:nth-child(3) { display: none !important; }
          .set-log-header, .set-log-row    { grid-template-columns: 44px 1fr 64px 36px !important; }
        }

        /* ─ Table footer: stack on mobile ─ */
        @media (max-width: 480px) {
          .ex-table-footer { flex-direction: column !important; gap: 8px !important; }
          .ex-table-footer > * { border-left: none !important; padding-left: 0 !important; }
        }

        /* ─ Navbar: hide "POČETNA" text on small screens ─ */
        @media (max-width: 480px) {
          .nav-home-text { display: none !important; }
          .nav-center-label { font-size: 0.6rem !important; letter-spacing: 0.15em !important; }
        }

        /* ─ Profile dropdown: right-aligned on mobile ─ */
        @media (max-width: 480px) {
          .profile-dropdown { width: min(220px, calc(100vw - 32px)) !important; right: 0 !important; }
          .tnav-right { margin-left: auto; }
        }

        /* ─ Title heading: smaller on mobile ─ */
        @media (max-width: 480px) {
          .page-title { font-size: 1.8rem !important; }
        }

        /* ─ GL calc: 3 lift inputs stack on small mobile ─ */
        @media (max-width: 480px) {
          .gl-lifts-grid { grid-template-columns: 1fr !important; }
          .gl-total-grid { grid-template-columns: repeat(2,1fr) !important; }
        }

        /* ─ Hub tool grid: 1 col on very small ─ */
        @media (max-width: 400px) {
          .hub-tools-grid { grid-template-columns: 1fr !important; }
        }

        /* ─ Smooth tab transition ─ */
        .tab-content { animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1); }

        /* ─ Card border glow on touch (active) ─ */
        .workout-card:active { border-color: #2a2a3a !important; }
        .bt-card:active { background: #0d0d0e !important; }
      `}</style>
    </div>
  )
}