'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Plus, ChevronRight, ChevronDown, ChevronUp, Trash2,
  Save, LogOut, Users, Calendar, Dumbbell, X, Check,
  ArrowLeft, Edit2, AlertCircle
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
type Athlete = { id: string; full_name: string; role: string }
type Exercise = { id: string; name: string; category: string }
type WorkoutExercise = {
  exercise_id: string
  exercise_name?: string
  exercise_order: number
  planned_sets: number
  planned_reps: string
  planned_weight_kg: number
  planned_rpe: number
  planned_rest_seconds: number
  notes: string
}
type WorkoutDraft = {
  day_name: string
  workout_date: string
  exercises: WorkoutExercise[]
}
type WeekDraft = {
  week_number: number
  start_date: string
  end_date: string
  workouts: WorkoutDraft[]
}

// ── Step indicator ─────────────────────────────────────────────────
const STEPS = ['ATLET', 'BLOK', 'TJEDNI', 'TRENINZI', 'PREGLED']

// ── Helpers ────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const addDays = (date: string, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
const fmt = (d: string) => new Date(d).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Empty workout factory ──────────────────────────────────────────
const newWorkout = (dayName: string, date: string): WorkoutDraft => ({
  day_name: dayName,
  workout_date: date,
  exercises: []
})

const newExercise = (): WorkoutExercise => ({
  exercise_id: '',
  exercise_order: 1,
  planned_sets: 3,
  planned_reps: '8',
  planned_weight_kg: 0,
  planned_rpe: 8,
  planned_rest_seconds: 180,
  notes: ''
})

