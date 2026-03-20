'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut, Home, BarChart2, FolderOpen,
  User, Shield, Settings, X, ChevronLeft, ChevronUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Exercise = { id: string; name: string; category: string; notes: string | null }
type WorkoutExercise = {
  id: string; workout_id: string; exercise_id: string; exercise_order: number
  planned_sets: number; planned_reps: string | null; planned_weight_kg: number | null
  planned_rpe: number | null; planned_rest_seconds: number | null; planned_tempo: string | null
  target_rpe: number | null        // admin sets target RPE for this exercise
  coach_note: string | null        // admin's note/instruction for the exercise
  actual_sets: number | null; actual_reps: string | null; actual_weight_kg: number | null
  actual_rpe: number | null
  actual_note: string | null       // lifter's own note after completing
  notes: string | null; completed: boolean; exercise?: Exercise
}
type Workout = {
  id: string; week_id: string; athlete_id: string; day_name: string; workout_date: string
  completed: boolean; notes: string | null; overall_rpe: number | null; duration_minutes: number | null
  workout_exercises?: WorkoutExercise[]
}
type Week = {
  id: string; block_id: string; week_number: number; start_date: string; end_date: string
  notes: string | null; workouts?: Workout[]
}
type Block = {
  id: string; athlete_id: string; name: string; start_date: string; end_date: string
  goal: string | null; status: 'active' | 'completed' | 'planned'; notes: string | null; weeks?: Week[]
}
type BlockSummary = { id: string; name: string; status: string; start_date: string; end_date: string }

// ─── NAVBAR ───────────────────────────────────────────────────────
function TrainingNav({ athleteName, isAdmin, onLogout }: {
  athleteName: string; isAdmin: boolean; onLogout: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const initials = athleteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '60px',
      display: 'flex', alignItems: 'center',
      background: 'rgba(8,8,12,0.92)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 32px rgba(0,0,0,0.4)',
    }}>
      {/* Left: logo + home */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%', padding: '0 18px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '36px' }} />
        </Link>
        <Link href="/" style={{
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px',
          height: '100%', padding: '0 18px', borderRight: '1px solid rgba(255,255,255,0.1)',
          color: '#555', fontSize: '0.68rem', letterSpacing: '0.12em', fontWeight: 600,
          fontFamily: 'var(--fm)', transition: 'color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#999'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#555'}
        >
          <Home size={12} /><span className='nav-home-text'> POČETNA</span>
        </Link>
      </div>

      {/* Center */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e' }} />
        <span style={{ fontFamily: 'var(--fd)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.28em', color: '#888' }}>
          PROGRAM TRENINGA
        </span>
      </div>

      {/* Right: profile */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }} ref={dropRef}>
        <button
          onClick={() => setProfileOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            height: '100%', padding: '0 18px',
            background: profileOpen ? '#161618' : 'transparent',
            border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={e => { if (!profileOpen) e.currentTarget.style.background = '#111113' }}
          onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = 'transparent' }}
        >
          {/* Avatar */}
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.1), #12121a)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 700, color: '#ccc', fontFamily: 'var(--fm)',
          }}>{initials}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {athleteName || 'Atleta'}
            </div>
            <div style={{ fontSize: '0.52rem', color: '#22c55e', letterSpacing: '0.1em', lineHeight: 1.2 }}>AKTIVAN</div>
          </div>
          <ChevronDown size={13} color="#444" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {/* Profile dropdown — NO transparency, sharp solid bg */}
        {profileOpen && (
          <div style={{
            position: 'absolute', top: '60px', right: '0',
            width: '220px',
            background: '#0c0c0e',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 56px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
            zIndex: 300,
            animation: 'dropDown 0.18s ease',
          }}>
            {/* Profile header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
              <div style={{ fontSize: '0.58rem', color: '#444', letterSpacing: '0.25em', marginBottom: '3px', fontFamily: 'var(--fm)' }}>PRIJAVLJEN/A KAO</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{athleteName}</div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px' }}>
              <Link href="/profile" onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                <button className="nav-menu-item">
                  <User size={13} color="#666" /> <span>Moj profil</span>
                </button>
              </Link>

              {isAdmin && (
                <Link href="/admin" onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                  <button className="nav-menu-item nav-menu-admin">
                    <Shield size={13} color="#f59e0b" /> <span>Admin panel</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: '#f59e0b22', color: '#f59e0b', padding: '2px 6px', letterSpacing: '0.15em', border: '1px solid #f59e0b44' }}>ADMIN</span>
                  </button>
                </Link>
              )}
            </div>

            {/* Logout */}
            <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.09)' }}>
              <button onClick={() => { setProfileOpen(false); onLogout() }} className="nav-menu-item nav-menu-logout">
                <LogOut size={13} /> <span>Odjava</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ─── EDITABLE FIELD ───────────────────────────────────────────────
function EditableField({ value, placeholder, onSave, type = 'text', small = false }: {
  value: string | number | null; placeholder: string; onSave: (v: string) => void; type?: string; small?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(String(value ?? '')) }, [value])
  const commit = () => { setEditing(false); onSave(val) }
  if (editing) return (
    <input ref={inputRef} type={type} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#e0e0e0', padding: small ? '3px 8px' : '5px 10px', fontSize: small ? '0.72rem' : '0.85rem', outline: 'none', width: '100%', fontFamily: 'var(--fm)', borderRadius: '5px', minWidth: '60px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}
    />
  )
  return (
    <span onClick={() => setEditing(true)}
      style={{ cursor: 'text', color: value ? '#e0e0e0' : '#3a3a45', fontSize: small ? '0.72rem' : '0.85rem', fontFamily: 'var(--fm)', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '1px', transition: 'color 0.15s' }}
      title="Klikni za uređivanje">
      {value ?? placeholder}
    </span>
  )
}

