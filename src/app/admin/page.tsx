'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut, User, Settings, Home,
  BarChart2, FolderOpen, Copy, MessageSquare, Shield,
  AlertCircle, X, Edit3, ChevronLeft, Eye, Dumbbell, Trophy
} from 'lucide-react'
import { CompetitionsManager } from './competitions-manager'

const supabase = createClient()

// ── Types ──────────────────────────────────────────────────────────
type Exercise = {
  id: string
  name: string
  category: string
  notes: string | null
}

type WorkoutExercise = {
  id: string
  workout_id: string
  exercise_id: string
  exercise_order: number
  planned_sets: number
  planned_reps: string | null
  planned_weight_kg: number | null
  planned_rpe: number | null
  planned_rest_seconds: number | null
  planned_tempo: string | null
  actual_sets: number | null
  actual_reps: string | null
  actual_weight_kg: number | null
  actual_rpe: number | null
  notes: string | null
  completed: boolean
  exercise?: Exercise
}

type Workout = {
  id: string
  week_id: string
  athlete_id: string
  day_name: string
  workout_date: string
  completed: boolean
  notes: string | null
  overall_rpe: number | null
  duration_minutes: number | null
  workout_exercises?: WorkoutExercise[]
}

type Week = {
  id: string
  block_id: string
  week_number: number
  start_date: string
  end_date: string
  notes: string | null
  workouts?: Workout[]
}

type Block = {
  id: string
  athlete_id: string
  name: string
  start_date: string
  end_date: string
  goal: string | null
  status: 'active' | 'completed' | 'planned'
  notes: string | null
  weeks?: Week[]
}

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

// ── Inline editable field ──────────────────────────────────────────
function EditableField({
  value, placeholder, onSave, type = 'text', small = false
}: {
  value: string | number | null
  placeholder: string
  onSave: (v: string) => void
  type?: string
  small?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(String(value ?? '')) }, [value])

  const commit = () => { setEditing(false); onSave(val) }

  if (editing) return (
    <input
      ref={inputRef}
      type={type}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: small ? '3px 8px' : '5px 10px', fontSize: small ? '0.72rem' : '0.85rem', outline: 'none', width: '100%', fontFamily: 'var(--fm)', minWidth: '60px' }}
    />
  )

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: small ? '0.72rem' : '0.85rem', fontFamily: 'var(--fm)', borderBottom: '1px dashed rgba(255,255,255,0.15)', paddingBottom: '1px', transition: 'color 0.2s' }}
      title="Klikni za uređivanje"
    >
      {value ?? placeholder}
    </span>
  )
}