// ══════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const router = useRouter()

  // Global state
  const [step, setStep] = useState(0)
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [adminName, setAdminName] = useState('')

  // Block draft
  const [blockName, setBlockName] = useState('')
  const [blockGoal, setBlockGoal] = useState('')
  const [blockStart, setBlockStart] = useState(today())
  const [blockWeekCount, setBlockWeekCount] = useState(4)

  // Weeks draft
  const [weeks, setWeeks] = useState<WeekDraft[]>([])

  // Active workout being edited
  const [activeWeekIdx, setActiveWeekIdx] = useState(0)
  const [activeWorkoutIdx, setActiveWorkoutIdx] = useState(0)
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  // ── Load data ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Check admin
      const { data: profile } = await supabase
        .from('profiles').select('role, full_name').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/training'); return }
      setAdminName(profile.full_name || 'Admin')

      // Load all athletes (non-admin)
      const { data: aths } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .neq('role', 'admin')
        .order('full_name')
      setAthletes(aths || [])

      // Load exercises
      const { data: exs } = await supabase
        .from('exercises')
        .select('id, name, category')
        .order('category').order('name')
      setExercises(exs || [])
    }
    init()
  }, [])

  // ── Generate weeks when block params change ──────────────────────
  const generateWeeks = () => {
    const generated: WeekDraft[] = []
    for (let i = 0; i < blockWeekCount; i++) {
      const weekStart = addDays(blockStart, i * 7)
      const weekEnd = addDays(weekStart, 6)
      generated.push({
        week_number: i + 1,
        start_date: weekStart,
        end_date: weekEnd,
        workouts: [
          newWorkout('Trening A', addDays(weekStart, 0)),
          newWorkout('Trening B', addDays(weekStart, 2)),
          newWorkout('Trening C', addDays(weekStart, 4)),
        ]
      })
    }
    setWeeks(generated)
  }

  // ── Save everything to Supabase ──────────────────────────────────
  const saveAll = async () => {
    if (!selectedAthlete) return
    setSaving(true)
    setSaveError('')

    try {
      const supabase = createClient()

      // 1. Create block
      const blockEnd = addDays(blockStart, blockWeekCount * 7 - 1)
      const { data: block, error: blockError } = await supabase
        .from('blocks')
        .insert({
          athlete_id: selectedAthlete.id,
          name: blockName,
          goal: blockGoal,
          start_date: blockStart,
          end_date: blockEnd,
          status: 'active'
        })
        .select('id').single()

      if (blockError) throw blockError

      // 2. Create weeks + workouts + exercises
      for (const week of weeks) {
        const { data: weekRow, error: weekError } = await supabase
          .from('weeks')
          .insert({
            block_id: block.id,
            week_number: week.week_number,
            start_date: week.start_date,
            end_date: week.end_date,
          })
          .select('id').single()

        if (weekError) throw weekError

        for (const workout of week.workouts) {
          if (workout.exercises.length === 0) continue // skip empty workouts

          const { data: workoutRow, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              week_id: weekRow.id,
              athlete_id: selectedAthlete.id,
              day_name: workout.day_name,
              workout_date: workout.workout_date,
              completed: false
            })
            .select('id').single()

          if (workoutError) throw workoutError

          // Insert exercises
          const exerciseRows = workout.exercises.map((ex, idx) => ({
            workout_id: workoutRow.id,
            exercise_id: ex.exercise_id,
            exercise_order: idx + 1,
            planned_sets: ex.planned_sets,
            planned_reps: ex.planned_reps,
            planned_weight_kg: ex.planned_weight_kg,
            planned_rpe: ex.planned_rpe,
            planned_rest_seconds: ex.planned_rest_seconds,
            notes: ex.notes || null
          }))

          const { error: exError } = await supabase
            .from('workout_exercises')
            .insert(exerciseRows)

          if (exError) throw exError
        }
      }

      setSavedSuccess(true)
    } catch (err: any) {
      setSaveError(err.message || 'Greška pri spremanju')
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // ── Current workout being edited ─────────────────────────────────
  const currentWorkout = weeks[activeWeekIdx]?.workouts[activeWorkoutIdx]

  const updateExercise = (idx: number, field: keyof WorkoutExercise, value: any) => {
    setWeeks(prev => {
      const next = structuredClone(prev)
      next[activeWeekIdx].workouts[activeWorkoutIdx].exercises[idx] = {
        ...next[activeWeekIdx].workouts[activeWorkoutIdx].exercises[idx],
        [field]: value
      }
      return next
    })
  }

  const addExercise = (ex: Exercise) => {
    setWeeks(prev => {
      const next = structuredClone(prev)
      const exList = next[activeWeekIdx].workouts[activeWorkoutIdx].exercises
      exList.push({ ...newExercise(), exercise_id: ex.id, exercise_name: ex.name, exercise_order: exList.length + 1 })
      return next
    })
    setShowExercisePicker(false)
    setExerciseSearch('')
  }

  const removeExercise = (idx: number) => {
    setWeeks(prev => {
      const next = structuredClone(prev)
      next[activeWeekIdx].workouts[activeWorkoutIdx].exercises.splice(idx, 1)
      return next
    })
  }

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    e.category.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  // Group exercises by category for picker
  const exercisesByCategory = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = []
    acc[ex.category].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  const S = { // shared styles
    input: {
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      color: '#fff', padding: '10px 14px', fontSize: '0.9rem', outline: 'none',
      fontFamily: "'DM Mono', monospace", width: '100%', boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s',
    },
    label: {
      display: 'block' as const, fontSize: '0.58rem', letterSpacing: '0.3em',
      color: 'rgba(255,255,255,0.35)', marginBottom: '8px', fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
    },
    btnPrimary: {
      padding: '14px 32px', background: '#fff', color: '#000', border: 'none',
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em', cursor: 'pointer',
      fontFamily: "'DM Mono', monospace", transition: 'all 0.2s',
    },
    btnSecondary: {
      padding: '10px 22px', background: 'transparent', color: 'rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.65rem', fontWeight: 700,
      letterSpacing: '0.2em', cursor: 'pointer', fontFamily: "'DM Mono', monospace",
      transition: 'all 0.2s',
    },
    card: {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      padding: '30px',
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#060606', color: '#fff', fontFamily: "'DM Mono', monospace" }}>

      {/* ══ NAVBAR ════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', background: 'rgba(6,6,6,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '38px' }} />
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)' }}>ADMIN PANEL</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{adminName}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => router.push('/training')} style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={12} /> ATLETI
          </button>
          <button onClick={logout} style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={12} /> ODJAVA
          </button>
        </div>
      </nav>

      {/* ══ STEP BAR ══════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 99,
        background: '#060606', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 40px', display: 'flex', alignItems: 'center', height: '52px', gap: '0',
      }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => i < step && setStep(i)}
              style={{
                background: 'none', border: 'none', cursor: i < step ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800,
                background: i < step ? '#fff' : i === step ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: i === step ? '1px solid rgba(255,255,255,0.4)' : i < step ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: i < step ? '#000' : i === step ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: '0.3s',
              }}>
                {i < step ? <Check size={11} /> : i + 1}
              </div>
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 700,
                color: i === step ? '#fff' : i < step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                transition: '0.3s',
              }}>{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ width: '30px', height: '1px', background: i < step ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>

      {/* ══ MAIN ══════════════════════════════════════════════════ */}
      <div style={{ paddingTop: '130px', maxWidth: '1100px', margin: '0 auto', padding: '150px 40px 80px' }}>

        {/* ── STEP 0: ODABIR ATLETA ─────────────────────────────── */}
        {step === 0 && (
          <div>
            <div style={{ marginBottom: '50px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>KORAK 1/5</div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, marginBottom: '12px' }}>ODABERI<br/><span style={{ color: 'rgba(255,255,255,0.25)' }}>ATLETA</span></h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Za kojeg atleta kreiraš novi trening blok?</p>
            </div>

            {athletes.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
                <AlertCircle size={32} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '16px' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Nema atleta u sustavu. Dodaj atleta kroz Supabase Auth.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {athletes.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAthlete(a)}
                    style={{
                      ...S.card,
                      cursor: 'pointer', transition: 'all 0.25s',
                      borderColor: selectedAthlete?.id === a.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)',
                      background: selectedAthlete?.id === a.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={e => { if (selectedAthlete?.id !== a.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' } }}
                    onMouseLeave={e => { if (selectedAthlete?.id !== a.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>{a.full_name}</div>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{a.role}</div>
                      </div>
                      {selectedAthlete?.id === a.id && (
                        <div style={{ width: '24px', height: '24px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={13} color="#000" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => selectedAthlete && setStep(1)}
                disabled={!selectedAthlete}
                style={{ ...S.btnPrimary, opacity: selectedAthlete ? 1 : 0.3, display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                DALJE <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: BLOK INFO ─────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '50px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>KORAK 2/5 · {selectedAthlete?.full_name}</div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, marginBottom: '12px' }}>NOVI<br/><span style={{ color: 'rgba(255,255,255,0.25)' }}>BLOK</span></h1>
            </div>

            <div style={{ ...S.card, maxWidth: '600px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

                <div>
                  <label style={S.label}>NAZIV BLOKA</label>
                  <input style={S.input} value={blockName} onChange={e => setBlockName(e.target.value)}
                    placeholder="npr. Hypertrophy Block 1"
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div>
                  <label style={S.label}>CILJ BLOKA</label>
                  <input style={S.input} value={blockGoal} onChange={e => setBlockGoal(e.target.value)}
                    placeholder="npr. Povećanje volumena i radnog kapaciteta"
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={S.label}>POČETAK</label>
                    <input type="date" style={S.input} value={blockStart} onChange={e => setBlockStart(e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div>
                    <label style={S.label}>BROJ TJEDANA</label>
                    <select style={{ ...S.input, cursor: 'pointer' }} value={blockWeekCount} onChange={e => setBlockWeekCount(Number(e.target.value))}>
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n} style={{ background: '#1a1a1a' }}>{n} tjedna</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>PREGLED</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    {fmt(blockStart)} → {fmt(addDays(blockStart, blockWeekCount * 7 - 1))}
                    <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '12px' }}>· {blockWeekCount * 3} treninga</span>
                  </div>
                </div>

              </div>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(0)} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={12} /> NATRAG
              </button>
              <button
                onClick={() => { generateWeeks(); setStep(2) }}
                disabled={!blockName}
                style={{ ...S.btnPrimary, opacity: blockName ? 1 : 0.3, display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                GENERIRAJ TJEDNE <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: TJEDNI PREGLED ────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>KORAK 3/5 · {selectedAthlete?.full_name}</div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, marginBottom: '12px' }}>
                TJEDNI<br/><span style={{ color: 'rgba(255,255,255,0.25)' }}>STRUKTURA</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Podesi nazive i datume treninga po tjednima.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ ...S.card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>TJEDAN {week.week_number}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                        {fmt(week.start_date)} — {fmt(week.end_date)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setWeeks(prev => {
                          const next = structuredClone(prev)
                          next[wi].workouts.push(newWorkout(`Trening ${String.fromCharCode(65 + next[wi].workouts.length)}`, addDays(week.start_date, next[wi].workouts.length * 2)))
                          return next
                        })
                      }}
                      style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={12} /> TRENING
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {week.workouts.map((wo, woi) => (
                      <div key={woi} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <input
                            value={wo.day_name}
                            onChange={e => setWeeks(prev => { const next = structuredClone(prev); next[wi].workouts[woi].day_name = e.target.value; return next })}
                            style={{ ...S.input, padding: '6px 10px', fontSize: '0.8rem', width: 'auto', flex: 1, marginRight: '8px' }}
                          />
                          <button onClick={() => setWeeks(prev => { const next = structuredClone(prev); next[wi].workouts.splice(woi, 1); return next })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '6px', transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,80,80,0.7)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <input
                          type="date"
                          value={wo.workout_date}
                          onChange={e => setWeeks(prev => { const next = structuredClone(prev); next[wi].workouts[woi].workout_date = e.target.value; return next })}
                          style={{ ...S.input, padding: '6px 10px', fontSize: '0.75rem' }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
                          {wo.exercises.length} vježbi
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={12} /> NATRAG
              </button>
              <button onClick={() => setStep(3)} style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                DODAJ VJEŽBE <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: VJEŽBE ────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>KORAK 4/5 · {selectedAthlete?.full_name}</div>
              <h1 style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1, marginBottom: '12px' }}>
                VJEŽBE<br/><span style={{ color: 'rgba(255,255,255,0.25)' }}>PO TRENINZIMA</span>
              </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>

              {/* Left: week/workout selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {weeks.map((week, wi) => (
                  <div key={wi}>
                    <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', padding: '10px 12px 6px', fontWeight: 700 }}>
                      TJEDAN {week.week_number}
                    </div>
                    {week.workouts.map((wo, woi) => {
                      const isActive = activeWeekIdx === wi && activeWorkoutIdx === woi
                      return (
                        <button key={woi} onClick={() => { setActiveWeekIdx(wi); setActiveWorkoutIdx(woi); setExpandedExercise(null) }} style={{
                          width: '100%', textAlign: 'left', padding: '12px 16px',
                          background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                          border: '1px solid', borderColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                          cursor: 'pointer', transition: '0.2s', fontFamily: "'DM Mono', monospace",
                          marginBottom: '4px',
                        }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>{wo.day_name}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{fmt(wo.workout_date)} · {wo.exercises.length} vj.</div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Right: exercise editor */}
              {currentWorkout && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '4px' }}>{currentWorkout.day_name}</h3>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{fmt(currentWorkout.workout_date)}</div>
                    </div>
                    <button
                      onClick={() => setShowExercisePicker(true)}
                      style={{ ...S.btnPrimary, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Plus size={14} /> DODAJ VJEŽBU
                    </button>
                  </div>

                  {currentWorkout.exercises.length === 0 ? (
                    <div style={{ ...S.card, textAlign: 'center', padding: '60px', borderStyle: 'dashed' }}>
                      <Dumbbell size={28} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', margin: 0 }}>
                        Klikni "DODAJ VJEŽBU" za početak
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentWorkout.exercises.map((ex, ei) => (
                        <div key={ei} style={{
                          border: '1px solid', borderColor: expandedExercise === ei ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                          background: expandedExercise === ei ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                          transition: '0.2s',
                        }}>
                          {/* Exercise header */}
                          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                            onClick={() => setExpandedExercise(expandedExercise === ei ? null : ei)}
                          >
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, width: '24px' }}>{String(ei + 1).padStart(2, '0')}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '3px' }}>{ex.exercise_name || 'Nepoznata vježba'}</div>
                              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
                                {ex.planned_sets}×{ex.planned_reps} · {ex.planned_weight_kg}kg · RPE {ex.planned_rpe}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); removeExercise(ei) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', transition: '0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,80,80,0.7)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                            >
                              <Trash2 size={14} />
                            </button>
                            <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {expandedExercise === ei ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>

                          {/* Expanded fields */}
                          {expandedExercise === ei && (
                            <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ paddingTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                                {[
                                  { key: 'planned_sets', label: 'SETOVI', type: 'number' },
                                  { key: 'planned_reps', label: 'PONAVLJANJA', type: 'text' },
                                  { key: 'planned_weight_kg', label: 'KILAŽA (kg)', type: 'number' },
                                  { key: 'planned_rpe', label: 'RPE', type: 'number' },
                                  { key: 'planned_rest_seconds', label: 'ODMOR (s)', type: 'number' },
                                ].map(f => (
                                  <div key={f.key}>
                                    <label style={S.label}>{f.label}</label>
                                    <input
                                      type={f.type}
                                      value={(ex as any)[f.key]}
                                      onChange={e => updateExercise(ei, f.key as keyof WorkoutExercise, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                      style={{ ...S.input, padding: '8px 12px', fontSize: '0.85rem' }}
                                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginTop: '14px' }}>
                                <label style={S.label}>NAPOMENA ZA ATLETA</label>
                                <input
                                  value={ex.notes}
                                  onChange={e => updateExercise(ei, 'notes', e.target.value)}
                                  placeholder="Tehnika, fokus, uputa..."
                                  style={{ ...S.input, padding: '8px 12px', fontSize: '0.85rem' }}
                                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(2)} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={12} /> NATRAG
              </button>
              <button onClick={() => setStep(4)} style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                PREGLED <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: PREGLED & SAVE ────────────────────────────── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>KORAK 5/5 · FINALNI PREGLED</div>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, marginBottom: '12px' }}>
                PREGLED<br/><span style={{ color: 'rgba(255,255,255,0.25)' }}>& SPREMI</span>
              </h1>
            </div>

            {savedSuccess ? (
              // Success state
              <div style={{ ...S.card, textAlign: 'center', padding: '80px', borderColor: 'rgba(100,255,100,0.3)', background: 'rgba(100,255,100,0.05)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(100,255,100,0.15)', border: '1px solid rgba(100,255,100,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <Check size={28} color="rgba(100,255,100,0.9)" />
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: '12px', color: 'rgba(100,255,100,0.9)' }}>BLOK KREIRAN!</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>
                  Trening program za {selectedAthlete?.full_name} je uspješno dodan.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button onClick={() => { setStep(0); setSelectedAthlete(null); setBlockName(''); setBlockGoal(''); setWeeks([]); setSavedSuccess(false) }}
                    style={{ ...S.btnPrimary }}>
                    NOVI BLOK
                  </button>
                  <button onClick={() => router.push('/training')} style={{ ...S.btnSecondary }}>
                    NA TRENING
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={S.card}>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>BLOK INFO</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        ['ATLET', selectedAthlete?.full_name],
                        ['NAZIV', blockName],
                        ['CILJ', blockGoal || '—'],
                        ['TRAJANJE', `${fmt(blockStart)} → ${fmt(addDays(blockStart, blockWeekCount * 7 - 1))}`],
                        ['TJEDNA', blockWeekCount],
                      ].map(([k, v]) => (
                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontSize: '0.65rem' }}>{k}</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={S.card}>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>STATISTIKA</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        ['UKUPNO TJEDANA', weeks.length],
                        ['UKUPNO TRENINGA', weeks.reduce((a, w) => a + w.workouts.filter(wo => wo.exercises.length > 0).length, 0)],
                        ['UKUPNO VJEŽBI', weeks.reduce((a, w) => a + w.workouts.reduce((b, wo) => b + wo.exercises.length, 0), 0)],
                      ].map(([k, v]) => (
                        <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontSize: '0.65rem' }}>{k}</span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Week breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ ...S.card, padding: '20px 30px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>TJEDAN {week.week_number}</span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{fmt(week.start_date)} — {fmt(week.end_date)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {week.workouts.filter(wo => wo.exercises.length > 0).map((wo, woi) => (
                            <div key={woi} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                              {wo.day_name} <span style={{ color: 'rgba(255,255,255,0.4)' }}>({wo.exercises.length})</span>
                            </div>
                          ))}
                          {week.workouts.filter(wo => wo.exercises.length > 0).length === 0 && (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,80,80,0.6)' }}>Nema vježbi</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {saveError && (
                  <div style={{ padding: '16px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,80,80,0.9)', fontSize: '0.8rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={16} /> {saveError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setStep(3)} style={{ ...S.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={12} /> NATRAG
                  </button>
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: '10px', opacity: saving ? 0.7 : 1, minWidth: '180px', justifyContent: 'center' }}
                  >
                    {saving ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        SPREMA...
                      </>
                    ) : (
                      <><Save size={14} /> SPREMI BLOK</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ══ EXERCISE PICKER MODAL ═════════════════════════════════ */}
      {showExercisePicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px', animation: 'fadeIn 0.2s ease',
        }} onClick={() => setShowExercisePicker(false)}>
          <div style={{
            width: '100%', maxWidth: '700px', background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.3em', fontWeight: 700 }}>ODABERI VJEŽBU</div>
              <button onClick={() => setShowExercisePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <input
                autoFocus
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder="Pretraži vježbe..."
                style={{ ...S.input, padding: '10px 14px' }}
              />
            </div>

            {/* Exercise list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0' }}>
              {Object.entries(exercisesByCategory).map(([cat, exList]) => (
                <div key={cat}>
                  <div style={{ padding: '10px 30px 6px', fontSize: '0.58rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{cat}</div>
                  {exList.map(ex => (
                    <button key={ex.id} onClick={() => addExercise(ex)} style={{
                      width: '100%', textAlign: 'left', padding: '12px 30px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#fff', fontSize: '0.9rem', transition: '0.15s',
                      fontFamily: "'DM Mono', monospace", display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>{ex.name}</span>
                      <Plus size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </button>
                  ))}
                </div>
              ))}
              {Object.keys(exercisesByCategory).length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                  Nema rezultata za "{exerciseSearch}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060606; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.3); cursor: pointer; }
        select option { background: #1a1a1a; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}