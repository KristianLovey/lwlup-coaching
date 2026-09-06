'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Check, FolderOpen, ChevronDown, ChevronRight, X, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Block, BlockSummary, Week, Exercise, WorkoutExercise, Workout } from './types'
import { AppNav, EditableField, CompetitionBanner, WeekPanel } from './training-components'
import { totalTonnage } from './training-setplan'
import { HubTab } from './training-hub'
import { MeetDayTab } from './training-meet'
import { LiftPriorityView } from './training-priority'
import { cacheSet, meetKeys } from '@/lib/meetCache'

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
  const [userRole, setUserRole] = useState<'admin' | 'trener' | undefined>(undefined)
  const [avatarIcon, setAvatarIcon] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'program' | 'hub' | 'meet'>('program')
  const [navOpen, setNavOpen] = useState(false)
  const [heroOpen, setHeroOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('training:activeTab') as 'program' | 'hub' | 'meet' | null
    if (saved && ['program', 'hub', 'meet'].includes(saved)) setActiveTab(saved)
  }, [])
  useEffect(() => { localStorage.setItem('training:activeTab', activeTab) }, [activeTab])
  const router = useRouter()
  const blockSelectorRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

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
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid) { setError('Nisi prijavljen/a.'); setLoading(false); return }
        setUserId(uid)

        // Prefetch Meet Day data in background so the tab opens instantly
        Promise.all([
          supabase.from('competitions').select('id,name,date,location,status').order('date', { ascending: false }),
          supabase.from('meet_attempts').select('*').eq('athlete_id', uid).order('created_at', { ascending: false }),
          supabase.from('lifters').select('body_weight, sex').eq('id', uid).single(),
        ]).then(([comps, atts, prof]) => {
          if (comps.data)  cacheSet(meetKeys.competitions(),  comps.data, 5 * 60_000)
          if (atts.data)   cacheSet(meetKeys.attempts(uid),   atts.data,  30_000)
          if (prof.data)   cacheSet(meetKeys.profile(uid),    prof.data,  2 * 60_000)
        })

        const CACHE_KEY = `lwl:training:${uid}`
        try {
          const raw = localStorage.getItem(CACHE_KEY)
          if (raw) {
            const c = JSON.parse(raw)
            setBlock(c.block)
            setExercises(c.exercises ?? [])
            setAllBlocks(c.allBlocks ?? [])
            setAthleteName(c.athleteName ?? '')
            setIsAdmin(c.isAdmin ?? false)
            setIsCoach(c.isCoach ?? false)
            if (c.userRole) setUserRole(c.userRole)
            setAvatarIcon(c.avatarIcon ?? 'barbell')
            setLoading(false)
          }
        } catch { /* corrupt cache */ }

        const [
          { data: profile },
          { data: exData },
          { data: rawBlock },
          { data: ab },
        ] = await Promise.all([
          supabase.from('lifters').select('full_name, role, avatar_icon').eq('id', uid).single(),
          supabase.from('exercises').select('id, name, category, notes').order('category').order('name'),
          supabase.from('blocks')
            .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(id, name, category, notes))))')
            .eq('athlete_id', uid).eq('status', 'active')
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('blocks').select('id, name, status, start_date, end_date')
            .eq('athlete_id', uid).order('created_at', { ascending: false }),
        ])

        const role = profile?.role
        const athleteNameVal = profile?.full_name ?? session.user.email?.split('@')[0] ?? 'Atleta'
        const isAdminVal = role === 'admin' || role === 'trener'
        const isCoachVal = role === 'trener'
        setAthleteName(athleteNameVal)
        setIsAdmin(isAdminVal)
        setIsCoach(isCoachVal)
        if (role === 'admin' || role === 'trener') setUserRole(role as 'admin' | 'trener')
        setAvatarIcon(profile?.avatar_icon ?? 'barbell')
        setExercises(exData ?? [])
        setAllBlocks((ab ?? []) as BlockSummary[])

        // Fallback: nema bloka sa statusom 'active' (npr. plan kopiran iz predloška ostaje
        // 'planned') → prikaži najnoviji blok koji lifter ima, da uvijek nešto vidi.
        let blockData = rawBlock
        if (!blockData && (ab?.length ?? 0) > 0) {
          const { data: fb } = await supabase.from('blocks')
            .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(id, name, category, notes))))')
            .eq('id', (ab as BlockSummary[])[0].id).maybeSingle()
          blockData = fb
        }
        if (blockData?.weeks) {
          blockData.weeks.sort((a: Week, b: Week) => a.week_number - b.week_number)
          blockData.weeks.forEach((w: Week) => {
            w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
            w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
          })
        }

        setBlock(blockData)
        setLoading(false)

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            block: blockData, exercises: exData, allBlocks: ab,
            athleteName: athleteNameVal, isAdmin: isAdminVal, isCoach: isCoachVal,
            userRole: isAdminVal ? role : undefined, avatarIcon: profile?.avatar_icon ?? 'barbell',
          }))
        } catch { /* storage quota */ }

        if (blockData?.weeks) {
          injectSetProgress(blockData, uid).then(injected => setBlock(injected))
        }
      } catch { setError('Greška pri učitavanju.') } finally { setLoading(false) }
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`we-sync-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workout_exercises' }, (payload) => {
        const updated = payload.new as WorkoutExercise
        setBlock(b => {
          if (!b) return b
          const inBlock = b.weeks?.some(w => w.workouts?.some(wo => wo.workout_exercises?.some(we => we.id === updated.id)))
          if (!inBlock) return b
          return {
            ...b,
            weeks: b.weeks?.map(w => ({
              ...w,
              workouts: w.workouts?.map(wo => ({
                ...wo,
                workout_exercises: wo.workout_exercises?.map(we =>
                  we.id === updated.id ? { ...we, ...updated, exercise: we.exercise } : we
                ),
              })),
            })),
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const effectiveAthleteId = userId

  const injectSetProgress = async (blockData: Block, uid: string) => {
    const allWeIds = (blockData.weeks ?? []).flatMap((w: Week) =>
      (w.workouts ?? []).flatMap((wo: Workout) => (wo.workout_exercises ?? []).map((we: WorkoutExercise) => we.id))
    )
    if (allWeIds.length === 0) return blockData
    const { data: setLogs } = await supabase
      .from('set_logs')
      .select('workout_exercise_id, weight_kg, reps, completed')
      .eq('athlete_id', uid)
      .in('workout_exercise_id', allWeIds)
    if (!setLogs) return blockData
    const byWeId: Record<string, typeof setLogs> = {}
    for (const sl of setLogs) {
      if (!byWeId[sl.workout_exercise_id]) byWeId[sl.workout_exercise_id] = []
      byWeId[sl.workout_exercise_id].push(sl)
    }
    blockData.weeks?.forEach((w: Week) => {
      w.workouts?.forEach((wo: Workout) => {
        wo.workout_exercises?.forEach((we: WorkoutExercise) => {
          const logs = byWeId[we.id] ?? []
          we._totalSets = Math.max(logs.length, we.planned_sets ?? 0)
          we._completedSets = logs.filter((l: any) => l.completed).length
          we._tonnage = totalTonnage(logs)
        })
      })
    })
    return blockData
  }

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
    if (block && block.id !== blockId) {
      await supabase.from('blocks').update({ status: 'planned' }).eq('id', block.id)
      setAllBlocks(bs => bs.map(b => b.id === block.id ? { ...b, status: 'planned' } : b))
    }
    await supabase.from('blocks').update({ status: 'active' }).eq('id', blockId)
    setAllBlocks(bs => bs.map(b => b.id === blockId ? { ...b, status: 'active' } : b))

    const { data } = await supabase.from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))').eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      const injected = userId ? await injectSetProgress({ ...data, status: 'active' }, userId) : { ...data, status: 'active' }
      setBlock(injected)
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

  const updateWeek = useCallback(async (weekId: string, data: Partial<Week>) => {
    await supabase.from('weeks').update(data).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, ...data } : w) } : b)
  }, [])
  const addWorkout = useCallback(async (weekId: string) => {
    if (!userId) return; setSaving(true)
    let week: Week | undefined
    setBlock(b => { week = b?.weeks?.find(w => w.id === weekId); return b })
    if (!week) { setSaving(false); return }
    const nd = week.workouts?.length ?? 0
    const d = new Date(week.start_date); d.setDate(d.getDate() + nd)
    const { data, error } = await supabase.from('workouts').insert({ week_id: weekId, athlete_id: userId, day_name: `Dan ${nd + 1}`, workout_date: d.toISOString().split('T')[0], completed: false }).select('*').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, workouts: [...(w.workouts ?? []), { ...data, workout_exercises: [] }] } : w) } : b)
    setSaving(false)
  }, [userId])
  const updateWorkout = useCallback(async (workoutId: string, data: Partial<Workout>) => {
    // completion_date is entered manually in the day footer — no longer auto-stamped on complete
    const payload: Partial<Workout> = { ...data }
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, ...payload } : wo) })) } : b)
    await supabase.from('workouts').update(payload).eq('id', workoutId)
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
    const { data, error } = await supabase.from('workout_exercises').insert({ workout_id: workoutId, exercise_id: ex.id, exercise_order: order, planned_sets: 3, planned_reps: '5' }).select('*, exercise:exercises(*)').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, workout_exercises: [...(wo.workout_exercises ?? []), data] } : wo) })) } : b)
    setSaving(false)
  }, [])
  const LIFTER_FIELDS: (keyof WorkoutExercise)[] = ['actual_sets','actual_reps','actual_weight_kg','actual_rpe','actual_note','completed','_completedSets','_totalSets','_tonnage']

  const canEdit = false // Admini/treneri editiraju isključivo kroz admin panel

  const RUNTIME_ONLY = ['_completedSets', '_totalSets', '_tonnage']
  const updateExercise = useCallback(async (weId: string, data: Partial<WorkoutExercise>) => {
    const filtered = canEdit
      ? data
      : Object.fromEntries(Object.entries(data).filter(([k]) => LIFTER_FIELDS.includes(k as keyof WorkoutExercise)))
    if (Object.keys(filtered).length === 0) return
    const forDb = Object.fromEntries(Object.entries(filtered).filter(([k]) => !RUNTIME_ONLY.includes(k)))
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...filtered } : we) })) })) } : b)
    if (Object.keys(forDb).length > 0) await supabase.from('workout_exercises').update(forDb).eq('id', weId)
  }, [canEdit])
  const deleteExercise = useCallback(async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }, [])

  const { totalWorkouts, completedWorkouts, totalSets, doneSets, pct } = useMemo(() => {
    const allWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []) ?? []
    const totalWorkouts = allWorkouts.length
    const completedWorkouts = allWorkouts.filter(w => w.completed).length
    const allExercises = allWorkouts.flatMap(wo => wo.workout_exercises ?? [])
    const totalSets = allExercises.reduce((s, e) => s + (e._totalSets ?? e.planned_sets ?? 0), 0)
    const doneSets = allExercises.reduce((s, e) => {
      const fromLogs = e._completedSets ?? 0
      const fromCompleted = e.completed ? (e._totalSets ?? e.planned_sets ?? 0) : 0
      return s + Math.max(fromLogs, fromCompleted)
    }, 0)
    const pct = totalSets > 0
      ? Math.round((doneSets / totalSets) * 100)
      : totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0
    return { totalWorkouts, completedWorkouts, totalSets, doneSets, pct }
  }, [block])

  return (
    <div style={{ background: 'var(--t-bg)', color: '#f0f0f0', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── GRAIN ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.22, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
      <div style={{ position: 'fixed', top: '-20vh', right: '-10vw', width: '55vw', height: '55vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 70% 30%, rgba(239,53,53,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />

      <AppNav athleteName={athleteName} isAdmin={isAdmin} role={userRole} onLogout={handleLogout} avatarIcon={avatarIcon} userId={userId ?? undefined} />

      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1 }}>
        <div className='page-header' style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px 0', position: 'relative', zIndex: 1 }}>

          {/* ── TAB SWITCHER ── */}
          <div className="tab-switcher" style={{ display: 'flex', gap: '4px', marginBottom: '32px', padding: '5px', background: 'var(--t-s3)', borderRadius: '999px', border: '1px solid var(--t-border-hi)', width: 'fit-content', overflowX: 'auto' as const }}>
            {([['program','Program'],['hub','Hub i Alati'],['meet','Meet Day']] as [string,string][]).map(([tab,label]) => (
              <button key={tab} onClick={() => setActiveTab(tab as 'program'|'hub'|'meet')}
                style={{ padding: '9px 22px', background: activeTab === tab ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '999px', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--fm)', fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#090909' : 'rgba(255,255,255,0.65)', transition: 'all 0.18s', whiteSpace: 'nowrap' as const, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── PROGRAM TAB ── */}
          {activeTab === 'program' && (<>

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '100px 0', color: 'rgba(255,255,255,0.2)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: '14px 18px', background: 'rgba(239,53,53,0.06)', border: '1px solid rgba(239,53,53,0.18)', color: '#ff8080', fontSize: '0.84rem', borderRadius: '10px', marginBottom: '24px' }}>{error}</div>
            )}

            {/* No block */}
            {!loading && !block && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '14px' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', opacity: 0.1, lineHeight: 1 }}>—</div>
                {allBlocks.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.68rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>ODABERI SVOJ BLOK</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', textAlign: 'center', maxWidth: '320px', lineHeight: 1.6, marginBottom: '6px' }}>
                      Klikni blok koji želiš trenirati.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
                      {allBlocks.map((b: BlockSummary) => (
                        <button key={b.id} onClick={() => switchBlock(b.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '14px', background: 'var(--t-s1)', border: '1px solid var(--t-border)', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.28)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
                          <FolderOpen size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e8e8e8', fontFamily: 'var(--fd)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{b.name}</div>
                            <div style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', letterSpacing: '0.08em', marginTop: '2px' }}>{b.status === 'active' ? 'AKTIVAN' : b.status === 'completed' ? 'ZAVRŠEN' : 'PLANIRAN'}</div>
                          </div>
                          <ChevronRight size={15} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '0.68rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--fm)', fontWeight: 700 }}>NEMA AKTIVNOG PROGRAMA</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--fm)', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
                      Tvoj trener još nije kreirao program. Javi se treneru za više informacija.
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading && block && (<>

              {/* ── HERO TOGGLE BUTTON ── */}
              <button
                onClick={() => setHeroOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 18px 8px 14px', borderRadius: '999px', border: '1px solid var(--t-border-hi)', background: 'var(--t-s3)', cursor: 'pointer', marginBottom: heroOpen ? '20px' : '28px', transition: 'all 0.2s', width: 'fit-content' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef3535', boxShadow: '0 0 8px rgba(239,53,53,0.5)', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--fm)', fontSize: '0.66rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' as const }}>
                  {athleteName.toUpperCase()} · {pct}% · {block.name}
                </span>
                <ChevronDown size={12} color="rgba(255,255,255,0.25)" style={{ marginLeft: '4px', transform: heroOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
              </button>

              {/* ── HERO SECTION (collapsible) ── */}
              {heroOpen && (
                <div style={{ animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

                  {/* Row 1: Name card + Stats grid */}
                  <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '12px', marginBottom: '12px' }}>

                    {/* Name card */}
                    <div style={{ padding: '36px 36px 28px', borderRadius: '24px', background: 'var(--t-s1)', border: '1px solid var(--t-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,53,53,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                      <div style={{ fontSize: '0.56rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '20px', height: '1.5px', background: '#ef3535', borderRadius: '2px', flexShrink: 0 }} />
                        SPORTAŠ · AKTIVAN
                      </div>
                      <h1 style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 'clamp(40px, 4.5vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.04em', margin: '20px 0 0', color: '#f0f0f0' }}>
                        {athleteName.split(' ')[0] || athleteName}
                        {athleteName.split(' ').length > 1 && (
                          <span style={{ display: 'block', color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                            {athleteName.split(' ').slice(1).join(' ')}
                          </span>
                        )}
                      </h1>
                      <div style={{ fontSize: '0.56rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef3535', flexShrink: 0, animation: 'pulse-dot 2s infinite' }} />
                        POWERLIFTER
                      </div>
                    </div>

                    {/* Stats 4-col grid */}
                    <div className="stats-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', borderRadius: '24px', overflow: 'hidden', background: 'var(--t-s3)', border: '1px solid var(--t-border)' }}>
                      {[
                        { num: block.weeks?.length ?? 0, sub: '', label: 'TJEDANA', delta: 'u bloku' },
                        { num: completedWorkouts, sub: `/${totalWorkouts}`, label: 'TRENINGA', delta: `${totalWorkouts - completedWorkouts} preostalo` },
                        { num: doneSets, sub: `/${totalSets}`, label: 'SERIJA', delta: `${pct}% complete` },
                        { num: pct, sub: '%', label: 'NAPREDAK', delta: pct >= 75 ? 'odlično' : pct >= 50 ? 'on track' : 'u tijeku' },
                      ].map((s, i) => (
                        <div key={i}
                          className="stats-item"
                          style={{ background: 'var(--t-s1)', padding: '28px 20px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '190px', transition: 'background 0.2s', cursor: 'default' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#181818'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#111111'}>
                          <div>
                            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: 'clamp(30px, 3vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.04em', color: '#f0f0f0', fontVariantNumeric: 'tabular-nums' }}>
                              {s.num}<span style={{ fontSize: '0.42em', color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{s.sub}</span>
                            </div>
                            <div style={{ fontFamily: 'var(--fm)', fontSize: '0.68rem', color: '#ef3535', marginTop: '8px', letterSpacing: '0.02em' }}>↗ {s.delta}</div>
                          </div>
                          <div style={{ fontFamily: 'var(--fm)', fontSize: '0.54rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' as const }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Block card + Competition countdown */}
                  <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '12px', marginBottom: '28px' }}>

                    {/* Block card */}
                    <div style={{ position: 'relative' }} ref={blockSelectorRef}>
                      <button
                        onClick={() => setShowBlockSelector(!showBlockSelector)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '22px 24px', borderRadius: '20px', background: 'var(--t-s1)', border: '1px solid var(--t-border)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' as const }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--t-s3)', border: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FolderOpen size={16} color="rgba(255,255,255,0.3)" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.46rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--fm)', marginBottom: '3px', textTransform: 'uppercase' as const }}>AKTIVNI BLOK</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e8e8e8', fontFamily: 'var(--fd)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{block.name}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.48rem', fontFamily: 'var(--fm)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.18)' }}>{block.weeks?.length ?? 0} TJ.</span>
                          <ChevronDown size={14} color="rgba(255,255,255,0.18)" style={{ transform: showBlockSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </button>

                      {/* Block name editor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px 0' }}>
                        <span style={{ fontSize: '0.43rem', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--fm)', letterSpacing: '0.2em', flexShrink: 0 }}>NAZIV:</span>
                        <EditableField value={block.name} placeholder="Naziv programa"
                          onSave={async v => {
                            await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                            setBlock(b => b ? { ...b, name: v } : b)
                            setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2) as BlockSummary[])
                          }} />
                        {saving && <Loader2 size={11} color="#444" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                      </div>

                      {/* Block dropdown */}
                      {showBlockSelector && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100, background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', overflow: 'hidden', animation: 'dropDown 0.18s ease', maxHeight: '260px', overflowY: 'auto' }}>
                          {allBlocks.map((b: BlockSummary, i: number) => (
                            <button key={b.id} onClick={() => switchBlock(b.id)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', background: b.id === block.id ? 'var(--t-s3)' : 'transparent', border: 'none', borderBottom: i < allBlocks.length - 1 ? '1px solid var(--t-border)' : 'none', cursor: 'pointer', textAlign: 'left' as const, transition: 'background 0.12s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = b.id === block.id ? 'rgba(255,255,255,0.05)' : 'transparent'}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.status === 'active' ? '#ef3535' : 'var(--t-border-hi)', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#e0e0e0', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{b.name}</div>
                                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>{b.start_date} — {b.end_date}</div>
                              </div>
                              {b.id === block.id && <Check size={12} color="#ef3535" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Competition countdown */}
                    <div>{userId && <CompetitionBanner userId={userId} />}</div>
                  </div>

                  {/* ── PRIORITY TABLE ── */}
                  {userId && block && (
                    <LiftPriorityView athleteId={userId} blockId={block.id} />
                  )}

                </div>
              )}

              {/* ── ADMIN/TRENER BANNER ── */}
              {(isAdmin || isCoach) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 16px', marginBottom: '20px', background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', borderLeft: '3px solid #ef3535', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef3535', flexShrink: 0, boxShadow: '0 0 6px rgba(239,53,53,0.5)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--fm)', fontWeight: 500 }}>
                      {isCoach
                        ? 'Pregledavaš trening kao lifter — uređivanje programa u trener panelu'
                        : 'Pregledavaš trening kao lifter — uređivanje programa u admin panelu'}
                    </span>
                  </div>
                  <a
                    href={isCoach ? '/trainer' : '/admin'}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'var(--t-s3)', border: '1px solid var(--t-border)', borderRadius: '6px', fontSize: '0.58rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.1em', color: '#f0f0f0', textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.12)' }}>
                    {isCoach ? 'TRENER PANEL' : 'ADMIN PANEL'} →
                  </a>
                </div>
              )}

              {/* ── SECTION HEADER ── */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px', padding: '0 2px' }}>
                <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em', color: '#f0f0f0', margin: 0 }}>Trening program</h2>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '0.56rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                  {block.weeks?.length ?? 0} tjedana · {totalSets} serija
                </span>
              </div>

            </>)}
          </>)}

        </div>

        {/* ─── WEEK LIST ─────────────────────────────────────────── */}
        <div className='page-content' style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 80px' }}>
          {activeTab === 'hub' && <HubTab athleteName={athleteName} userId={userId ?? undefined} />}
          {activeTab === 'meet' && userId && <MeetDayTab userId={userId} isAdmin={isAdmin} />}
          {activeTab === 'program' && !loading && block && (
            <div key={block.id} style={{ animation: 'panelSlideIn 0.38s cubic-bezier(0.16,1,0.3,1)' }}>
            {(block.weeks?.length ?? 0) === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.12)' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', marginBottom: '14px', opacity: 0.3 }}>—</div>
                <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>PROGRAM JE PRAZAN</div>
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
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp        { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes panelSlideIn  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dropDown      { from { opacity:0; transform:translateY(-6px) scale(0.98) } to { opacity:1; transform:none } }
        @keyframes spin          { to { transform:rotate(360deg) } }
        @keyframes pulse-dot {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,53,53,0.45); }
          70%      { box-shadow: 0 0 0 8px transparent; }
        }

        .nav-menu-item { width:100%; display:flex; align-items:center; gap:10px; padding:9px 10px; background: transparent; border: none; cursor:pointer; color:#999; font-size:0.82rem; font-family:var(--fm); transition:all 0.15s; text-align:left; border-radius:6px; }
        .nav-menu-item:hover { background: #161618; color:#e0e0e0; }
        .nav-menu-admin:hover { color:#ef4444 !important; }
        .nav-menu-logout { color:#666; }
        .nav-menu-logout:hover { background: #1a0a0a !important; color:#ff7070 !important; }

        .cat-btn { padding:4px 12px; font-size:0.62rem; letter-spacing:0.12em; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:var(--fm); background: transparent; color:#555; border: 1px solid var(--t-border); border-radius:5px; }
        .cat-btn:hover { border-color: var(--t-border-hi); color:#aaa; }
        .cat-btn-active { background: #e0e0e0 !important; color:#000 !important; border-color: #e0e0e0 !important; }

        .icon-btn-danger { background: transparent; border: none; cursor:pointer; color:#555; padding:4px; display:flex; align-items:center; justify-content:center; transition:color 0.15s; border-radius:4px; }
        .icon-btn-danger:hover { color:#ef4444; background: #1a0a0a; }
        .icon-btn { width:28px; height:28px; border-radius:8px; border: 1px solid var(--t-border); background: var(--t-s2); display:grid; place-items:center; color:rgba(255,255,255,0.4); cursor:pointer; transition:all 0.2s; }
        .icon-btn:hover { border-color: var(--t-border-hi); color:#fff; background: var(--t-s3); }

        .done-badge { display:flex; align-items:center; gap:6px; padding:6px 12px; border: 1px solid var(--t-border); cursor:pointer; transition:all 0.2s; border-radius:6px; background: var(--t-s3); }
        .done-badge span { font-size:0.54rem; letter-spacing:0.2em; color:rgba(255,255,255,0.45); font-family:var(--fm); font-weight:800; }
        .done-badge:hover { border-color: var(--t-border-hi); background: var(--t-s3); }
        .done-badge-active { border-color: rgba(34,197,94,0.45) !important; background: rgba(34,197,94,0.1) !important; }
        .done-badge-active span { color:#4ade80 !important; }

        .add-btn { width:100%; padding:10px; background: var(--t-s2); border: 1px dashed var(--t-border); color:rgba(255,255,255,0.28); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; font-size:0.6rem; letter-spacing:0.22em; font-family:var(--fm); font-weight:700; transition:all 0.2s; border-radius:6px; }
        .add-btn:hover { border-color: var(--t-border-hi); color:rgba(255,255,255,0.65); background: var(--t-s3); }

        .add-week-btn { width:100%; padding:18px; background: var(--t-s2); border: 1px dashed var(--t-border); color:rgba(255,255,255,0.22); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; font-size:0.62rem; letter-spacing:0.3em; font-family:var(--fm); font-weight:800; transition:all 0.2s; border-radius:10px; margin-top:8px; }
        .add-week-btn:hover { border-color: var(--t-border-hi); color:rgba(255,255,255,0.65); background: var(--t-s3); }

        .action-btn { display:flex; align-items:center; gap:7px; background: transparent; border: none; color:#555; cursor:pointer; font-size:0.58rem; letter-spacing:0.2em; font-family:var(--fm); font-weight:800; transition:all 0.15s; white-space:nowrap; padding:0 16px; }
        .action-btn:hover { color:#e0e0e0; }

        .workout-card:hover { border-color: var(--t-border-hi) !important; }
        .ex-row-wrap { border-left: 2px solid var(--t-border); }
        .ex-row-main:hover { background: #0e0e0e; }

        .tab-switcher { scrollbar-width:none; }
        .tab-switcher::-webkit-scrollbar { display:none; }

        .tnav-pill { display:flex; align-items:center; }
        @media (max-width:640px) { .tnav-status { display:none !important; } }
        @media (max-width:520px)  { .tnav-name  { display:none !important; } }

        @keyframes popIn    { from { opacity:0; transform:scale(0.96) translateY(4px) } to { opacity:1; transform:none } }
        @keyframes panelIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes pingPulse { 0%,100% { transform:scale(1); opacity:0.5 } 50% { transform:scale(2.4); opacity:0 } }

        @media (max-width:768px) {
          .page-header  { padding: 14px 16px 0 !important; }
          .page-content { padding: 0 16px 100px !important; }
          .tab-switcher { display:none !important; }
        }
        @media (max-width:760px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width:540px) {
          .stats-4col { grid-template-columns: repeat(2,1fr) !important; border-radius:16px !important; }
          .stats-item { min-height:130px !important; padding:18px 16px 16px !important; }
        }
        @media (max-width:640px) {
          .page-header { padding: 20px 16px 0 !important; }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        input[type=number] { -moz-appearance:textfield; }

        @media (max-width:480px) { .set-log-header, .set-log-row { grid-template-columns:44px 1fr 1fr 64px 36px !important; } }
        /* ≤360px: zadrži SVE stupce (uklj. REPS) — samo ih stisni da stanu u jedan red */
        @media (max-width:360px) {
          .set-log-header, .set-log-row { grid-template-columns:32px 1fr 1fr 46px 30px !important; }
        }
        @media (max-width:480px) { .ex-table-footer { flex-direction:column !important; gap:8px !important; } }
        @media (max-width:480px) { .nav-home-text { display:none !important; } }
        @media (max-width:480px) { .profile-dropdown { width:min(220px,calc(100vw - 32px)) !important; right:0 !important; } }
        @media (max-width:480px) { .gl-lifts-grid { grid-template-columns:1fr !important; } }
        @media (max-width:400px) { .hub-tools-grid { grid-template-columns:1fr !important; } }

        .fab-nav { display:none; }
        @media (max-width:768px) { .fab-nav { display:block; } }
      `}</style>

      {/* ── MOBILE FAB NAV ── */}
      <div className="fab-nav" style={{ position: 'fixed', bottom: '24px', right: '20px', zIndex: 1000 }}>
        {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />}
        {navOpen && (
          <div style={{ position: 'absolute', bottom: '64px', right: 0, background: 'rgba(10,10,10,0.97)', border: '1px solid var(--t-border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', backdropFilter: 'blur(24px)', animation: 'fadeUp 0.18s cubic-bezier(0.16,1,0.3,1)', minWidth: '160px' }}>
            {([['program','Program'],['hub','Hub i Alati'],['meet','Meet Day']] as [string,string][]).map(([tab,label]) => (
              <button key={tab} onClick={() => { setActiveTab(tab as 'program'|'hub'|'meet'); setNavOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 18px', background: activeTab === tab ? 'rgba(239,53,53,0.09)' : 'transparent', border: 'none', borderBottom: '1px solid var(--t-border)', color: activeTab === tab ? '#fca5a5' : 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)', fontSize: '0.78rem', fontWeight: activeTab === tab ? 700 : 400, letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'left' as const, borderLeft: activeTab === tab ? '3px solid #ef3535' : '3px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setNavOpen(v => !v)} style={{ width: '54px', height: '54px', borderRadius: '50%', background: navOpen ? 'rgba(239,53,53,0.9)' : 'rgba(18,18,18,0.95)', border: '1px solid var(--t-border-hi)', boxShadow: navOpen ? '0 4px 24px rgba(239,53,53,0.4)' : '0 4px 24px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(16px)' }}>
          {navOpen ? <X size={20} color="#fff" /> : <Menu size={20} color="rgba(255,255,255,0.85)" />}
        </button>
      </div>
    </div>
  )
}
