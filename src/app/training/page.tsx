'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, Plus, Check, FolderOpen, ChevronDown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Block, BlockSummary, CoachTip, Week, Exercise, WorkoutExercise, Workout } from './types'
import { TrainingNav, EditableField, CompetitionBanner, WeekPanel } from './training-components'
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
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'program' | 'hub' | 'meet'>('program')
  const [tips, setTips] = useState<CoachTip[]>([])
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
        const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
        setAthleteName(profile?.full_name ?? user.email?.split('@')[0] ?? 'Atleta')
        setIsAdmin(profile?.role === 'admin')
        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])
        let { data: blockData } = await supabase
          .from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
          .eq('athlete_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
        if (!blockData) {
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
        // Load coach tips (visible to athlete + admin)
        const { data: tipsData } = await supabase.from('coach_tips').select('*').eq('athlete_id', user.id).order('priority', { ascending: false }).order('created_at', { ascending: false })
        setTips((tipsData ?? []) as CoachTip[])
      } catch { setError('Greška pri učitavanju.') } finally { setLoading(false) }
    }
    init()
  }, [])

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
    const today = new Date(); const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data } = await supabase.from('blocks').insert({ athlete_id: userId, name, start_date: today.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0], status: 'active' }).select('id, name, status, start_date, end_date').single()
    if (data) { setAllBlocks(b => [data as BlockSummary, ...b]); await switchBlock(data.id) }
    setSaving(false)
  }

  const switchBlock = async (blockId: string) => {
    setLoading(true)
    const { data } = await supabase.from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))').eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(data)
    }
    setShowBlockSelector(false); setLoading(false)
  }

  const deleteWeek = async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
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
    const { data, error } = await supabase.from('workouts').insert({ week_id: weekId, athlete_id: userId, day_name: `Dan ${nd + 1}`, workout_date: d.toISOString().split('T')[0], completed: false }).select('*').single()
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

  const updateExercise = async (weId: string, data: Partial<WorkoutExercise>) => {
    // Lifters can only update actual_ fields — filter out anything else
    const filtered = isAdmin
      ? data
      : Object.fromEntries(Object.entries(data).filter(([k]) => LIFTER_FIELDS.includes(k as keyof WorkoutExercise)))
    if (Object.keys(filtered).length === 0) return
    await supabase.from('workout_exercises').update(filtered).eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...filtered } : we) })) })) } : b)
  }
  const deleteExercise = async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }

  const totalWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).length ?? 0
  const completedWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).filter(w => w.completed).length ?? 0
  const pct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

  return (
    <div style={{ background: '#06060a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── Background layers ── */}
      {/* Dot grid */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.014) 1px, transparent 1px)',
        backgroundSize: '28px 28px' }} />
      {/* Blue top-left glow */}
      <div style={{ position: 'fixed', top: '-25vh', left: '-15vw', width: '70vw', height: '70vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(56,100,255,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      {/* Green bottom-right glow */}
      <div style={{ position: 'fixed', bottom: '-20vh', right: '-10vw', width: '60vw', height: '60vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.045) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(0,0,0,0.55) 100%)' }} />

      {/* ── Decorative geometric shapes (behind content) ── */}
      {/* Large barbell outline — top right */}
      <div style={{ position: 'fixed', top: '12vh', right: '-6vw', zIndex: 0, pointerEvents: 'none', opacity: 0.022, transform: 'rotate(-12deg)' }}>
        <svg width="420" height="140" viewBox="0 0 420 140" fill="none">
          <rect x="40" y="62" width="340" height="16" rx="8" fill="white"/>
          <rect x="30" y="30" width="50" height="80" rx="12" fill="white"/>
          <rect x="340" y="30" width="50" height="80" rx="12" fill="white"/>
          <rect x="10" y="44" width="30" height="52" rx="8" fill="white"/>
          <rect x="380" y="44" width="30" height="52" rx="8" fill="white"/>
        </svg>
      </div>
      {/* Medium barbell — bottom left */}
      <div style={{ position: 'fixed', bottom: '18vh', left: '-5vw', zIndex: 0, pointerEvents: 'none', opacity: 0.018, transform: 'rotate(8deg)' }}>
        <svg width="300" height="100" viewBox="0 0 300 100" fill="none">
          <rect x="30" y="44" width="240" height="12" rx="6" fill="white"/>
          <rect x="22" y="20" width="36" height="60" rx="9" fill="white"/>
          <rect x="242" y="20" width="36" height="60" rx="9" fill="white"/>
          <rect x="8" y="30" width="22" height="40" rx="6" fill="white"/>
          <rect x="270" y="30" width="22" height="40" rx="6" fill="white"/>
        </svg>
      </div>
      {/* Diamond / plate shape — center right */}
      <div style={{ position: 'fixed', top: '42vh', right: '-3vw', zIndex: 0, pointerEvents: 'none', opacity: 0.025, transform: 'rotate(18deg)' }}>
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
          <rect x="12" y="12" width="136" height="136" rx="20" stroke="white" strokeWidth="8" fill="none"/>
          <rect x="40" y="40" width="80" height="80" rx="12" stroke="white" strokeWidth="5" fill="none"/>
          <circle cx="80" cy="80" r="16" stroke="white" strokeWidth="5" fill="none"/>
        </svg>
      </div>
      {/* Small plate — top center-left */}
      <div style={{ position: 'fixed', top: '55vh', left: '3vw', zIndex: 0, pointerEvents: 'none', opacity: 0.02, transform: 'rotate(-6deg)' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <rect x="8" y="8" width="104" height="104" rx="18" stroke="white" strokeWidth="7" fill="none"/>
          <circle cx="60" cy="60" r="22" stroke="white" strokeWidth="5" fill="none"/>
        </svg>
      </div>

      <TrainingNav athleteName={athleteName} isAdmin={isAdmin} onLogout={handleLogout} />

      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: '56px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Header glow strip at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '180px', zIndex: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(56,100,255,0.04) 0%, transparent 100%)' }} />

        <div className='page-header' style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 32px 0', position: 'relative', zIndex: 1 }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', animation: 'fadeUp 0.4s ease', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
            {([['program','Program'],['hub','Hub & Alati'],['meet','Meet Day']] as [string,string][]).map(([tab,label])=>(
              <button key={tab} onClick={()=>setActiveTab(tab as 'program'|'hub'|'meet')}
                style={{ padding:'8px 20px', background: activeTab===tab ? 'rgba(255,255,255,0.1)' : 'transparent', border: activeTab===tab ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent', borderRadius: '9px', cursor:'pointer', fontSize:'0.78rem', fontFamily:'var(--fm)', fontWeight: activeTab===tab ? 600 : 400, color: activeTab===tab ? '#fff' : 'rgba(255,255,255,0.45)', transition:'all 0.2s', whiteSpace:'nowrap' as const, letterSpacing: '0.01em' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Page title row — only in program tab */}
          {activeTab === 'program' && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', gap: '20px', flexWrap: 'wrap', animation: 'fadeUp 0.5s ease 0.05s both' }}>
            <div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontFamily: 'var(--fm)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '18px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                {loading ? '...' : athleteName}
              </div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.6rem,4vw,3rem)', fontWeight: 800, lineHeight: 0.92, margin: 0, letterSpacing: '-0.03em', color: '#f5f5f7' }}>
                {loading ? 'Učitavanje…' : (block?.name ?? 'Moj program')}
              </h1>
            </div>

            {/* Stats row */}
            {!loading && block && (
              <div className="stats-row" style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                {[
                  { val: block.weeks?.length ?? 0, label: 'Tjedana' },
                  { val: totalWorkouts, label: 'Treninga' },
                  { val: `${completedWorkouts}/${totalWorkouts}`, label: 'Završeno', accent: completedWorkouts > 0 },
                  { val: `${pct}%`, label: 'Napredak', accent: pct > 50 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '12px 20px', background: '#08080e', textAlign: 'center', minWidth: '76px' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, lineHeight: 1, color: s.accent ? '#4ade80' : '#f0f0f5' }}>{s.val}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '5px', fontFamily: 'var(--fm)', fontWeight: 400 }}>{s.label}</div>
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
                <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.3em', color: '#888', flexShrink: 0 }}>NAZIV</div>
                  <EditableField value={block.name} placeholder="Naziv programa"
                    onSave={async v => {
                      await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                      setBlock(b => b ? { ...b, name: v } : b)
                      setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2) as BlockSummary[])
                    }} />
                </div>

                {/* New block */}
                {isAdmin && (
                  <button onClick={async () => { const n = prompt('Naziv novog bloka:'); if (n?.trim()) await addBlock(n.trim()) }}
                    className="action-btn" style={{ padding: '0 16px', borderRadius: 0 }}>
                    <Plus size={12} /> NOVI BLOK
                  </button>
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
          {activeTab === 'hub' && <HubTab tips={tips} athleteName={athleteName} />}
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

              {(block.weeks?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', marginBottom: '14px', opacity: 0.3 }}>—</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '28px' }}>PROGRAM JE PRAZAN</div>
                </div>
              )}
              {block.weeks?.map(week => (
                <WeekPanel key={week.id} week={week} exercises={exercises} isAdmin={isAdmin} userId={userId ?? ''}
                  onDeleteWeek={deleteWeek} onUpdateWeek={updateWeek} onAddWorkout={addWorkout}
                  onUpdateWorkout={updateWorkout} onDeleteWorkout={deleteWorkout}
                  onAddExercise={addExercise} onUpdateExercise={updateExercise} onDeleteExercise={deleteExercise} />
              ))}
              {isAdmin && (
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
          display:flex; align-items:center; gap:5px;
          padding:5px 10px; border:1px solid rgba(255,255,255,0.1);
          cursor:pointer; transition:all 0.2s; border-radius:5px;
          background:#0f0f12;
        }
        .done-badge span { font-size:0.55rem; letter-spacing:0.18em; color:#444; font-family:var(--fm); font-weight:700; }
        .done-badge:hover { border-color:rgba(255,255,255,0.3); }
        .done-badge-active { border-color:#22c55e44 !important; background:#0a1a0e !important; }
        .done-badge-active span { color:#22c55e !important; }

        /* ── Add buttons ── */
        .add-btn {
          width:100%; padding:9px; background:transparent;
          border:1px dashed rgba(255,255,255,0.1); color:#444; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          gap:7px; font-size:0.62rem; letter-spacing:0.2em;
          font-family:var(--fm); transition:all 0.2s; border-radius:6px;
        }
        .add-btn:hover { border-color:rgba(255,255,255,0.35); color:#888; background:#0f0f12; }

        .add-week-btn {
          width:100%; padding:16px; background:transparent;
          border:1px dashed rgba(255,255,255,0.1); color:#444; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          gap:10px; font-size:0.68rem; letter-spacing:0.28em;
          font-family:var(--fm); font-weight:700; transition:all 0.2s;
          border-radius:8px; margin-top:8px;
        }
        .add-week-btn:hover { border-color:#333; color:#aaa; background:#0c0c0e; }

        /* ── Action btn ── */
        .action-btn {
          display:flex; align-items:center; gap:7px;
          background:transparent; border:none; border-left:1px solid rgba(255,255,255,0.09);
          color:#555; cursor:pointer; font-size:0.6rem; letter-spacing:0.18em;
          font-family:var(--fm); font-weight:700; transition:all 0.15s; white-space:nowrap;
        }
        .action-btn:hover { color:#aaa; background:#111113; }

        /* ── Workout card hover ── */
        .workout-card:hover {
          border-color: #252532 !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5) !important;
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
          .page-header  { padding: 16px 16px 0 !important; }
          .page-content { padding: 0 16px 80px !important; }
        }

        /* ─ Block selector bar: stack vertically on mobile ─ */
        @media (max-width: 640px) {
          .block-bar { flex-direction: column !important; }
          .block-bar > * { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; width: 100% !important; min-width: 0 !important; }
          .block-bar > *:last-child { border-bottom: none !important; }
        }

        /* ─ Stats pills: 2×2 on small screens ─ */
        @media (max-width: 560px) {
          .stats-row { flex-wrap: wrap !important; }
          .stats-row > div { min-width: 60px !important; padding: 10px 14px !important; }
        }

        /* ─ Week header: shrink W number ─ */
        @media (max-width: 640px) {
          .week-w-num { font-size: 2.2rem !important; }
          .week-header-top { padding: 14px 16px 0 !important; }
        }

        /* ─ Day grid: scroll horizontally on mobile ─ */
        @media (max-width: 640px) {
          .day-grid { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .day-grid > div { min-width: 100px !important; }
        }

        /* ─ Workout card header: stack on very small ─ */
        @media (max-width: 480px) {
          .workout-header-inner { flex-wrap: wrap !important; gap: 8px !important; }
          .workout-header-inner .workout-controls { width: 100%; justify-content: flex-end; }
          .workout-header-inner .workout-name { font-size: 0.88rem !important; }
        }

        /* ─ Exercise table: hide KG+RPE cols on mobile, show stacked ─ */
        @media (max-width: 600px) {
          .ex-row-main {
            grid-template-columns: 28px 1fr 56px 56px 28px !important;
          }
          .ex-col-kg, .ex-col-rpe { display: none !important; }
        }
        @media (max-width: 420px) {
          .ex-row-main {
            grid-template-columns: 1fr 48px 48px 28px !important;
          }
          .ex-col-grip { display: none !important; }
        }

        /* ─ Exercise table footer: stack on mobile ─ */
        @media (max-width: 480px) {
          .ex-table-footer { flex-direction: column !important; gap: 8px !important; }
          .ex-table-footer > * { border-left: none !important; padding-left: 0 !important; }
        }

        /* ─ Navbar: hide "POČETNA" text on small screens ─ */
        @media (max-width: 480px) {
          .nav-home-text { display: none !important; }
          .nav-center-label { font-size: 0.6rem !important; letter-spacing: 0.15em !important; }
        }

        /* ─ Profile dropdown: full width on mobile ─ */
        @media (max-width: 480px) {
          .profile-dropdown { width: 100vw !important; right: -16px !important; }
        }

        /* ─ Title heading: smaller on mobile ─ */
        @media (max-width: 480px) {
          .page-title { font-size: 1.8rem !important; }
        }
      `}</style>
    </div>
  )
}