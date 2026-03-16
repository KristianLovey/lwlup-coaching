'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, CheckCircle, Circle,
  TrendingUp, Calendar, Dumbbell, LogOut, User,
  ChevronDown, ChevronUp, Save, BarChart2
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────
type Lift = { exercise_name: string; planned_sets: number; planned_reps: string; planned_weight_kg: number; planned_rpe: number; actual_sets?: number; actual_reps?: string; actual_weight_kg?: number; actual_rpe?: number; notes?: string; completed?: boolean; id: string }
type Workout = { id: string; day_name: string; workout_date: string; completed: boolean; exercises: Lift[] }
type Week = { id: string; week_number: number; start_date: string; end_date: string; workouts: Workout[] }
type Block = { id: string; name: string; goal: string; start_date: string; end_date: string; status: string; weeks: Week[] }
type PRStats = { squat_pr: number; bench_pr: number; deadlift_pr: number; total: number; bodyweight_kg: number; stat_date: string }

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' })
const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()
const isPast = (d: string) => new Date(d) < new Date() && !isToday(d)

export default function TrainingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)
  const [activeWeek, setActiveWeek] = useState<Week | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [stats, setStats] = useState<PRStats | null>(null)
  const [view, setView] = useState<'today' | 'week' | 'progress'>('today')
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [actuals, setActuals] = useState<Record<string, Partial<Lift>>>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({})
  const [loading, setLoading] = useState(true)

  // ── Auth & Data fetch ────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Profile
      const { data: prof } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      setProfile(prof)

      // Admin → redirect na admin panel
      if (prof?.role === 'admin') { router.push('/admin'); return }

      // Active block with weeks and workouts
      const { data: blockData } = await supabase
        .from('blocks')
        .select(`
          id, name, goal, start_date, end_date, status,
          weeks (
            id, week_number, start_date, end_date,
            workouts (
              id, day_name, workout_date, completed,
              workout_exercises (
                id, exercise_order, planned_sets, planned_reps,
                planned_weight_kg, planned_rpe, actual_sets, actual_reps,
                actual_weight_kg, actual_rpe, notes, completed,
                exercises ( name )
              )
            )
          )
        `)
        .eq('athlete_id', user.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (blockData) {
        // Normalize data
        const normalized: Block = {
          ...blockData,
          weeks: (blockData.weeks || [])
            .sort((a: any, b: any) => a.week_number - b.week_number)
            .map((w: any) => ({
              ...w,
              workouts: (w.workouts || [])
                .sort((a: any, b: any) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())
                .map((wo: any) => ({
                  ...wo,
                  // Rename workout_exercises → exercises and flatten exercise name
                  exercises: (wo.workout_exercises || [])
                    .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
                    .map((ex: any) => ({
                      ...ex,
                      exercise_name: ex.exercises?.name || 'Unknown',
                      exercises: undefined, // remove nested object to avoid conflict
                    }))
                }))
            }))
        }
        setBlocks([normalized])
        setActiveBlock(normalized)

        // Find current week
        const now = new Date()
        const currentWeek = normalized.weeks.find(w =>
          new Date(w.start_date) <= now && new Date(w.end_date) >= now
        ) || normalized.weeks[normalized.weeks.length - 1]
        setActiveWeek(currentWeek)

        // Find today's workout
        const todayWorkout = currentWeek?.workouts.find(wo => isToday(wo.workout_date))
          || currentWeek?.workouts.find(wo => !wo.completed && !isPast(wo.workout_date))
        setActiveWorkout(todayWorkout || currentWeek?.workouts[0] || null)

        // Pre-fill actuals from saved data
        const initialActuals: Record<string, Partial<Lift>> = {}
        currentWeek?.workouts.forEach(wo => {
          wo.exercises.forEach(ex => {
            initialActuals[ex.id] = {
              actual_sets: ex.actual_sets,
              actual_reps: ex.actual_reps,
              actual_weight_kg: ex.actual_weight_kg,
              actual_rpe: ex.actual_rpe,
              notes: ex.notes,
            }
          })
        })
        setActuals(initialActuals)
      }

      // Latest PR stats
      const { data: statsData } = await supabase
        .from('athlete_stats')
        .select('squat_pr, bench_pr, deadlift_pr, total, bodyweight_kg, stat_date')
        .eq('athlete_id', user.id)
        .order('stat_date', { ascending: false })
        .limit(1)
        .single()
      setStats(statsData)

      setLoading(false)
    }
    init()
  }, [])

  // ── Save single exercise actuals ────────────────────────────────
  const saveExercise = async (exerciseId: string) => {
    setSaveStatus(p => ({ ...p, [exerciseId]: 'saving' }))
    const supabase = createClient()
    await supabase
      .from('workout_exercises')
      .update({ ...actuals[exerciseId], updated_at: new Date().toISOString() })
      .eq('id', exerciseId)
    setSaveStatus(p => ({ ...p, [exerciseId]: 'saved' }))
    setTimeout(() => setSaveStatus(p => ({ ...p, [exerciseId]: 'idle' })), 2000)
  }

  // ── Complete workout ─────────────────────────────────────────────
  const completeWorkout = async () => {
    if (!activeWorkout) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('workouts')
      .update({ completed: true, completion_date: new Date().toISOString() })
      .eq('id', activeWorkout.id)
    setSaving(false)
    setActiveWorkout(prev => prev ? { ...prev, completed: true } : null)
  }

  // ── Logout ────────────────────────────────────────────────────────
  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)' }}>UČITAVANJE</div>
      </div>
    </div>
  )

  if (!activeBlock) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏋️</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Nema aktivnog bloka</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Tvoj trener će uskoro kreirati tvoj program.</p>
      </div>
    </div>
  )

  // ── Progress bars for week completion ────────────────────────────
  const weekDone = activeWeek?.workouts.filter(w => w.completed).length || 0
  const weekTotal = activeWeek?.workouts.length || 0
  const weekPct = weekTotal > 0 ? (weekDone / weekTotal) * 100 : 0

  // ── Block progress ────────────────────────────────────────────────
  const blockDone = activeBlock.weeks.reduce((acc, w) => acc + w.workouts.filter(wo => wo.completed).length, 0)
  const blockTotal = activeBlock.weeks.reduce((acc, w) => acc + w.workouts.length, 0)
  const blockPct = blockTotal > 0 ? (blockDone / blockTotal) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', background: 'rgba(5,5,5,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '46px' }} />
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)' }}>ATHLETE PORTAL</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em' }}>{profile?.full_name || '—'}</div>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {([['today', 'DANAS', <Dumbbell size={13} />], ['week', 'TJEDAN', <Calendar size={13} />], ['progress', 'NAPREDAK', <BarChart2 size={13} />]] as const).map(([v, label, icon]) => (
            <button key={v} onClick={() => setView(v as any)} style={{
              padding: '8px 18px', background: view === v ? '#fff' : 'transparent',
              color: view === v ? '#000' : 'rgba(255,255,255,0.4)',
              border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 800,
              letterSpacing: '0.2em', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)', padding: '8px 16px', cursor: 'pointer',
          fontSize: '0.65rem', letterSpacing: '0.2em', transition: '0.3s',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <LogOut size={13} /> ODJAVA
        </button>
      </nav>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════ */}
      <div style={{ paddingTop: '70px', maxWidth: '1200px', margin: '0 auto', padding: '90px 40px 60px' }}>

        {/* Block header */}
        <div style={{ marginBottom: '50px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>AKTIVNI BLOK</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1, marginBottom: '8px' }}>
                {activeBlock.name}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                {activeBlock.goal || 'Trening program'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{Math.round(blockPct)}%</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)' }}>ZAVRŠENO</div>
            </div>
          </div>

          {/* Block progress bar */}
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', marginTop: '20px', position: 'relative' }}>
            <div style={{ height: '100%', width: `${blockPct}%`, background: '#fff', transition: '1s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>{fmt(activeBlock.start_date)}</div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>{fmt(activeBlock.end_date)}</div>
          </div>
        </div>

        {/* ══ VIEW: DANAS ══════════════════════════════════════════ */}
        {view === 'today' && (
          <div>
            {/* Week selector tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '4px' }}>
              {activeBlock.weeks.map(w => (
                <button key={w.id} onClick={() => { setActiveWeek(w); setActiveWorkout(w.workouts[0] || null) }} style={{
                  padding: '10px 20px', background: activeWeek?.id === w.id ? '#fff' : 'rgba(255,255,255,0.05)',
                  color: activeWeek?.id === w.id ? '#000' : 'rgba(255,255,255,0.5)',
                  border: '1px solid', borderColor: activeWeek?.id === w.id ? '#fff' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
                  transition: '0.3s', whiteSpace: 'nowrap', fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  TJEDAN {w.week_number}
                </button>
              ))}
            </div>

            {activeWeek && (
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px', alignItems: 'start' }}>

                {/* Sidebar: workout selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '5px', paddingLeft: '5px' }}>TRENINZI</div>
                  {activeWeek.workouts.map(wo => (
                    <button key={wo.id} onClick={() => setActiveWorkout(wo)} style={{
                      padding: '20px', textAlign: 'left', cursor: 'pointer', transition: '0.3s',
                      background: activeWorkout?.id === wo.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid', borderColor: activeWorkout?.id === wo.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#fff' }}>{wo.day_name}</span>
                        {wo.completed
                          ? <CheckCircle size={14} color="rgba(100,255,100,0.7)" />
                          : isToday(wo.workout_date)
                            ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.6)' }} />
                            : <Circle size={14} color="rgba(255,255,255,0.2)" />
                        }
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{fmt(wo.workout_date)}</div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>{wo.exercises.length} vježbi</div>
                    </button>
                  ))}

                  {/* Week progress */}
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)' }}>TJEDAN {activeWeek.week_number}</span>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{weekDone}/{weekTotal}</span>
                    </div>
                    <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', width: `${weekPct}%`, background: '#fff', transition: '0.6s' }} />
                    </div>
                  </div>
                </div>

                {/* Main: workout detail */}
                {activeWorkout ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                      <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '5px' }}>{activeWorkout.day_name}</h2>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em' }}>
                          {fmt(activeWorkout.workout_date)} · {activeWorkout.exercises.length} VJEŽBI
                          {isToday(activeWorkout.workout_date) && (
                            <span style={{ marginLeft: '12px', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '3px 10px', fontSize: '0.55rem', letterSpacing: '0.3em' }}>DANAS</span>
                          )}
                        </div>
                      </div>
                      {!activeWorkout.completed && (
                        <button onClick={completeWorkout} disabled={saving} style={{
                          padding: '14px 28px', background: '#fff', color: '#000', border: 'none',
                          cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.65rem', fontWeight: 800,
                          letterSpacing: '0.2em', transition: '0.3s', fontFamily: "'Space Grotesk', sans-serif",
                          opacity: saving ? 0.7 : 1,
                        }}>
                          {saving ? 'SPREMANJE...' : '✓ ZAVRŠI TRENING'}
                        </button>
                      )}
                      {activeWorkout.completed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(100,255,100,0.7)', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
                          <CheckCircle size={16} /> ZAVRŠENO
                        </div>
                      )}
                    </div>

                    {/* Exercise list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeWorkout.exercises.map((ex, idx) => {
                        const isExpanded = expandedExercise === ex.id
                        const exActuals = actuals[ex.id] || {}
                        const status = saveStatus[ex.id] || 'idle'

                        return (
                          <div key={ex.id} style={{
                            border: '1px solid', borderColor: isExpanded ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                            background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                            transition: '0.3s',
                          }}>
                            {/* Exercise header - click to expand */}
                            <div
                              onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                              style={{ padding: '20px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: '16px', alignItems: 'center' }}
                            >
                              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{String(idx + 1).padStart(2, '0')}</div>
                              <div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>{ex.exercise_name}</div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                                  {ex.planned_sets}×{ex.planned_reps} · {ex.planned_weight_kg}kg · RPE {ex.planned_rpe}
                                </div>
                              </div>
                              {/* Completed indicator */}
                              <div>
                                {exActuals.actual_sets
                                  ? <CheckCircle size={16} color="rgba(100,255,100,0.6)" />
                                  : <Circle size={16} color="rgba(255,255,255,0.2)" />
                                }
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Expanded: actuals input */}
                            {isExpanded && (
                              <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
                                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>UNESITE ODRAĐENO</div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                                    {[
                                      { key: 'actual_sets', label: 'SETOVI', type: 'number', placeholder: ex.planned_sets.toString() },
                                      { key: 'actual_reps', label: 'PONAVLJANJA', type: 'text', placeholder: ex.planned_reps },
                                      { key: 'actual_weight_kg', label: 'KILAŽA (kg)', type: 'number', placeholder: ex.planned_weight_kg.toString() },
                                      { key: 'actual_rpe', label: 'RPE', type: 'number', placeholder: ex.planned_rpe.toString() },
                                    ].map(field => (
                                      <div key={field.key}>
                                        <label style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontWeight: 700 }}>
                                          {field.label}
                                        </label>
                                        <input
                                          type={field.type}
                                          value={(exActuals as any)[field.key] || ''}
                                          onChange={e => setActuals(p => ({ ...p, [ex.id]: { ...p[ex.id], [field.key]: field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value } }))}
                                          placeholder={field.placeholder}
                                          style={{
                                            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff', padding: '10px 12px', fontSize: '0.9rem', outline: 'none',
                                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, boxSizing: 'border-box',
                                            transition: '0.2s',
                                          }}
                                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  {/* Notes */}
                                  <div style={{ marginTop: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontWeight: 700 }}>KOMENTAR</label>
                                    <textarea
                                      value={exActuals.notes || ''}
                                      onChange={e => setActuals(p => ({ ...p, [ex.id]: { ...p[ex.id], notes: e.target.value } }))}
                                      placeholder="Osjećaj, tehnika, feedback..."
                                      rows={2}
                                      style={{
                                        width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        padding: '10px 12px', fontSize: '0.85rem', outline: 'none', resize: 'vertical' as const,
                                        fontFamily: "'Space Grotesk', sans-serif", boxSizing: 'border-box' as const, color: 'rgba(255,255,255,0.7)',
                                      }}
                                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                  </div>
                                </div>

                                {/* Save button */}
                                <button
                                  onClick={() => saveExercise(ex.id)}
                                  disabled={status === 'saving'}
                                  style={{
                                    padding: '12px 24px', background: status === 'saved' ? 'rgba(100,255,100,0.15)' : '#fff',
                                    color: status === 'saved' ? 'rgba(100,255,100,0.9)' : '#000',
                                    border: status === 'saved' ? '1px solid rgba(100,255,100,0.3)' : 'none',
                                    cursor: status === 'saving' ? 'wait' : 'pointer',
                                    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', transition: '0.3s',
                                    fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'center', gap: '8px',
                                  }}
                                >
                                  {status === 'saving' ? 'SPREMA...' : status === 'saved' ? '✓ SPREMLJENO' : <><Save size={13} /> SPREMI</>}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                    Odaberi trening
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ VIEW: TJEDAN ═════════════════════════════════════════ */}
        {view === 'week' && (
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '40px' }}>
              PREGLED BLOKA <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.8rem' }}>/ {activeBlock.weeks.length} TJEDANA</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeBlock.weeks.map(w => {
                const done = w.workouts.filter(wo => wo.completed).length
                const total = w.workouts.length
                const pct = total > 0 ? (done / total) * 100 : 0
                const isCurrentWeek = activeWeek?.id === w.id

                return (
                  <div key={w.id} style={{
                    padding: '30px', border: '1px solid',
                    borderColor: isCurrentWeek ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                    background: isCurrentWeek ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>TJEDAN {w.week_number}</span>
                        {isCurrentWeek && <span style={{ fontSize: '0.55rem', letterSpacing: '0.3em', background: '#fff', color: '#000', padding: '4px 10px', fontWeight: 800 }}>TRENUTNI</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{fmt(w.start_date)} — {fmt(w.end_date)}</span>
                    </div>

                    {/* Progress */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                      {w.workouts.map(wo => (
                        <div key={wo.id} style={{
                          flex: 1, height: '4px',
                          background: wo.completed ? '#fff' : isToday(wo.workout_date) ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
                          transition: '0.4s',
                        }} title={wo.day_name} />
                      ))}
                    </div>

                    {/* Workouts grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                      {w.workouts.map(wo => (
                        <div key={wo.id} style={{
                          padding: '14px', border: '1px solid rgba(255,255,255,0.08)',
                          background: wo.completed ? 'rgba(100,255,100,0.05)' : 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                        }} onClick={() => { setActiveWeek(w); setActiveWorkout(wo); setView('today') }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{wo.day_name}</span>
                            {wo.completed ? <CheckCircle size={12} color="rgba(100,255,100,0.7)" /> : <Circle size={12} color="rgba(255,255,255,0.2)" />}
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{fmt(wo.workout_date)}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>{wo.exercises.length} vježbi</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '15px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{done}/{total} završenih</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ VIEW: NAPREDAK ═══════════════════════════════════════ */}
        {view === 'progress' && (
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '40px' }}>
              TVOJ NAPREDAK
            </h2>

            {stats ? (
              <>
                {/* PR Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '50px' }}>
                  {[
                    { label: 'SQUAT PR', value: stats.squat_pr, unit: 'kg' },
                    { label: 'BENCH PR', value: stats.bench_pr, unit: 'kg' },
                    { label: 'DEADLIFT PR', value: stats.deadlift_pr, unit: 'kg' },
                    { label: 'TOTAL', value: stats.total, unit: 'kg' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: '30px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>{s.label}</div>
                      <div style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{s.value || '—'}</div>
                      {s.value && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px' }}>{s.unit}</div>}
                    </div>
                  ))}
                </div>

                {/* Body weight */}
                {stats.bodyweight_kg && (
                  <div style={{ padding: '25px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>TJELESNA TEŽINA</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.bodyweight_kg} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)' }}>kg</span></div>
                  </div>
                )}

                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>
                  ZADNJE AŽURIRANJE: {fmt(stats.stat_date)}
                </div>
              </>
            ) : (
              <div style={{ padding: '80px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                <TrendingUp size={40} style={{ marginBottom: '20px', opacity: 0.3 }} />
                <p>Statistike nisu još dostupne. Trener će ih dodati uskoro.</p>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}