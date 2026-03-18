'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Trash2, ChevronDown, ChevronRight, Check, Search, GripVertical, Loader2, LogOut, User, Settings, Zap, Home, BarChart2, FolderOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ── Supabase client ────────────────────────────────────────────────
const supabase = createClient()

// ── Training Navbar ────────────────────────────────────────────────
function TrainingNav({ athleteName, onLogout }: { athleteName: string; onLogout: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const initials = athleteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '64px', display: 'flex', alignItems: 'center', background: 'rgba(10,10,12,0.98)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '40px' }} />
          </Link>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', height: '100%', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)'}
          ><Home size={13} /> POČETNA</Link>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div style={{ width: '6px', height: '6px', background: '#27ae60', borderRadius: '50%', boxShadow: '0 0 8px #27ae60' }} />
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.7)' }}>PROGRAM TRENINGA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 18px', borderLeft: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'} onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'}
            title="Profil & Statistike"
          ><BarChart2 size={15} /></Link>
          <button onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%', padding: '0 20px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0.05) 100%)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fm)', flexShrink: 0 }}>{initials}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>{athleteName || 'Atleta'}</div>
              <div style={{ fontSize: '0.55rem', color: '#27ae60', letterSpacing: '0.15em' }}>AKTIVAN</div>
            </div>
            <ChevronRight size={12} color="rgba(255,255,255,0.3)" style={{ transform: profileOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', padding: '0 20px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff5555'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,60,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          ><LogOut size={13} /> ODJAVA</button>
        </div>
      </nav>
      {profileOpen && (
        <div style={{ position: 'fixed', top: '64px', right: '0', zIndex: 300, width: '260px', background: '#0f0f12', border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'slideDown 0.2s ease' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', marginBottom: '4px' }}>PRIJAVLJEN/A KAO</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{athleteName}</div>
          </div>
          {[{icon:<User size={13}/>,label:'Moj profil'},{icon:<Settings size={13}/>,label:'Postavke'},{icon:<Zap size={13}/>,label:'Statistike'}].map(item=>(
            <button key={item.label} style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.55)',fontSize:'0.8rem',fontFamily:'var(--fm)',transition:'all 0.15s',textAlign:'left'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.04)';(e.currentTarget as HTMLButtonElement).style.color='#fff'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.55)'}}
            >{item.icon}{item.label}</button>
          ))}
          <div style={{padding:'8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <button onClick={onLogout} style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'10px 12px',background:'rgba(255,60,60,0.06)',border:'1px solid rgba(255,60,60,0.15)',cursor:'pointer',color:'#ff7070',fontSize:'0.78rem',fontFamily:'var(--fm)',fontWeight:700,letterSpacing:'0.1em',transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,60,60,0.12)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,60,60,0.06)'}}
            ><LogOut size={13}/> ODJAVA IZ SUSTAVA</button>
          </div>
        </div>
      )}
      {profileOpen && <div style={{position:'fixed',inset:0,zIndex:199}} onClick={()=>setProfileOpen(false)}/>}
    </>
  )
}


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

type BlockSummary = {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
}

// ── Scroll reveal ──────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Exercise picker modal ──────────────────────────────────────────
function ExercisePicker({
  exercises,
  onSelect,
  onClose,
}: {
  exercises: Exercise[]
  onSelect: (ex: Exercise) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  const cats = Array.from(new Set(exercises.map(e => e.category))).sort()
  const filtered = exercises.filter(e => {
    const matchQ = e.name.toLowerCase().includes(q.toLowerCase())
    const matchCat = !selectedCat || e.category === selectedCat
    return matchQ && matchCat
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: '680px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '80vh', animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>ODABERI VJEŽBU</div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 14px', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >✕ ZATVORI</button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px' }}>
            <Search size={14} color="rgba(255,255,255,0.3)" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Pretraži vježbe..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.9rem', width: '100%', fontFamily: 'var(--fm)' }}
            />
          </div>
        </div>

        {/* Category filters */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => setSelectedCat(null)} style={{ padding: '5px 14px', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--fm)', background: !selectedCat ? '#fff' : 'transparent', color: !selectedCat ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${!selectedCat ? '#fff' : 'rgba(255,255,255,0.1)'}` }}>
            SVE
          </button>
          {cats.map(c => (
            <button key={c} onClick={() => setSelectedCat(c === selectedCat ? null : c)} style={{ padding: '5px 14px', fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--fm)', background: selectedCat === c ? '#fff' : 'transparent', color: selectedCat === c ? '#000' : 'rgba(255,255,255,0.4)', border: `1px solid ${selectedCat === c ? '#fff' : 'rgba(255,255,255,0.1)'}` }}>
              {c}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>Nema rezultata</div>
          ) : (
            filtered.map((ex, i) => (
              <div key={ex.id}
                onClick={() => { onSelect(ex); onClose() }}
                style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '2px', fontFamily: 'var(--fm)' }}>{ex.name}</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{ex.category}</div>
                </div>
                <Plus size={14} color="rgba(255,255,255,0.3)" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
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

// ── Workout Exercise Row ───────────────────────────────────────────
function ExerciseRow({
  we, onUpdate, onDelete
}: {
  we: WorkoutExercise
  onUpdate: (id: string, data: Partial<WorkoutExercise>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px', background: 'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.02) 100%)', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', alignItems: 'center', padding: '10px 12px' }}>
        <GripVertical size={14} color="rgba(255,255,255,0.15)" style={{ cursor: 'grab' }} />

        {/* Name */}
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{we.exercise?.name ?? '—'}</div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{we.exercise?.category}</div>
        </div>

        {/* Sets */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>SERI</div>
          <EditableField value={we.planned_sets} placeholder="3" type="number" small
            onSave={v => onUpdate(we.id, { planned_sets: Number(v) || 1 })} />
        </div>

        {/* Reps */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>PONOV</div>
          <EditableField value={we.planned_reps} placeholder="5" small
            onSave={v => onUpdate(we.id, { planned_reps: v })} />
        </div>

        {/* Weight */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>KG</div>
          <EditableField value={we.planned_weight_kg} placeholder="—" type="number" small
            onSave={v => onUpdate(we.id, { planned_weight_kg: v ? Number(v) : null })} />
        </div>

        {/* RPE */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '3px' }}>RPE</div>
          <EditableField value={we.planned_rpe} placeholder="—" type="number" small
            onSave={v => onUpdate(we.id, { planned_rpe: v ? Number(v) : null })} />
        </div>

        {/* Delete */}
        <button onClick={() => onDelete(we.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expand for notes / extra fields */}
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.2)', fontSize: '0.58rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {expanded ? 'SAKRIJ DETALJE' : 'VIŠE DETALJA'}
      </button>

      {expanded && (
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', animation: 'fadeUp 0.25s ease' }}>
          {[
            { label: 'TEMPO', key: 'planned_tempo' as keyof WorkoutExercise, placeholder: 'npr. 3010' },
            { label: 'ODMOR (sek)', key: 'planned_rest_seconds' as keyof WorkoutExercise, placeholder: '90', type: 'number' },
            { label: 'NAPOMENA', key: 'notes' as keyof WorkoutExercise, placeholder: 'Bilješka...' },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', marginBottom: '6px' }}>{f.label}</div>
              <EditableField value={we[f.key] as string | number | null} placeholder={f.placeholder} type={f.type}
                onSave={v => onUpdate(we.id, { [f.key]: v || null })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Workout Card ───────────────────────────────────────────────────
function WorkoutCard({
  workout, exercises, onUpdateWorkout, onDeleteWorkout,
  onAddExercise, onUpdateExercise, onDeleteExercise,
}: {
  workout: Workout
  exercises: Exercise[]
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void
  onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void
  onDeleteExercise: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const exCount = workout.workout_exercises?.length ?? 0

  return (
    <>
      <div style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', marginBottom: '8px', transition: 'border-color 0.3s' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
          {/* Day indicator */}
          <div style={{ width: '4px', alignSelf: 'stretch', background: workout.completed ? '#27ae60' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s', flexShrink: 0 }} />

          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Arrow */}
            <div style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight size={14} />
            </div>

            {/* Day name */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', letterSpacing: '0.03em' }}
                onClick={e => e.stopPropagation()}>
                <EditableField value={workout.day_name} placeholder="Dan treninga" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', marginTop: '3px', letterSpacing: '0.08em' }}>
                {workout.workout_date} · {exCount} {exCount === 1 ? 'vježba' : exCount < 5 ? 'vježbe' : 'vježbi'}
              </div>
            </div>

            {/* Completed badge */}
            <div onClick={e => { e.stopPropagation(); onUpdateWorkout(workout.id, { completed: !workout.completed }) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', border: `1px solid ${workout.completed ? '#27ae60' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s', background: workout.completed ? 'rgba(39,174,96,0.1)' : 'transparent' }}>
              {workout.completed ? <Check size={11} color="#27ae60" /> : <div style={{ width: '11px', height: '11px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '2px' }} />}
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.2em', color: workout.completed ? '#27ae60' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                {workout.completed ? 'GOTOVO' : 'ODRADITI'}
              </span>
            </div>

            {/* Delete */}
            <div onClick={e => { e.stopPropagation(); onDeleteWorkout(workout.id) }}
              style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}
            >
              <Trash2 size={13} />
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {open && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px', animation: 'fadeUp 0.3s ease' }}>
            {/* Column headers */}
            {(workout.workout_exercises?.length ?? 0) > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 80px 80px 60px 32px', gap: '8px', padding: '0 12px 8px', marginBottom: '4px' }}>
                {['', 'VJEŽBA', 'SERI', 'PONOV', 'KG', 'RPE', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textAlign: i > 1 ? 'center' : 'left', fontFamily: 'var(--fm)' }}>{h}</div>
                ))}
              </div>
            )}

            {/* Exercises */}
            {workout.workout_exercises?.map(we => (
              <ExerciseRow key={we.id} we={we} onUpdate={onUpdateExercise} onDelete={onDeleteExercise} />
            ))}

            {/* Add exercise */}
            <button onClick={() => setShowPicker(true)} style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.68rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
            >
              <Plus size={12} /> DODAJ VJEŽBU
            </button>

            {/* Workout notes */}
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em', marginBottom: '6px' }}>BILJEŠKA TRENINGA</div>
              <EditableField value={workout.notes} placeholder="Dodaj bilješku..." onSave={v => onUpdateWorkout(workout.id, { notes: v || null })} />
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          onSelect={ex => onAddExercise(workout.id, ex)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

// ── Week Panel ─────────────────────────────────────────────────────
function WeekPanel({
  week, exercises, onDeleteWeek, onUpdateWeek,
  onAddWorkout, onUpdateWorkout, onDeleteWorkout,
  onAddExercise, onUpdateExercise, onDeleteExercise,
}: {
  week: Week
  exercises: Exercise[]
  onDeleteWeek: (id: string) => void
  onUpdateWeek: (id: string, data: Partial<Week>) => void
  onAddWorkout: (weekId: string) => void
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void
  onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void
  onDeleteExercise: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const completedCount = week.workouts?.filter(w => w.completed).length ?? 0
  const totalCount = week.workouts?.length ?? 0

  return (
    <div style={{ marginBottom: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.01) 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Week header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 24px', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
        onClick={() => setOpen(!open)}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', minWidth: '32px' }}>
          W{week.week_number}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700, fontFamily: 'var(--fm)' }}>
              Tjedan {week.week_number}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
              {week.start_date} — {week.end_date}
            </span>
          </div>
          {totalCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <div style={{ height: '3px', width: '80px', background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(completedCount / totalCount) * 100}%`, background: '#27ae60', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
              </div>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>{completedCount}/{totalCount}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'none' }}>
            <ChevronRight size={14} />
          </div>
          <div onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }}
            style={{ color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}
          >
            <Trash2 size={13} />
          </div>
        </div>
      </div>

      {/* Workouts */}
      {open && (
        <div style={{ padding: '16px' }}>
          {week.workouts?.map(w => (
            <WorkoutCard key={w.id} workout={w} exercises={exercises}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise}
            />
          ))}

          <button onClick={() => onAddWorkout(week.id)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.65rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            <Plus size={12} /> DODAJ DAN TRENINGA
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function TrainingPage() {
  const [block, setBlock] = useState<Block | null>(null)
  const [allBlocks, setAllBlocks] = useState<BlockSummary[]>([])
  const [showBlockSelector, setShowBlockSelector] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [athleteName, setAthleteName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Load user + data ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Nisi prijavljen/a. Molimo se prijavi da pristupiš treningu.'); setLoading(false); return }
        setUserId(user.id)

        // Load athlete name from profile
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setAthleteName(profile?.full_name ?? user.email?.split('@')[0] ?? 'Atleta')

        // Load exercises
        const { data: exData } = await supabase.from('exercises').select('*').order('category').order('name')
        setExercises(exData ?? [])

        // Load or create active block
        let { data: blockData } = await supabase
          .from('blocks')
          .select(`*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))`)
          .eq('athlete_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!blockData) {
          // Create first block
          const today = new Date()
          const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
          const { data: newBlock } = await supabase.from('blocks').insert({
            athlete_id: user.id,
            name: 'Moj program',
            start_date: today.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'active',
          }).select('*').single()
          blockData = { ...newBlock, weeks: [] }
        }

        // Sort weeks and workouts
        if (blockData?.weeks) {
          blockData.weeks.sort((a: Week, b: Week) => a.week_number - b.week_number)
          blockData.weeks.forEach((w: Week) => {
            if (w.workouts) {
              w.workouts.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
              w.workouts.forEach((wo: Workout) => {
                if (wo.workout_exercises) {
                  wo.workout_exercises.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order)
                }
              })
            }
          })
        }

        setBlock(blockData)

        // Load all blocks for selector
        const { data: allBlocksData } = await supabase
          .from('blocks')
          .select('id, name, status, start_date, end_date')
          .eq('athlete_id', user.id)
          .order('created_at', { ascending: false })
        setAllBlocks((allBlocksData ?? []) as BlockSummary[])

      } catch (e) {
        setError('Greška pri učitavanju. Pokušaj ponovo.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ── Add week ─────────────────────────────────────────────────────
  const addWeek = async () => {
    if (!block || !userId) return
    setSaving(true)
    const existingWeeks = block.weeks ?? []
    const weekNum = existingWeeks.length + 1
    const lastEnd = existingWeeks.length > 0
      ? new Date(existingWeeks[existingWeeks.length - 1].end_date)
      : new Date(block.start_date)
    const startDate = new Date(lastEnd); if (existingWeeks.length > 0) startDate.setDate(startDate.getDate() + 1)
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6)

    const { data, error } = await supabase.from('weeks').insert({
      block_id: block.id,
      week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    }).select('*').single()

    if (!error && data) {
      setBlock(b => b ? { ...b, weeks: [...(b.weeks ?? []), { ...data, workouts: [] }] } : b)
    }
    setSaving(false)
  }

  // ── Add new block ────────────────────────────────────────────────
  const addBlock = async (name: string) => {
    if (!userId) return
    setSaving(true)
    const today = new Date()
    const endDate = new Date(today); endDate.setDate(today.getDate() + 84)
    const { data } = await supabase.from('blocks').insert({
      athlete_id: userId, name,
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    }).select('id, name, status, start_date, end_date').single()
    if (data) {
      setAllBlocks(b => [data as BlockSummary, ...b])
      await switchBlock(data.id)
    }
    setSaving(false)
  }

  // ── Switch active block ───────────────────────────────────────────
  const switchBlock = async (blockId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*, exercise:exercises(*))))')
      .eq('id', blockId).single()
    if (data) {
      data.weeks?.sort((a: Week, b: Week) => a.week_number - b.week_number)
      data.weeks?.forEach((w: Week) => {
        w.workouts?.sort((a: Workout, b: Workout) => a.workout_date.localeCompare(b.workout_date))
        w.workouts?.forEach((wo: Workout) => {
          wo.workout_exercises?.sort((a: WorkoutExercise, b: WorkoutExercise) => a.exercise_order - b.exercise_order)
        })
      })
      setBlock(data)
    }
    setShowBlockSelector(false)
    setLoading(false)
  }

  // ── Delete week ───────────────────────────────────────────────────
  const deleteWeek = async (weekId: string) => {
    await supabase.from('weeks').delete().eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.filter(w => w.id !== weekId) } : b)
  }

  // ── Update week ───────────────────────────────────────────────────
  const updateWeek = async (weekId: string, data: Partial<Week>) => {
    await supabase.from('weeks').update(data).eq('id', weekId)
    setBlock(b => b ? { ...b, weeks: b.weeks?.map(w => w.id === weekId ? { ...w, ...data } : w) } : b)
  }

  // ── Add workout ───────────────────────────────────────────────────
  const addWorkout = async (weekId: string) => {
    if (!userId) return
    setSaving(true)
    const week = block?.weeks?.find(w => w.id === weekId)
    if (!week) return
    const existingDays = week.workouts?.length ?? 0
    const workoutDate = new Date(week.start_date)
    workoutDate.setDate(workoutDate.getDate() + existingDays)

    const { data, error } = await supabase.from('workouts').insert({
      week_id: weekId,
      athlete_id: userId,
      day_name: `Dan ${existingDays + 1}`,
      workout_date: workoutDate.toISOString().split('T')[0],
      completed: false,
    }).select('*').single()

    if (!error && data) {
      setBlock(b => b ? {
        ...b,
        weeks: b.weeks?.map(w => w.id === weekId
          ? { ...w, workouts: [...(w.workouts ?? []), { ...data, workout_exercises: [] }] }
          : w)
      } : b)
    }
    setSaving(false)
  }

  // ── Update workout ────────────────────────────────────────────────
  const updateWorkout = async (workoutId: string, data: Partial<Workout>) => {
    await supabase.from('workouts').update(data).eq('id', workoutId)
    setBlock(b => b ? {
      ...b,
      weeks: b.weeks?.map(w => ({
        ...w,
        workouts: w.workouts?.map(wo => wo.id === workoutId ? { ...wo, ...data } : wo)
      }))
    } : b)
  }

  // ── Delete workout ────────────────────────────────────────────────
  const deleteWorkout = async (workoutId: string) => {
    await supabase.from('workouts').delete().eq('id', workoutId)
    setBlock(b => b ? {
      ...b,
      weeks: b.weeks?.map(w => ({ ...w, workouts: w.workouts?.filter(wo => wo.id !== workoutId) }))
    } : b)
  }

  // ── Add exercise to workout ───────────────────────────────────────
  const addExercise = async (workoutId: string, ex: Exercise) => {
    setSaving(true)
    const workout = block?.weeks?.flatMap(w => w.workouts ?? []).find(w => w.id === workoutId)
    const order = (workout?.workout_exercises?.length ?? 0) + 1

    const { data, error } = await supabase.from('workout_exercises').insert({
      workout_id: workoutId,
      exercise_id: ex.id,
      exercise_order: order,
      planned_sets: 3,
      planned_reps: '5',
    }).select('*, exercise:exercises(*)').single()

    if (!error && data) {
      setBlock(b => b ? {
        ...b,
        weeks: b.weeks?.map(w => ({
          ...w,
          workouts: w.workouts?.map(wo => wo.id === workoutId
            ? { ...wo, workout_exercises: [...(wo.workout_exercises ?? []), data] }
            : wo)
        }))
      } : b)
    }
    setSaving(false)
  }

  // ── Update workout exercise ───────────────────────────────────────
  const updateExercise = async (weId: string, data: Partial<WorkoutExercise>) => {
    await supabase.from('workout_exercises').update(data).eq('id', weId)
    setBlock(b => b ? {
      ...b,
      weeks: b.weeks?.map(w => ({
        ...w,
        workouts: w.workouts?.map(wo => ({
          ...wo,
          workout_exercises: wo.workout_exercises?.map(we => we.id === weId ? { ...we, ...data } : we)
        }))
      }))
    } : b)
  }

  // ── Delete workout exercise ───────────────────────────────────────
  const deleteExercise = async (weId: string) => {
    await supabase.from('workout_exercises').delete().eq('id', weId)
    setBlock(b => b ? {
      ...b,
      weeks: b.weeks?.map(w => ({
        ...w,
        workouts: w.workouts?.map(wo => ({
          ...wo,
          workout_exercises: wo.workout_exercises?.filter(we => we.id !== weId)
        }))
      }))
    } : b)
  }

  // ── Stats ─────────────────────────────────────────────────────────
  const totalWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).length ?? 0
  const completedWorkouts = block?.weeks?.flatMap(w => w.workouts ?? []).filter(w => w.completed).length ?? 0
  const totalExercises = block?.weeks?.flatMap(w => w.workouts ?? []).flatMap(w => w.workout_exercises ?? []).length ?? 0

  return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative', overflowX: 'hidden' }}>

      {/* Layered bg */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(39,174,96,0.04) 0%,transparent 70%)' }} />
      </div>

      <TrainingNav athleteName={athleteName} onLogout={handleLogout} />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{ paddingTop: '88px', padding: '88px 60px 40px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1)' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.56rem', letterSpacing: '0.55em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>
                {loading ? '...' : `${athleteName.toUpperCase()} · PROGRAM TRENINGA`}
              </div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,5vw,5rem)', fontWeight: 800, lineHeight: 0.88, margin: 0, letterSpacing: '-0.02em' }}>
                {loading ? 'UČITAVANJE' : (block?.name?.toUpperCase() ?? 'MOJ PROGRAM')}<br />
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>PLAN</span>
              </h1>
            </div>

            {/* Stats */}
            {!loading && block && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                {[
                  { val: block.weeks?.length ?? 0, label: 'TJEDANA', color: '#fff' },
                  { val: totalWorkouts, label: 'TRENINGA', color: '#fff' },
                  { val: `${completedWorkouts}/${totalWorkouts}`, label: 'GOTOVO', color: completedWorkouts > 0 ? '#4ade80' : '#fff' },
                  { val: `${Math.round(totalWorkouts > 0 ? (completedWorkouts/totalWorkouts)*100 : 0)}%`, label: 'NAPREDAK', color: '#fff' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '18px 24px', background: '#08080a', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.28em', marginTop: '5px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Block selector bar */}
          {!loading && block && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                {/* Block switcher */}
                <button onClick={() => setShowBlockSelector(!showBlockSelector)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', transition: 'background 0.2s', borderRight: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                >
                  <FolderOpen size={14} color="rgba(255,255,255,0.35)" />
                  <div>
                    <div style={{ fontSize: '0.55rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.25)', marginBottom: '2px', fontFamily: 'var(--fm)' }}>AKTIVNI BLOK</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)' }}>{block.name}</div>
                  </div>
                  <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft: 'auto', transform: showBlockSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Editable name */}
                <div style={{ padding: '12px 20px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontFamily: 'var(--fm)' }}>NAZIV</div>
                  <EditableField value={block.name} placeholder="Naziv programa"
                    onSave={async v => {
                      await supabase.from('blocks').update({ name: v }).eq('id', block.id)
                      setBlock(b => b ? { ...b, name: v } : b)
                      setAllBlocks(bs => bs.map(b2 => b2.id === block.id ? { ...b2, name: v } : b2) as BlockSummary[])
                    }}
                  />
                </div>

                {/* New block button */}
                <button onClick={async () => {
                  const name = prompt('Naziv novog bloka:')
                  if (name?.trim()) await addBlock(name.trim())
                }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                ><Plus size={12} /> NOVI BLOK</button>

                {saving && <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', borderLeft: '1px solid rgba(255,255,255,0.06)' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /></div>}
              </div>

              {/* Block dropdown */}
              {showBlockSelector && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0f0f12', border: '1px solid rgba(255,255,255,0.12)', borderTop: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'slideDown 0.2s ease', maxHeight: '300px', overflowY: 'auto' }}>
                  {allBlocks.map((b: BlockSummary) => (
                    <button key={b.id} onClick={() => switchBlock(b.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: b.id === block.id ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = b.id === block.id ? 'rgba(255,255,255,0.05)' : 'transparent'}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.status === 'active' ? '#4ade80' : b.status === 'completed' ? '#60a5fa' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: b.id === block.id ? '#fff' : 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)' }}>{b.name}</div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginTop: '2px' }}>{b.start_date} — {b.end_date}</div>
                      </div>
                      {b.id === block.id && <Check size={13} color="#4ade80" />}
                    </button>
                  ))}
                </div>
              )}
              {showBlockSelector && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowBlockSelector(false)} />}
            </div>
          )}
        </div>
      </section>

      {/* ── CONTENT ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 60px 120px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '80px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em' }}>UČITAVANJE PROGRAMA...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '20px 24px', background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.2)', color: 'rgba(255,100,100,0.9)', fontSize: '0.85rem', marginBottom: '32px' }}>
              {error}
            </div>
          )}

          {/* Weeks */}
          {!loading && block && (
            <>
              {(block.weeks?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', marginBottom: '16px', opacity: 0.15 }}>00</div>
                  <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em', marginBottom: '32px' }}>PROGRAM JE PRAZAN — DODAJ PRVI TJEDAN</div>
                </div>
              )}

              {block.weeks?.map(week => (
                <WeekPanel
                  key={week.id}
                  week={week}
                  exercises={exercises}
                  onDeleteWeek={deleteWeek}
                  onUpdateWeek={updateWeek}
                  onAddWorkout={addWorkout}
                  onUpdateWorkout={updateWorkout}
                  onDeleteWorkout={deleteWorkout}
                  onAddExercise={addExercise}
                  onUpdateExercise={updateExercise}
                  onDeleteExercise={deleteExercise}
                />
              ))}

              {/* Add week button */}
              <button onClick={addWeek} style={{ width: '100%', padding: '20px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '0.72rem', letterSpacing: '0.3em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.25s', marginTop: '8px' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Plus size={14} />
                DODAJ TJEDAN {block.weeks ? `${block.weeks.length + 1}` : '1'}
              </button>
            </>
          )}
        </div>
      </section>

      <style>{`
        @keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown{ from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  )
}