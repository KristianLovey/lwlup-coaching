'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, Settings,
  FolderOpen, Copy, Bell,
  AlertCircle, ChevronLeft, Eye, Trophy, Send
} from 'lucide-react'
import { CompetitionsManager } from './competitions-manager'
import { AppNav } from '../training/training-components'

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
function ExerciseRow({ we, onUpdate, onDelete, dragHandleProps, isDragging }: {
  we: WorkoutExercise
  onUpdate: (id: string, data: Partial<WorkoutExercise>) => void
  onDelete: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: `1px solid ${isDragging ? 'rgba(107,140,255,0.5)' : 'rgba(255,255,255,0.06)'}`, marginBottom: '4px', background: isDragging ? 'rgba(107,140,255,0.06)' : 'rgba(255,255,255,0.02)', transition: 'border-color 0.18s, background 0.18s' }}>
      <div className="ex-row-grid" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', alignItems: 'center', padding: '10px 12px' }}>
        <div className="ex-row-drag" {...dragHandleProps} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', padding: '4px', color: isDragging ? 'rgba(107,140,255,0.8)' : 'rgba(255,255,255,0.2)', transition: 'color 0.18s', ...(dragHandleProps?.style) }}>
          <GripVertical size={14} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{we.exercise?.name ?? '—'}</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{we.exercise?.category}</div>
        </div>
        {[
          { label: 'SETS', key: 'planned_sets' as keyof WorkoutExercise, type: 'number', cls: 'ex-row-sets' },
          { label: 'REPS', key: 'planned_reps' as keyof WorkoutExercise, type: 'text', cls: '' },
          { label: 'KG', key: 'planned_weight_kg' as keyof WorkoutExercise, type: 'number', cls: '' },
          { label: 'RPE', key: 'planned_rpe' as keyof WorkoutExercise, type: 'number', cls: 'ex-row-rpe' },
        ].map(f => (
          <div key={f.key} className={f.cls} style={{ textAlign: 'center' }}>
            <div className="ex-label" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>{f.label}</div>
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
function WorkoutCard({ workout, exercises, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise, onReorderExercises }:
  { workout: Workout; exercises: Exercise[]; onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void; onAddExercise: (workoutId: string, ex: Exercise) => void; onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void; onReorderExercises: (workoutId: string, orderedIds: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [orderedExercises, setOrderedExercises] = useState<WorkoutExercise[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOverId = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exCount = workout.workout_exercises?.length ?? 0

  useEffect(() => {
    setOrderedExercises(workout.workout_exercises ?? [])
  }, [workout.workout_exercises])

  const handleDragStart = (id: string) => {
    setDraggingId(id)
  }

  const handleDragEnter = (id: string) => {
    if (!draggingId || id === draggingId) return
    dragOverId.current = id
    setOrderedExercises(prev => {
      const from = prev.findIndex(e => e.id === draggingId)
      const to = prev.findIndex(e => e.id === id)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleDragEnd = () => {
    if (draggingId) {
      onReorderExercises(workout.id, orderedExercises.map(e => e.id))
    }
    setDraggingId(null)
    dragOverId.current = null
  }

  // Touch drag support
  const touchDragId = useRef<string | null>(null)

  const handleTouchStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      touchDragId.current = id
      handleDragStart(id)
    }, 400)
  }

  const handleTouchMove = (e: React.TouchEvent, containerId: string) => {
    if (!touchDragId.current) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      return
    }
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const row = el?.closest('[data-we-id]')
    if (row) {
      const overId = row.getAttribute('data-we-id')
      if (overId && overId !== touchDragId.current) handleDragEnter(overId)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    if (touchDragId.current) { handleDragEnd(); touchDragId.current = null }
  }

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
            {orderedExercises.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', padding: '0 12px 8px' }}>
                {['', 'VJEŽBA', 'SERI', 'PONOV', 'KG', 'RPE', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textAlign: i > 1 ? 'center' : 'left', fontFamily: 'var(--fm)' }}>{h}</div>
                ))}
              </div>
            )}
            {orderedExercises.map(we => {
              const isDragging = draggingId === we.id
              return (
                <div key={we.id} data-we-id={we.id}
                  onDragOver={e => { e.preventDefault(); handleDragEnter(we.id) }}
                  onDrop={handleDragEnd}
                  style={{
                    transition: 'transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.18s ease, box-shadow 0.18s ease',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    opacity: isDragging ? 0.85 : 1,
                    boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(107,140,255,0.35)' : 'none',
                    borderRadius: isDragging ? '4px' : '0',
                    zIndex: isDragging ? 10 : 'auto',
                    position: 'relative',
                    willChange: 'transform',
                  }}>
                  <ExerciseRow
                    we={we}
                    onUpdate={onUpdateExercise}
                    onDelete={onDeleteExercise}
                    isDragging={isDragging}
                    dragHandleProps={{
                      draggable: true,
                      onDragStart: () => handleDragStart(we.id),
                      onDragEnd: handleDragEnd,
                      onTouchStart: () => handleTouchStart(we.id),
                      onTouchMove: (e) => handleTouchMove(e as unknown as React.TouchEvent, we.id),
                      onTouchEnd: handleTouchEnd,
                      style: { touchAction: 'none' },
                    }}
                  />
                </div>
              )
            })}
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
function WeekPanel({ week, exercises, onDeleteWeek, onCopyWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise, onReorderExercises, onUpdateWeekNotes }:
  { week: Week; exercises: Exercise[]; onDeleteWeek: (id: string) => void; onCopyWeek: (id: string) => void; onAddWorkout: (weekId: string) => void; onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void; onAddExercise: (workoutId: string, ex: Exercise) => void; onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void; onReorderExercises: (workoutId: string, orderedIds: string[]) => void; onUpdateWeekNotes: (id: string, notes: string) => void }) {
  const [open, setOpen] = useState(true)
  const [weekNote, setWeekNote] = useState(week.notes ?? '')
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
        <div onClick={e => { e.stopPropagation(); onCopyWeek(week.id) }} style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }} title="Kopiraj tjedan"
          onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
          <Copy size={13} />
        </div>
        <div onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }} style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4444'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}>
          <Trash2 size={13} />
        </div>
      </div>
      {open && (
        <div style={{ padding: '14px' }}>
          {week.workouts?.map(w => <WorkoutCard key={w.id} workout={w} exercises={exercises} onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout} onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise} onReorderExercises={onReorderExercises} />)}
          <button onClick={() => onAddWorkout(week.id)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
            <Plus size={12} /> DODAJ DAN
          </button>
          {/* Inline week comment */}
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)', marginBottom: '6px' }}>KOMENTAR TJEDNA</div>
            <textarea
              value={weekNote}
              onChange={e => setWeekNote(e.target.value)}
              onBlur={() => onUpdateWeekNotes(week.id, weekNote)}
              placeholder="Dodaj komentar za ovaj tjedan..."
              rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#e0e0f0', padding: '9px 12px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.6, borderRadius: '6px', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.35)'}
            />
          </div>
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
  const [saving, setSaving] = useState(false)
  const [loadingBlock, setLoadingBlock] = useState(false)
  const [activeTab, setActiveTab] = useState<'program' | 'stats'>('program')
  const [duplicateBlock, setDuplicateBlock] = useState<Block | null>(null)
  const [showBlockMenu, setShowBlockMenu] = useState(false)

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

  const copyWeek = async (weekId: string) => {
    if (!block) return
    setSaving(true)
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
        }).select('*, exercise:exercises(*)').single()
        if (nex) newExercises.push(nex as WorkoutExercise)
      }
      newWorkouts.push({ ...nwo, workout_exercises: newExercises })
    }
    setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...newWeek, workouts: newWorkouts }] } : b)
    setSaving(false)
  }

  const updateWeekNotes = async (weekId: string, notes: string) => {
    await supabase.from('weeks').update({ notes: notes || null }).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, notes: notes || null } : w) } : b)
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

  const reorderExercises = async (workoutId: string, orderedIds: string[]) => {
    await Promise.all(orderedIds.map((id, index) =>
      supabase.from('workout_exercises').update({ exercise_order: index + 1 }).eq('id', id)
    ))
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.map(wo => wo.id === workoutId
      ? { ...wo, workout_exercises: orderedIds.map((id, index) => { const ex = wo.workout_exercises?.find(e => e.id === id)!; return { ...ex, exercise_order: index + 1 } }) }
      : wo) })) } : b)
  }

  const deleteBlock = async (blockId: string) => {
    if (!confirm('Briši ovaj blok? Ova radnja je nepovratna i briše sve tjedne i treninge.')) return
    setSaving(true)
    await supabase.from('blocks').delete().eq('id', blockId)
    const remaining = allBlocks.filter(b => b.id !== blockId)
    setAllBlocks(remaining)
    if (block?.id === blockId) {
      if (remaining.length > 0) {
        await switchBlock(remaining[0].id)
      } else {
        setBlock(null)
      }
    }
    setSaving(false)
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
              <div className="stat-val" style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
        {([['program', 'PROGRAM'], ['stats', 'STATISTIKE']] as [string, string][]).map(([tab, label]) => (
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
            <div className="admin-block-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setShowBlockMenu(!showBlockMenu)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', background: 'transparent', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <FolderOpen size={14} color="rgba(255,255,255,0.3)" />
                <div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginBottom: '2px' }}>AKTIVNI BLOK</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{block?.name ?? 'Nema bloka'}</div>
                </div>
                <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto', transform: showBlockMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {block && (
                <>
                  <button onClick={() => setDuplicateBlock(block)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent' }}>
                    <Copy size={12} /> DUPLICIRAJ
                  </button>
                  <button onClick={() => deleteBlock(block.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', fontSize: '0.62rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; e.currentTarget.style.background = 'transparent' }}>
                    <Trash2 size={12} /> BRIŠI BLOK
                  </button>
                </>
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
                <WeekPanel key={week.id} week={week} exercises={exercises} onDeleteWeek={deleteWeek} onCopyWeek={copyWeek} onAddWorkout={addWorkout} onUpdateWorkout={updateWorkout} onDeleteWorkout={deleteWorkout} onAddExercise={addExercise} onUpdateExercise={updateExercise} onDeleteExercise={deleteExercise} onReorderExercises={reorderExercises} onUpdateWeekNotes={updateWeekNotes} />
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
          <div className="admin-stats-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
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
  const [dashSection, setDashSection] = useState<'athletes' | 'competitions' | 'obavijesti' | 'treneri'>('athletes')
  const [notifMsg, setNotifMsg] = useState('')
  const [notifSelected, setNotifSelected] = useState<string[]>([])
  const [notifSending, setNotifSending] = useState(false)
  const [coaches, setCoaches] = useState<AthleteProfile[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // lifter_id → coach_id
  const [assignSaving, setAssignSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

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
  const lifters = athletes.filter(a => a.role === 'lifter')

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
                          SVI LIFTERI
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
                              {sel && <Check size={13} color="#fbbf24" />}
                            </button>
                          )
                        })}
                        {lifters.length === 0 && <div style={{ padding: '16px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nema lifera.</div>}
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
                  {athletes.filter(a => a.role === 'lifter' || a.role === 'trener').length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>Nema korisnika.</div>
                  ) : athletes.filter(a => a.role === 'lifter' || a.role === 'trener').map(lifter => (
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

        /* ─ Section switcher: scrollable on mobile ─ */
        @media (max-width: 600px) {
          .admin-section-switcher {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            width: 100% !important;
            max-width: 100% !important;
          }
          .admin-section-switcher button { white-space: nowrap; flex-shrink: 0; }
        }

        /* ─ Exercise row: stacked layout on mobile ─ */
        @media (max-width: 540px) {
          .ex-row-grid {
            grid-template-columns: 24px 1fr 48px 48px 48px 40px 28px !important;
            gap: 4px !important;
            padding: 8px 8px !important;
          }
          .ex-row-grid .ex-label { display: none !important; }
        }
        @media (max-width: 420px) {
          .ex-row-grid {
            grid-template-columns: 1fr 44px 44px 28px !important;
            gap: 4px !important;
          }
          .ex-row-drag,
          .ex-row-sets,
          .ex-row-rpe { display: none !important; }
        }

        /* ─ Block bar buttons: wrap on mobile ─ */
        @media (max-width: 540px) {
          .admin-block-bar { flex-wrap: wrap !important; }
          .admin-block-bar > button { font-size: 0.56rem !important; padding: 10px 10px !important; }
        }

        /* ─ Detail stats: 1 row on mobile ─ */
        @media (max-width: 480px) {
          .admin-detail-stats { grid-template-columns: repeat(3, 1fr) !important; }
          .admin-detail-stats > div { padding: 10px 8px !important; }
          .admin-detail-stats .stat-val { font-size: 1.1rem !important; }
        }

        /* ─ Stats tab grid: 1 col on small mobile ─ */
        @media (max-width: 420px) {
          .admin-stats-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}