// ─── EXERCISE PICKER ──────────────────────────────────────────────
function ExercisePicker({ exercises, onSelect, onClose }: {
  exercises: Exercise[]; onSelect: (ex: Exercise) => void; onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const cats = Array.from(new Set(exercises.map(e => e.category))).sort()
  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(q.toLowerCase()) && (!cat || e.category === cat)
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s ease' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '560px', background: '#09090e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '78vh', boxShadow: '0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#888', fontFamily: 'var(--fm)' }}>ODABERI VJEŽBU</span>
          <button onClick={onClose} style={{ background: '#1c1c20', border: '1px solid rgba(255,255,255,0.2)', color: '#888', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2a2a35'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1c1c20'; e.currentTarget.style.color = '#888' }}>
            <X size={13} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', padding: '9px 14px', borderRadius: '8px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
            <Search size={13} color="#555" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraži vježbe..."
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e0e0e0', fontSize: '0.88rem', width: '100%', fontFamily: 'var(--fm)' }} />
          </div>
        </div>
        {/* Cats */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.09)', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => setCat(null)} className={`cat-btn${!cat ? ' cat-btn-active' : ''}`}>SVE</button>
          {cats.map(c => <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`cat-btn${cat === c ? ' cat-btn-active' : ''}`}>{c}</button>)}
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '0.82rem', fontFamily: 'var(--fm)' }}>Nema rezultata</div>
          ) : filtered.map(ex => (
            <div key={ex.id} onClick={() => { onSelect(ex); onClose() }}
              style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#111113'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div>
                <div style={{ fontSize: '0.88rem', color: '#e0e0e0', fontWeight: 500, fontFamily: 'var(--fm)' }}>{ex.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '0.1em', marginTop: '2px' }}>{ex.category}</div>
              </div>
              <Plus size={13} color="#444" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────
// isAdmin=true  → edits planned_ + target_rpe + coach_note + delete
// isAdmin=false → reads planned_, edits actual_ + actual_note + completed
function ExerciseRow({ we, isAdmin, onUpdate, onDelete }: {
  we: WorkoutExercise; isAdmin: boolean
  onUpdate: (id: string, data: Partial<WorkoutExercise>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const save = (field: keyof WorkoutExercise, val: string, isNum = false) =>
    onUpdate(we.id, { [field]: isNum ? (val ? Number(val) : null) : (val || null) })

  // ── RPE comparison helper ───────────────────────────────────────
  const rpeColor = (actual: number | null, target: number | null) => {
    if (!actual || !target) return '#e0e0e0'
    const diff = actual - target
    if (diff <= 0) return '#4ade80'       // at or below target → green
    if (diff === 1) return '#facc15'      // 1 over → yellow
    return '#f87171'                      // 2+ over → red
  }

  return (
    <div className="ex-row-wrap">
      {/* ── Main row ── */}
      <div className="ex-row-main" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 72px 80px 64px 28px', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Grip (admin only) */}
        <div className="ex-col-grip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '0 4px' }}>
          {isAdmin
            ? <GripVertical size={12} color="#555" style={{ cursor: 'grab' }} />
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={we.completed ? '#4ade80' : '#555'} strokeWidth="2.5">
                {we.completed
                  ? <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>
                  : <circle cx="12" cy="12" r="8"/>}
              </svg>
          }
        </div>

        {/* Exercise name */}
        <div style={{ padding: '13px 14px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f0f0', fontFamily: 'var(--fm)' }}>{we.exercise?.name ?? '—'}</span>
          </div>
          {/* Coach note — always visible to lifter as instruction */}
          {we.coach_note && (
            <div style={{ fontSize: '0.62rem', color: '#f59e0b', letterSpacing: '0.04em', paddingLeft: '18px', lineHeight: 1.4 }}>
              ↳ {we.coach_note}
            </div>
          )}
        </div>

        {/* SETS */}
        <div className="ex-col-sets" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: '#666', letterSpacing: '0.2em', textAlign: 'center' }}>SERI</div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_sets} placeholder="3" type="number" small onSave={v => save('planned_sets', v, true)} />
              : <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{we.planned_sets ?? '—'}</span>
            }
          </div>
        </div>

        {/* REPS */}
        <div className="ex-col-reps" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: '#666', letterSpacing: '0.2em', textAlign: 'center' }}>PONOV</div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_reps} placeholder="5" small onSave={v => save('planned_reps', v)} />
              : <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{we.planned_reps ?? '—'}</span>
            }
          </div>
        </div>

        {/* KG — lifter fills actual, admin fills planned */}
        <div className="ex-col-kg" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: isAdmin ? 'transparent' : 'rgba(56,100,255,0.04)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: isAdmin ? '#666' : '#6b8cff', letterSpacing: '0.2em', textAlign: 'center' }}>
            {isAdmin ? 'KG PLAN' : 'KG ODIG'}
          </div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.planned_weight_kg} placeholder="—" type="number" small onSave={v => save('planned_weight_kg', v, true)} />
              : <>
                  {we.planned_weight_kg && (
                    <div style={{ fontSize: '0.52rem', color: '#555', marginBottom: '3px' }}>{we.planned_weight_kg}kg plan</div>
                  )}
                  <EditableField value={we.actual_weight_kg} placeholder="upiši" type="number" small onSave={v => save('actual_weight_kg', v, true)} />
                </>
            }
          </div>
        </div>

        {/* RPE — admin sets target, lifter fills actual */}
        <div className="ex-col-rpe" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: isAdmin ? 'transparent' : 'rgba(250,204,21,0.04)' }}>
          <div style={{ padding: '5px 8px 3px', fontSize: '0.44rem', color: isAdmin ? '#666' : '#facc15', letterSpacing: '0.2em', textAlign: 'center' }}>
            {isAdmin ? 'RPE CILJ' : 'RPE ODIJ'}
          </div>
          <div style={{ padding: '4px 8px 10px', textAlign: 'center' }}>
            {isAdmin
              ? <EditableField value={we.target_rpe ?? we.planned_rpe} placeholder="—" type="number" small onSave={v => save('target_rpe', v, true)} />
              : <>
                  {we.target_rpe && (
                    <div style={{ fontSize: '0.52rem', color: '#888', marginBottom: '3px' }}>cilj: {we.target_rpe}</div>
                  )}
                  <div style={{ color: rpeColor(we.actual_rpe, we.target_rpe ?? we.planned_rpe) }}>
                    <EditableField value={we.actual_rpe} placeholder="upiši" type="number" small onSave={v => save('actual_rpe', v, true)} />
                  </div>
                </>
            }
          </div>
        </div>

        {/* Delete (admin) or complete toggle (lifter) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isAdmin
            ? <button onClick={() => onDelete(we.id)} className="icon-btn-danger"><Trash2 size={11} /></button>
            : <button
                onClick={() => onUpdate(we.id, { completed: !we.completed })}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: we.completed ? '#4ade80' : '#444', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={we.completed ? 'Označi kao neodrađeno' : 'Označi kao odrađeno'}
              >
                <Check size={13} />
              </button>
          }
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ background: '#080810', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {isAdmin ? (
            /* Admin: tempo, odmor, coach_note */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              {[
                { label: 'TEMPO', key: 'planned_tempo' as keyof WorkoutExercise, ph: '3010' },
                { label: 'ODMOR (sek)', key: 'planned_rest_seconds' as keyof WorkoutExercise, ph: '90', type: 'number' },
                { label: 'BILJEŠKA TRENERA', key: 'coach_note' as keyof WorkoutExercise, ph: 'Uputa za liftača...' },
              ].map((f, fi) => (
                <div key={String(f.key)} style={{ padding: '10px 14px', borderRight: fi < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '5px' }}>{f.label}</div>
                  <EditableField value={we[f.key] as string | number | null} placeholder={f.ph} type={f.type}
                    onSave={v => save(f.key, v)} />
                </div>
              ))}
            </div>
          ) : (
            /* Lifter: planned info (read-only) + actual_note */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              <div style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '5px' }}>TEMPO / ODMOR</div>
                <div style={{ fontSize: '0.78rem', color: '#aaa' }}>
                  {we.planned_tempo || '—'} · {we.planned_rest_seconds ? `${we.planned_rest_seconds}s` : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.46rem', color: '#facc15', letterSpacing: '0.2em', marginBottom: '5px' }}>BILJEŠKA TRENERA</div>
                <div style={{ fontSize: '0.78rem', color: '#facc15', lineHeight: 1.5 }}>
                  {we.coach_note || <span style={{ color: '#444' }}>—</span>}
                </div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: '0.46rem', color: '#6b8cff', letterSpacing: '0.2em', marginBottom: '5px' }}>MOJA BILJEŠKA</div>
                <EditableField value={we.actual_note} placeholder="Upiši dojam..." onSave={v => save('actual_note', v)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand toggle */}
      <button onClick={() => setExpanded(!expanded)}
        style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 44px', cursor: 'pointer', color: '#555', fontSize: '0.48rem', letterSpacing: '0.18em', fontFamily: 'var(--fm)', textAlign: 'left', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#888'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}>
        {expanded ? '▲ SAKRIJ' : '▼ DETALJI'}
      </button>
    </div>
  )
}