// ── Exercise Picker ────────────────────────────────────────────────
function ExercisePicker({ exercises, onSelect, onClose }: { exercises: Exercise[]; onSelect: (ex: Exercise) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const cats = Array.from(new Set(exercises.map(e => e.category))).sort()
  const filtered = exercises.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) && (!selectedCat || e.category === selectedCat))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '680px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>ODABERI VJEŽBU</div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 14px', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>✕ ZATVORI</button>
        </div>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px' }}>
            <Search size={14} color="rgba(255,255,255,0.3)" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraži vježbe..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem', width: '100%', fontFamily: 'var(--fm)' }} />
          </div>
        </div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedCat(null)} style={{ padding: '5px 14px', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fm)', background: !selectedCat ? '#fff' : 'transparent', color: !selectedCat ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${!selectedCat ? '#fff' : 'rgba(255,255,255,0.1)'}` }}>SVE</button>
          {cats.map(c => <button key={c} onClick={() => setSelectedCat(c === selectedCat ? null : c)} style={{ padding: '5px 14px', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--fm)', background: selectedCat === c ? '#fff' : 'transparent', color: selectedCat === c ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${selectedCat === c ? '#fff' : 'rgba(255,255,255,0.1)'}` }}>{c}</button>)}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(ex => (
            <div key={ex.id} onClick={() => { onSelect(ex); onClose() }} style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, fontFamily: 'var(--fm)' }}>{ex.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{ex.category}</div>
              </div>
              <Plus size={14} color="rgba(255,255,255,0.3)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Exercise Row ───────────────────────────────────────────────────
function ExerciseRow({ we, onUpdate, onDelete }: { we: WorkoutExercise; onUpdate: (id: string, data: Partial<WorkoutExercise>) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px', background: 'rgba(255,255,255,0.02)' }}>
      <div className="ex-row-grid" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', alignItems: 'center', padding: '10px 12px' }}>
        <GripVertical size={14} color="rgba(255,255,255,0.15)" style={{ cursor: 'grab' }} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{we.exercise?.name ?? '—'}</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{we.exercise?.category}</div>
        </div>
        {[
          { label: 'SETS', key: 'planned_sets' as keyof WorkoutExercise, type: 'number' },
          { label: 'REPS', key: 'planned_reps' as keyof WorkoutExercise, type: 'text' },
          { label: 'KG', key: 'planned_weight_kg' as keyof WorkoutExercise, type: 'number' },
          { label: 'RPE', key: 'planned_rpe' as keyof WorkoutExercise, type: 'number' },
        ].map(f => (
          <div key={f.key} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>{f.label}</div>
            <EditableField value={we[f.key] as string | number | null} placeholder="—" type={f.type} small
              onSave={v => onUpdate(we.id, { [f.key]: f.type === 'number' ? (v ? Number(v) : null) : (v || null) })} />
          </div>
        ))}
        <button onClick={() => onDelete(we.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4444'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
          <Trash2 size={13} />
        </button>
      </div>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.2)', fontSize: '0.58rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}{expanded ? 'SAKRIJ' : 'VIŠE'}
      </button>
      {expanded && (
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[{ label: 'TEMPO', key: 'planned_tempo' as keyof WorkoutExercise, placeholder: '3010' }, { label: 'ODMOR (sek)', key: 'planned_rest_seconds' as keyof WorkoutExercise, placeholder: '90', type: 'number' }, { label: 'NAPOMENA', key: 'notes' as keyof WorkoutExercise, placeholder: 'Bilješka...' }].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '6px' }}>{f.label}</div>
              <EditableField value={we[f.key] as string | number | null} placeholder={f.placeholder} type={f.type} onSave={v => onUpdate(we.id, { [f.key]: v || null })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Workout Card ───────────────────────────────────────────────────
function WorkoutCard({ workout, exercises, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }:
  { workout: Workout; exercises: Exercise[]; onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void; onAddExercise: (workoutId: string, ex: Exercise) => void; onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const exCount = workout.workout_exercises?.length ?? 0

  return (
    <>
      <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
          <div style={{ width: '4px', alignSelf: 'stretch', background: workout.completed ? '#27ae60' : 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
          <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'none' }}><ChevronRight size={14} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }} onClick={e => e.stopPropagation()}>
                <EditableField value={workout.day_name} placeholder="Dan treninga" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{workout.workout_date} · {exCount} vježbi</div>
            </div>
            <div onClick={e => { e.stopPropagation(); onUpdateWorkout(workout.id, { completed: !workout.completed }) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', border: `1px solid ${workout.completed ? '#27ae60' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', background: workout.completed ? 'rgba(39,174,96,0.1)' : 'transparent' }}>
              {workout.completed ? <Check size={11} color="#27ae60" /> : <div style={{ width: '11px', height: '11px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '2px' }} />}
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.2em', color: workout.completed ? '#27ae60' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 700 }}>{workout.completed ? 'GOTOVO' : 'ODRADITI'}</span>
            </div>
            <div onClick={e => { e.stopPropagation(); onDeleteWorkout(workout.id) }} style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff4444'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
              <Trash2 size={13} />
            </div>
          </div>
        </div>
        {open && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px' }}>
            {(workout.workout_exercises?.length ?? 0) > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', padding: '0 12px 8px' }}>
                {['', 'VJEŽBA', 'SERI', 'PONOV', 'KG', 'RPE', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textAlign: i > 1 ? 'center' : 'left', fontFamily: 'var(--fm)' }}>{h}</div>
                ))}
              </div>
            )}
            {workout.workout_exercises?.map(we => <ExerciseRow key={we.id} we={we} onUpdate={onUpdateExercise} onDelete={onDeleteExercise} />)}
            <button onClick={() => setShowPicker(true)} style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
              <Plus size={12} /> DODAJ VJEŽBU
            </button>
          </div>
        )}
      </div>
      {showPicker && <ExercisePicker exercises={exercises} onSelect={ex => onAddExercise(workout.id, ex)} onClose={() => setShowPicker(false)} />}
    </>
  )
}

// ── Week Panel ─────────────────────────────────────────────────────
function WeekPanel({ week, exercises, onDeleteWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }:
  { week: Week; exercises: Exercise[]; onDeleteWeek: (id: string) => void; onAddWorkout: (weekId: string) => void; onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void; onAddExercise: (workoutId: string, ex: Exercise) => void; onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void }) {
  const [open, setOpen] = useState(true)
  const completedCount = week.workouts?.filter(w => w.completed).length ?? 0
  const totalCount = week.workouts?.length ?? 0

  return (
    <div style={{ marginBottom: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none' }} onClick={() => setOpen(!open)}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', minWidth: '32px' }}>W{week.week_number}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 700, fontFamily: 'var(--fm)' }}>Tjedan {week.week_number}</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{week.start_date} — {week.end_date}</span>
          </div>
          {totalCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
              <div style={{ height: '2px', width: '60px', background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(completedCount / totalCount) * 100}%`, background: '#27ae60', transition: 'width 0.6s' }} />
              </div>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>{completedCount}/{totalCount}</span>
            </div>
          )}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'none' }}><ChevronRight size={14} /></div>
        <div onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }} style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4444'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
          <Trash2 size={13} />
        </div>
      </div>
      {open && (
        <div style={{ padding: '14px' }}>
          {week.workouts?.map(w => <WorkoutCard key={w.id} workout={w} exercises={exercises} onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout} onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise} />)}
          <button onClick={() => onAddWorkout(week.id)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
            <Plus size={12} /> DODAJ DAN
          </button>
        </div>
      )}
    </div>
  )
}

// ── Duplicate Block Modal ──────────────────────────────────────────
function DuplicateModal({ block, athletes, onConfirm, onClose }:
  { block: Block; athletes: AthleteProfile[]; onConfirm: (targetAthleteId: string, newName: string) => void; onClose: () => void }) {
  const [targetId, setTargetId] = useState('')
  const [newName, setNewName] = useState(`${block.name} (kopija)`)
  const others = athletes.filter(a => a.id !== block.athlete_id && a.role === 'lifter')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#0d0d10', border: '1px solid rgba(255,255,255,0.12)', padding: '32px', animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.5em', color: 'rgba(255,255,255,0.25)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>DUPLICIRAJ BLOK</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', marginBottom: '28px' }}>{block.name}</div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontFamily: 'var(--fm)' }}>NAZIV KOPIJE</div>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontFamily: 'var(--fm)' }}>KOPIRAJ NA LIFERA</div>
          {others.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontFamily: 'var(--fm)', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>Nema drugih lifera.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {others.map(a => (
                <button key={a.id} onClick={() => setTargetId(a.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: targetId === a.id ? 'rgba(255,255,255,0.07)' : 'transparent', border: `1px solid ${targetId === a.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0, fontFamily: 'var(--fm)' }}>
                    {a.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{a.full_name}</div>
                  {targetId === a.id && <Check size={13} color="#4ade80" style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>ODUSTANI</button>
          <button onClick={() => { if (targetId && newName) { onConfirm(targetId, newName); onClose() } }}
            disabled={!targetId || !newName}
            style={{ flex: 1, padding: '12px', background: targetId && newName ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', color: targetId && newName ? '#000' : 'rgba(255,255,255,0.2)', cursor: targetId && newName ? 'pointer' : 'not-allowed', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
            <Copy size={12} style={{ display: 'inline', marginRight: '6px' }} />DUPLICIRAJ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Athlete Detail Panel ───────────────────────────────────────────
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
  const [allBlocks, setAllBlocks] = useState<Block[]>([])
  const [notes, setNotes] = useState<AthleteNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [activeTab, setActiveTab] = useState<'program' | 'stats' | 'notes' | 'tips'>('program')
  const [duplicateBlock, setDuplicateBlock] = useState<Block | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const [tips, setTips]                   = useState<any[]>([])
  const [newTipTitle, setNewTipTitle]     = useState('')
  const [newTipContent, setNewTipContent] = useState('')
  const [newTipCat, setNewTipCat]         = useState('general')

  const initials = athlete.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const totalWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).length ?? 0
  const completedWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).filter(w => w.completed).length ?? 0
  const totalEx = block?.weeks?.flatMap(w => w.workouts ?? []).flatMap(w => w.workout_exercises ?? []).length ?? 0
  const progress = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

  useEffect(() => { loadData() }, [athlete.id])

  const loadData = async () => {
    setLoadingBlock(true)
    // Load blocks
    const { data: blocksData } = await supabase.from('blocks').select('id, name, status, start_date, end_date, goal, notes, athlete_id').eq('athlete_id', athlete.id).order('created_at', { ascending: false })
    setAllBlocks((blocksData ?? []) as Block[])

    // Load active block with full data
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
      setBlock(activeBlock)
    } else {
      setBlock(null)
    }

    // Load notes
    const { data: notesData } = await supabase.from('athlete_notes').select('*').eq('athlete_id', athlete.id).order('created_at', { ascending: false })
    setNotes((notesData ?? []) as AthleteNote[])
    // Load coach tips
    const { data: tipsData } = await supabase.from('coach_tips').select('*').eq('athlete_id', athlete.id).order('priority', { ascending: false }).order('created_at', { ascending: false })
    setTips(tipsData ?? [])
    setLoadingBlock(false)
  }

  const switchBlock = async (blockId: string) => {
    setLoadingBlock(true)
    const { data } = await supabase.from('blocks').select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))').eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order))
      })
      setBlock(data)
    }
    setShowBlockMenu(false)
    setLoadingBlock(false)
  }

  const createBlock = async () => {
    const name = prompt('Naziv novog bloka:')
    if (!name?.trim()) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data } = await supabase.from('blocks').insert({
      athlete_id: athlete.id, name: name.trim(),
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('*').single()
    if (data) {
      setAllBlocks(b => [{ ...data, weeks: [] } as Block, ...b])
      setBlock({ ...data, weeks: [] } as Block)
    }
    setSaving(false)
  }

  const addWeek = async () => {
    if (!block) return
    setSaving(true)
    const existingWeeks = block.weeks ?? []
    const weekNum = existingWeeks.length + 1
    const lastEnd = existingWeeks.length > 0 ? new Date(existingWeeks[existingWeeks.length - 1].end_date) : new Date(block.start_date)
    const startDate = new Date(lastEnd); if (existingWeeks.length > 0) startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)
    const { data, error } = await supabase.from('weeks').insert({ block_id: block.id, week_number: weekNum, start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] }).select('*').single()
    if (!error && data) setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...data, workouts: [] }] } : b)
    setSaving(false)
  }

  const deleteWeek = async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
  }

  const addWorkout = async (weekId: string) => {
    setSaving(true)
    const week = block?.weeks?.find(w => w.id === weekId)
    if (!week) return
    const existingDays = week.workouts?.length ?? 0
    const workoutDate = new Date(week.start_date); workoutDate.setDate(workoutDate.getDate() + existingDays)
    const { data, error } = await supabase.from('workouts').insert({ week_id: weekId, athlete_id: athlete.id, day_name: `Dan ${existingDays + 1}`, workout_date: workoutDate.toISOString().split('T')[0], completed: false }).select('*').single()
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

  const updateExercise = async (weId: string, data: Partial<WorkoutExercise>) => {
    await supabase.from('workout_exercises').update(data).eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...data } : we) })) })) } : b)
  }

  const deleteExercise = async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => ({ ...wo, workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId) })) })) } : b)
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    const { data, error } = await supabase.from('athlete_notes').insert({ athlete_id: athlete.id, admin_id: adminId, content: newNote.trim() }).select('*').single()
    if (!error && data) { setNotes(n => [data as AthleteNote, ...n]); setNewNote('') }
  }

  const deleteNote = async (noteId: string) => {
    await supabase.from('athlete_notes').delete().eq('id', noteId)
    setNotes(n => n.filter(x => x.id !== noteId))
  }

  const duplicateBlockTo = async (targetAthleteId: string, newName: string) => {
    if (!duplicateBlock) return
    setSaving(true)
    // Create new block
    const { data: newBlock } = await supabase.from('blocks').insert({
      athlete_id: targetAthleteId, name: newName,
      start_date: duplicateBlock.start_date, end_date: duplicateBlock.end_date,
      status: 'planned', goal: duplicateBlock.goal
    }).select('*').single()
    if (!newBlock) { setSaving(false); return }
    // Duplicate weeks and workouts
    for (const week of (duplicateBlock.weeks ?? [])) {
      const { data: newWeek } = await supabase.from('weeks').insert({ block_id: newBlock.id, week_number: week.week_number, start_date: week.start_date, end_date: week.end_date }).select('*').single()
      if (!newWeek) continue
      for (const workout of (week.workouts ?? [])) {
        const { data: newWorkout } = await supabase.from('workouts').insert({ week_id: newWeek.id, athlete_id: targetAthleteId, day_name: workout.day_name, workout_date: workout.workout_date, completed: false, notes: workout.notes }).select('*').single()
        if (!newWorkout) continue
        for (const we of (workout.workout_exercises ?? [])) {
          await supabase.from('workout_exercises').insert({ workout_id: newWorkout.id, exercise_id: we.exercise_id, exercise_order: we.exercise_order, planned_sets: we.planned_sets, planned_reps: we.planned_reps, planned_weight_kg: we.planned_weight_kg, planned_rpe: we.planned_rpe, planned_tempo: we.planned_tempo, planned_rest_seconds: we.planned_rest_seconds })
        }
      }
    }
    setSaving(false)
    alert('Blok uspješno dupliciran!')
    onRefresh()
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Back + Header */}
      <div className="admin-athlete-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
          <ChevronLeft size={13} /> NAZAD
        </button>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.05) 100%)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fm)', flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', lineHeight: 1 }}>{athlete.full_name}</div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: '4px' }}>
            {athlete.email} · <span style={{ color: '#4ade80' }}>LIFTER</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="admin-detail-stats" style={{ marginLeft: 'auto', display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[{ val: allBlocks.length, label: 'BLOKOVA' }, { val: totalWorkouts, label: 'TRENINGA' }, { val: `${progress}%`, label: 'NAPREDAK' }].map((s, i) => (
            <div key={i} style={{ padding: '12px 20px', background: '#08080a', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
        {([['program', 'PROGRAM'], ['stats', 'STATISTIKE'], ['notes', 'BILJEŠKE'], ['tips', 'HUB TIPS']] as [string, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            style={{ padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.3)', borderBottom: `2px solid ${activeTab === tab ? '#fff' : 'transparent'}`, transition: 'all 0.2s', marginBottom: '-1px' }}>
            {label}
          </button>
        ))}
      </div>

      {/* PROGRAM TAB */}
      {activeTab === 'program' && (
        <div>
          {/* Block bar */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowBlockMenu(!showBlockMenu)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <FolderOpen size={14} color="rgba(255,255,255,0.3)" />
                <div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '2px' }}>AKTIVNI BLOK</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{block?.name ?? 'Nema bloka'}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto', transform: showBlockMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {block && (
                <button onClick={() => setDuplicateBlock(block)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}>
                  <Copy size={12} /> DUPLICIRAJ
                </button>
              )}
              <button onClick={createBlock} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}>
                <Plus size={12} /> NOVI BLOK
              </button>
              {saving && <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}><Loader2 size={12} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} /></div>}
            </div>

            {showBlockMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0f0f12', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: '280px', overflowY: 'auto' }}>
                {allBlocks.map(b => (
                  <button key={b.id} onClick={() => switchBlock(b.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', background: b.id === block?.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = b.id === block?.id ? 'rgba(255,255,255,0.04)' : 'transparent'}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.status === 'active' ? '#4ade80' : b.status === 'completed' ? '#60a5fa' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{b.name}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{b.start_date} — {b.end_date}</div>
                    </div>
                    {b.id === block?.id && <Check size={12} color="#4ade80" />}
                  </button>
                ))}
              </div>
            )}
            {showBlockMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowBlockMenu(false)} />}
          </div>

          {loadingBlock ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em' }}>UČITAVANJE...</span>
            </div>
          ) : !block ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '3rem', opacity: 0.1, marginBottom: '12px' }}>00</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '24px' }}>NEMA AKTIVNOG BLOKA</div>
              <button onClick={createBlock} style={{ padding: '12px 28px', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700 }}>+ KREIRAJ PRVI BLOK</button>
            </div>
          ) : (
            <>
              {(block.weeks?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '16px' }}>BLOK JE PRAZAN — DODAJ TJEDAN</div>
              )}
              {block.weeks?.map(week => (
                <WeekPanel key={week.id} week={week} exercises={exercises} onDeleteWeek={deleteWeek} onAddWorkout={addWorkout} onUpdateWorkout={updateWorkout} onDeleteWorkout={deleteWorkout} onAddExercise={addExercise} onUpdateExercise={updateExercise} onDeleteExercise={deleteExercise} />
              ))}
              <button onClick={addWeek} style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.68rem', letterSpacing: '0.3em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
                <Plus size={13} /> DODAJ TJEDAN {block.weeks ? `${block.weeks.length + 1}` : '1'}
              </button>
            </>
          )}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
            {[
              { val: allBlocks.length, label: 'UKUPNO BLOKOVA', sub: `${allBlocks.filter(b => b.status === 'active').length} aktivnih` },
              { val: totalWorkouts, label: 'TRENINGA U BLOKU', sub: `${completedWorkouts} završenih` },
              { val: totalEx, label: 'VJEŽBI U BLOKU', sub: 'planirano' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '28px 24px', background: '#08080a', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2.5rem', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>{s.val}</div>
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.28em', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)' }}>NAPREDAK AKTIVNOG BLOKA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)' }}>{progress}%</div>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress > 66 ? '#4ade80' : progress > 33 ? '#facc15' : '#f87171', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{completedWorkouts} završeno</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{totalWorkouts - completedWorkouts} preostalo</span>
            </div>
          </div>

          {/* All blocks list */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>SVI BLOKOVI</div>
            {allBlocks.length === 0 ? (
              <div style={{ padding: '24px', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center' }}>Nema blokova.</div>
            ) : allBlocks.map(b => (
              <div key={b.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.status === 'active' ? '#4ade80' : b.status === 'completed' ? '#60a5fa' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{b.name}</div>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{b.start_date} — {b.end_date}</div>
                </div>
                <div style={{ fontSize: '0.6rem', color: b.status === 'active' ? '#4ade80' : b.status === 'completed' ? '#60a5fa' : 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700 }}>{b.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIPS TAB — personalizirani coaching tips vidljivi u Hubu */}
      {activeTab === 'tips' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {/* Add tip form */}
          <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>NOVI HUB TIP ZA LIFERA</div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Category selector */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[['general','Opće','#888'],['technique','Tehnika','#6b8cff'],['nutrition','Prehrana','#22c55e'],['competition','Natjecanje','#f59e0b'],['recovery','Oporavak','#f472b6']].map(([id,label,color]) => (
                  <button key={id} onClick={() => setNewTipCat(id)}
                    style={{ padding: '4px 12px', border: `1px solid ${newTipCat === id ? color : 'rgba(255,255,255,0.1)'}`, background: newTipCat === id ? `${color}18` : 'transparent', color: newTipCat === id ? color : '#666', borderRadius: '5px', cursor: 'pointer', fontSize: '0.6rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
              <input value={newTipTitle} onChange={e => setNewTipTitle(e.target.value)} placeholder="Naslov tipa..."
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--fm)', width: '100%', boxSizing: 'border-box' as const }} />
              <textarea value={newTipContent} onChange={e => setNewTipContent(e.target.value)} placeholder="Sadržaj — savjet, uputa, bilješka trenera..."
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--fm)', resize: 'vertical', minHeight: '80px', width: '100%', boxSizing: 'border-box' as const, lineHeight: 1.6 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={async () => {
                  if (!newTipTitle.trim() || !newTipContent.trim()) return
                  const { data } = await supabase.from('coach_tips').insert({ athlete_id: athlete.id, admin_id: adminId, title: newTipTitle.trim(), content: newTipContent.trim(), category: newTipCat }).select('*').single()
                  if (data) { setTips((t: any[]) => [data, ...t]); setNewTipTitle(''); setNewTipContent('') }
                }} disabled={!newTipTitle.trim() || !newTipContent.trim()}
                  style={{ padding: '9px 20px', background: newTipTitle.trim() && newTipContent.trim() ? '#fff' : 'rgba(255,255,255,0.06)', border: 'none', color: newTipTitle.trim() && newTipContent.trim() ? '#000' : 'rgba(255,255,255,0.2)', cursor: newTipTitle.trim() ? 'pointer' : 'not-allowed', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, borderRadius: '6px', transition: 'all 0.2s' }}>
                  OBJAVI TIP
                </button>
              </div>
            </div>
          </div>
          {/* Tips list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tips.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px' }}>Nema hub tipova za ovog lifera.</div>
            ) : tips.map((tip: any) => {
              const catColors: Record<string,string> = { general:'#888', technique:'#6b8cff', nutrition:'#22c55e', competition:'#f59e0b', recovery:'#f472b6' }
              const c = catColors[tip.category] ?? '#888'
              return (
                <div key={tip.id} style={{ padding: '14px 18px', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${c}`, borderRadius: '6px', background: `${c}06`, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.46rem', color: c, letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, marginRight: '8px' }}>{tip.category.toUpperCase()}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--fm)' }}>{tip.title}</span>
                    </div>
                    <button onClick={async () => { await supabase.from('coach_tips').delete().eq('id', tip.id); setTips((t: any[]) => t.filter((x: any) => x.id !== tip.id)) }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', padding: '2px', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>{tip.content}</p>
                  <div style={{ fontSize: '0.56rem', color: '#444', marginTop: '8px' }}>{new Date(tip.created_at).toLocaleDateString('hr-HR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {/* New note */}
          <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>NOVA BILJEŠKA ZA LIFERA</div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Upiši bilješku, feedback, ili uputu..."
              style={{ width: '100%', minHeight: '100px', background: 'transparent', border: 'none', padding: '16px 18px', color: '#fff', fontSize: '0.88rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={addNote} disabled={!newNote.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', background: newNote.trim() ? '#fff' : 'rgba(255,255,255,0.06)', border: 'none', color: newNote.trim() ? '#000' : 'rgba(255,255,255,0.2)', cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>
                <MessageSquare size={12} /> POŠALJI BILJEŠKU
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', letterSpacing: '0.15em', border: '1px dashed rgba(255,255,255,0.08)' }}>Nema bilješki za ovog lifera.</div>
            ) : notes.map(note => (
              <div key={note.id} style={{ padding: '16px 18px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                <div style={{ fontSize: '0.88rem', color: '#fff', lineHeight: 1.6, fontFamily: 'var(--fm)', marginBottom: '10px' }}>{note.content}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{new Date(note.created_at).toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  <button onClick={() => deleteNote(note.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', transition: 'color 0.2s', padding: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff4444'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {duplicateBlock && (
        <DuplicateModal block={duplicateBlock} athletes={allAthletes} onConfirm={duplicateBlockTo} onClose={() => setDuplicateBlock(null)} />
      )}
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
  const [dashSection, setDashSection] = useState<'athletes' | 'competitions'>('athletes')
  const [error, setError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

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
    // Load all profiles with lifter or other roles
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('full_name')

    if (data) {
      // Load emails from auth.users - NOTE: requires service role in production
      // For now we use profile data only
      const withBlocks = await Promise.all(data.map(async (p) => {
        const { data: blocks } = await supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', p.id)
        const { data: notes } = await supabase.from('athlete_notes').select('id').eq('athlete_id', p.id)
        return { ...p, blocks: blocks ?? [], notes: notes ?? [] } as AthleteProfile
      }))
      setAthletes(withBlocks)
    }
  }

  const updateRole = async (athleteId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', athleteId)
    setAthletes(a => a.map(x => x.id === athleteId ? { ...x, role: newRole } : x))
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
  const totalNotes = athletes.reduce((s, a) => s + ((a.notes as any[])?.length ?? 0), 0)

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
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative' }}>

      {/* BG */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: '-150px', right: '-150px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(220,38,38,0.04) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 70%)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '56px', display: 'flex', alignItems: 'center', padding: '0 clamp(16px,3vw,32px)', background: 'rgba(4,4,8,0.92)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.09)', transition: 'background 0.4s' }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: '28px', flexShrink: 0 }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '28px', opacity: 0.95 }} />
        </Link>

        {/* Nav links */}
        <div className="tnav-links" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
          {[{ href: '/', label: 'Početna' }, { href: '/training', label: 'Trening' }, { href: '/profile', label: 'Profil' }].map(item => (
            <Link key={item.href} href={item.href} className="tnav-pill"
              style={{ textDecoration: 'none', padding: '6px 14px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--fm)', letterSpacing: '0.01em', borderRadius: '8px', transition: 'all 0.18s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right — admin badge + avatar */}
        <div className="tnav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

          {/* Admin badge pill */}
          <div className="tnav-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '20px' }}>
            <div style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 5px #ef4444' }} />
              <div style={{ position: 'absolute', inset: '-3px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', animation: 'pingPulse 2.4s ease-in-out infinite' }} />
            </div>
            <span style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>Admin</span>
          </div>

          {/* Avatar / profile dropdown */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button onClick={() => setProfileOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 10px 5px 5px', background: profileOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (!profileOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
              onMouseLeave={e => { if (!profileOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3e1a1a 0%, #1e0a0a 100%)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--fm)', flexShrink: 0 }}>
                {adminName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <span className="tnav-name" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#e0e0e8', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>{adminName.split(' ')[0] || 'Admin'}</span>
              <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
            </button>

            {profileOpen && (
              <div className="profile-dropdown" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'rgba(10,10,16,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)', zIndex: 300, animation: 'dropDown 0.2s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', backdropFilter: 'blur(40px)' }}>
                {/* Header */}
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3e1a1a 0%, #1e0a0a 100%)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#f87171' }}>
                      {adminName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f0f8', fontFamily: 'var(--fm)' }}>{adminName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                        <Shield size={9} color="#ef4444" />
                        <span style={{ fontSize: '0.54rem', color: '#f87171', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>ADMINISTRATOR</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Menu items */}
                <div style={{ padding: '6px' }}>
                  {[
                    { href: '/profile', icon: <User size={14}/>, label: 'Moj profil' },
                    { href: '/training', icon: <Dumbbell size={14}/>, label: 'Trening' },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                      <button className="nav-menu-item">{item.icon}<span>{item.label}</span></button>
                    </Link>
                  ))}
                </div>
                <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button onClick={() => { setProfileOpen(false); handleLogout() }} className="nav-menu-item nav-menu-logout">
                    <LogOut size={14}/><span>Odjava</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

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
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.6em', color: 'rgba(255,255,255,0.2)', marginBottom: '10px' }}>LWLUP · UPRAVLJANJE LIFERIMA</div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,4.5vw,4.5rem)', fontWeight: 800, lineHeight: 0.88, margin: '0 0 28px', letterSpacing: '-0.02em' }}>
                ADMIN<br /><span style={{ color: 'rgba(255,255,255,0.15)' }}>PANEL</span>
              </h1>

              {/* Section switcher */}
              <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', width: 'fit-content', marginBottom: '32px' }}>
                {([['athletes', 'Lifteri'], ['competitions', 'Natjecanja']] as [string,string][]).map(([sec, label]) => (
                  <button key={sec} onClick={() => setDashSection(sec as 'athletes'|'competitions')}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', background: dashSection === sec ? 'rgba(255,255,255,0.1)' : 'transparent', border: dashSection === sec ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: dashSection === sec ? 700 : 400, color: dashSection === sec ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '0.04em' }}>
                    {sec === 'competitions' && <Trophy size={13} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Summary stats */}
              <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', maxWidth: '600px' }}>
                {[
                  { val: totalAthletes, label: 'LIFERA', color: '#fff' },
                  { val: activeBlocks, label: 'AKT. BLOKOVA', color: '#4ade80' },
                  { val: athletes.reduce((s, a) => s + ((a.blocks as Block[])?.length ?? 0), 0), label: 'UK. BLOKOVA', color: '#fff' },
                  { val: totalNotes, label: 'BILJEŠKI', color: '#facc15' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '18px 20px', background: '#08080a', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {dashSection === 'competitions' && <CompetitionsManager />}

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

        @media (max-width: 640px) { .tnav-status { display: none !important; } }
        @media (max-width: 520px) { .tnav-name { display: none !important; } }
        @media (max-width: 480px) {
          .tnav-links { display: none !important; }
          .tnav-right { margin-left: auto; }
        }

        /* ─ Main content padding ─ */
        @media (max-width: 600px) {
          .admin-outer { padding: 20px 16px 80px !important; }
        }

        /* ─ Dashboard stats: 4→2 cols ─ */
        @media (max-width: 600px) {
          .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; max-width: 100% !important; }
        }

        /* ─ Search row: stack on mobile ─ */
        @media (max-width: 480px) {
          .admin-search-row { flex-direction: column; align-items: stretch !important; }
          .admin-search-row > div { max-width: 100% !important; }
          .admin-search-row > button { justify-content: center; }
        }

        /* ─ Athlete cards: responsive grid ─ */
        .admin-athlete-grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .admin-athlete-grid > div { flex: 0 0 160px; }
        @media (max-width: 480px) {
          .admin-athlete-grid { gap: 10px; }
          .admin-athlete-grid > div { flex: 1 1 calc(50% - 5px); max-width: calc(50% - 5px); }
          .admin-athlete-grid > div > div { width: 100% !important; }
        }

        /* ─ Athlete detail header: wrap on mobile ─ */
        @media (max-width: 600px) {
          .admin-athlete-header { gap: 12px !important; }
          .admin-detail-stats { margin-left: 0 !important; width: 100%; }
          .admin-detail-stats > div { flex: 1; }
        }

        /* ─ Tabs: scrollable on mobile ─ */
        @media (max-width: 600px) {
          .admin-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .admin-tabs button { white-space: nowrap; padding: 10px 14px !important; font-size: 0.58rem !important; }
        }

        /* ─ Exercise row grid: simplified on mobile ─ */
        @media (max-width: 480px) {
          .ex-row-grid { grid-template-columns: 1fr 48px 64px 48px !important; }
          .ex-row-grid > :first-child,
          .ex-row-grid > :nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  )
}