// ─── WORKOUT CARD — editorial style ──────────────────────────────
function WorkoutCard({ workout, exercises, isAdmin, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  workout: Workout; exercises: Exercise[]; isAdmin: boolean
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
      {/* Outer card: sharp border, white/dark editorial split */}
      <div className="workout-card" style={{ border: '1px solid rgba(255,255,255,0.15)', marginBottom: '10px', overflow: 'hidden', borderRadius: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)' }}>

        {/* ── Day header — light editorial strip ── */}
        <div
          style={{ background: workout.completed ? '#0c1a10' : 'rgba(255,255,255,0.07)', borderBottom: open ? '1px solid rgba(255,255,255,0.12)' : 'none', cursor: 'pointer', padding: '0' }}
          onClick={() => setOpen(!open)}>
          {/* Top accent line */}
          <div style={{ height: '3px', background: workout.completed ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2a2a3a, #1a1a28)', boxShadow: workout.completed ? '0 0 10px rgba(34,197,94,0.3)' : 'none', transition: 'all 0.3s' }} />

          <div className='workout-header-inner' style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Day label pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={workout.completed ? '#22c55e' : '#555'} strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <div style={{ fontSize: '0.56rem', letterSpacing: '0.3em', color: '#aaa', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                {workout.workout_date}
              </div>
            </div>

            {/* Workout name — large */}
            <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f0f0f0', fontFamily: 'var(--fd)', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
                <EditableField value={workout.day_name} placeholder="DAN TRENINGA" onSave={v => onUpdateWorkout(workout.id, { day_name: v })} />
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {/* Ex count badge */}
              {exCount > 0 && (
                <div style={{ fontSize: '0.58rem', color: '#bbb', background: '#0e0e16', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.1em' }}>
                  {exCount} vj.
                </div>
              )}
              {/* Completed toggle */}
              <div onClick={e => { e.stopPropagation(); onUpdateWorkout(workout.id, { completed: !workout.completed }) }}
                className={`done-badge${workout.completed ? ' done-badge-active' : ''}`}>
                {workout.completed ? <Check size={10} color="#22c55e" /> : <div style={{ width: '9px', height: '9px', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '2px' }} />}
                <span>{workout.completed ? 'GOTOVO' : 'ODRADITI'}</span>
              </div>
              {/* Delete */}
              <button onClick={e => { e.stopPropagation(); onDeleteWorkout(workout.id) }} className="icon-btn-danger">
                <Trash2 size={11} />
              </button>
              {/* Expand arrow */}
              <div style={{ color: '#444', transition: 'transform 0.25s', transform: open ? 'rotate(90deg)' : 'none' }}>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Exercise table — dark with clean grid ── */}
        {open && (
          <div style={{ background: '#09090e', animation: 'fadeUp 0.2s ease' }}>
            {/* Table header row */}
            {exCount > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px 80px 80px 64px 28px', borderBottom: '2px solid rgba(255,255,255,0.1)', background: '#0d0d14' }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }} />
                {['VJEŽBA', 'SERI', 'PONOV', isAdmin ? 'KG PLAN' : 'KG', isAdmin ? 'RPE CILJ' : 'RPE', ''].map((h, i) => (
                  <div key={i} style={{ padding: '8px 16px', fontSize: '0.48rem', color: i === 3 && !isAdmin ? '#6b8cff' : i === 4 && !isAdmin ? '#facc15' : '#666', letterSpacing: '0.25em', fontWeight: 700, fontFamily: 'var(--fm)', textAlign: i > 0 ? 'center' : 'left', borderRight: i < 5 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>{h}</div>
                ))}
              </div>
            )}

            {/* Exercises */}
            {workout.workout_exercises?.map(we => (
              <ExerciseRow key={we.id} we={we} isAdmin={isAdmin} onUpdate={onUpdateExercise} onDelete={onDeleteExercise} />
            ))}

            {/* Add vježbu + bilješka footer */}
            <div className="ex-table-footer" style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {isAdmin && (
                <button onClick={() => setShowPicker(true)} className="add-btn" style={{ flex: 'none' }}>
                  <Plus size={11} /> DODAJ VJEŽBU
                </button>
              )}
              <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
                <div style={{ fontSize: '0.48rem', color: '#444', letterSpacing: '0.22em', marginBottom: '4px' }}>BILJEŠKA DANA</div>
                <EditableField value={workout.notes} placeholder="Dodaj bilješku..." onSave={v => onUpdateWorkout(workout.id, { notes: v || null })} />
              </div>
            </div>
          </div>
        )}
      </div>
      {showPicker && <ExercisePicker exercises={exercises} onSelect={ex => onAddExercise(workout.id, ex)} onClose={() => setShowPicker(false)} />}
    </>
  )
}

// ─── WEEK PANEL ───────────────────────────────────────────────────
function WeekPanel({ week, exercises, isAdmin, onDeleteWeek, onUpdateWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  week: Week; exercises: Exercise[]; isAdmin: boolean
  onDeleteWeek: (id: string) => void; onUpdateWeek: (id: string, data: Partial<Week>) => void
  onAddWorkout: (weekId: string) => void
  onUpdateWorkout: (id: string, data: Partial<Workout>) => void; onDeleteWorkout: (id: string) => void
  onAddExercise: (workoutId: string, ex: Exercise) => void
  onUpdateExercise: (id: string, data: Partial<WorkoutExercise>) => void; onDeleteExercise: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const done = week.workouts?.filter(w => w.completed).length ?? 0
  const total = week.workouts?.length ?? 0
  const pct = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}>

      {/* ── Week header — editorial black band ── */}
      <div style={{ background: 'linear-gradient(180deg, #111118 0%, #0c0c13 100%)', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
        onClick={() => setOpen(!open)}>

        {/* Top: large week label row */}
        <div style={{ padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,24px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            {/* Giant W number */}
            <span style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2rem,5vw,4rem)', fontWeight: 800, lineHeight: 1, color: '#fff', letterSpacing: '-0.03em' }}>
              W{week.week_number}
            </span>
            <div>
              <div style={{ fontSize: '0.88rem', color: '#aaa', fontWeight: 500, fontFamily: 'var(--fm)', letterSpacing: '0.05em' }}>
                TJEDAN {week.week_number}
              </div>
              <div style={{ fontSize: '0.58rem', color: '#777', letterSpacing: '0.1em', marginTop: '1px' }}>
                {week.start_date} — {week.end_date}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '4px' }}>
            {/* Progress pill */}
            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f0f18', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '20px' }}>
                <div style={{ width: '48px', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '0.56rem', color: '#aaa', fontFamily: 'var(--fm)', fontWeight: 700 }}>{done}/{total}</span>
              </div>
            )}
            <div style={{ color: '#888', transition: 'transform 0.25s, color 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight size={14} />
            </div>
            {isAdmin && (
              <button onClick={e => { e.stopPropagation(); onDeleteWeek(week.id) }} className="icon-btn-danger">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Day grid overview — like the reference screenshot */}
        {total > 0 && (
          <div className="day-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(total, 7)}, 1fr)`, margin: '16px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {week.workouts?.map((w, i) => (
              <div key={w.id} style={{ padding: '10px 14px', borderRight: i < total - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', background: w.completed ? '#0b1a10' : '#0c0c12', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: '#888', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                    DAN {i + 1}
                  </span>
                  {w.completed && (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} color="#22c55e" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: w.completed ? '#4ade80' : '#e0e0e0', fontFamily: 'var(--fm)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  {w.day_name}
                </div>
                {/* Bottom accent */}
                <div style={{ height: '2px', marginTop: '8px', background: w.completed ? '#22c55e' : 'rgba(255,255,255,0.1)', borderRadius: '1px', boxShadow: w.completed ? '0 0 6px rgba(34,197,94,0.4)' : 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Workout cards ── */}
      {open && (
        <div style={{ padding: '16px', background: '#0b0b12' }}>
          {week.workouts?.map(w => (
            <WorkoutCard key={w.id} workout={w} exercises={exercises} isAdmin={isAdmin}
              onUpdateWorkout={onUpdateWorkout} onDeleteWorkout={onDeleteWorkout}
              onAddExercise={onAddExercise} onUpdateExercise={onUpdateExercise} onDeleteExercise={onDeleteExercise} />
          ))}
          {isAdmin && (
            <button onClick={() => onAddWorkout(week.id)} className="add-btn">
              <Plus size={11} /> DODAJ DAN TRENINGA
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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

      {/* ── Atmospheric layered background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.016) 1px, transparent 1px)',
        backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '-20vh', left: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(56,100,255,0.055) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      <div style={{ position: 'fixed', bottom: '-15vh', right: '-8vw', width: '55vw', height: '55vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 20%, transparent 35%, rgba(0,0,0,0.5) 100%)' }} />

      <TrainingNav athleteName={athleteName} isAdmin={isAdmin} onLogout={handleLogout} />

      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: '60px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Header glow strip at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '180px', zIndex: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(56,100,255,0.04) 0%, transparent 100%)' }} />

        <div className='page-header' style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 32px 0', position: 'relative', zIndex: 1 }}>

          {/* Page title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px', flexWrap: 'wrap', animation: 'fadeUp 0.5s ease' }}>
            <div>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.5em', color: '#444', marginBottom: '8px', fontFamily: 'var(--fm)' }}>
                {loading ? '...' : `${athleteName.toUpperCase()} · TRENING`}
              </div>
              <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,4vw,3.5rem)', fontWeight: 800, lineHeight: 0.9, margin: 0, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
                {loading ? 'UČITAVANJE' : (block?.name?.toUpperCase() ?? 'MOJ PROGRAM')}<br />
                <span style={{ color: '#2a2a35' }}>PLAN</span>
              </h1>
            </div>

            {/* Stats pills */}
            {!loading && block && (
              <div className="stats-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {[
                  { val: block.weeks?.length ?? 0, label: 'TJEDANA' },
                  { val: totalWorkouts, label: 'TRENINGA' },
                  { val: `${completedWorkouts}/${totalWorkouts}`, label: 'GOTOVO', accent: completedWorkouts > 0 },
                  { val: `${pct}%`, label: 'NAPREDAK', accent: pct > 50 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '10px 16px', background: 'linear-gradient(145deg, #0e0e14 0%, #080810 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', textAlign: 'center', minWidth: '72px', boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: s.accent ? '#22c55e' : '#e0e0e0' }}>{s.val}</div>
                    <div style={{ fontSize: '0.48rem', color: '#777', letterSpacing: '0.22em', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Block selector bar */}
          {!loading && block && (
            <div style={{ position: 'relative', marginBottom: '24px' }} ref={blockSelectorRef}>
              <div className="block-bar" style={{ display: 'flex', alignItems: 'stretch', background: 'linear-gradient(180deg, #0e0e14 0%, #09090e 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

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
        </div>

        {/* ─── CONTENT ─────────────────────────────────────────── */}
        <div className='page-content' style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px 80px' }}>
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
              {(block.weeks?.length ?? 0) === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#333' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', marginBottom: '14px', opacity: 0.3 }}>—</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '28px' }}>PROGRAM JE PRAZAN</div>
                </div>
              )}
              {block.weeks?.map(week => (
                <WeekPanel key={week.id} week={week} exercises={exercises} isAdmin={isAdmin}
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

        /* ── Add week btn upgrade ── */
        .add-week-btn:hover {
          border-color: rgba(255,255,255,0.12) !important;
          color: #ccc !important;
          background: linear-gradient(160deg, #0e0e14 0%, #0a0a10 100%) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        /* ── Nav menu item refined ── */
        .nav-menu-item { border-radius: 7px; }

        /* ══ MOBILE ══════════════════════════════════════════════ */

        /* ─ Header + content padding ─ */
        @media (max-width: 768px) {
          .page-header  { padding: 20px 16px 0 !important; }
          .page-content { padding: 0 16px 80px !important; }
        }

        /* ─ Block selector bar: stack vertically on mobile ─ */
        @media (max-width: 640px) {
          .block-bar { flex-direction: column !important; }
          .block-bar > * { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; width: 100% !important; min-width: 0 !important; }
          .block-bar > *:last-child { border-bottom: none !important; }
        }

        /* ─ Stats pills: 2×2 on small screens ─ */
        @media (max-width: 480px) {
          .stats-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
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