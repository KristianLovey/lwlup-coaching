'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plus, Trash2, ChevronDown, ChevronRight, Check, Search,
  GripVertical, Loader2, LogOut, Home, FolderOpen,
  User, Shield, X, ChevronLeft, ChevronUp, Dumbbell, BookOpen, BarChart2
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
type CoachTip = { id: string; title: string; content: string; category: string; priority: number; created_at: string }
type Competition = { id: string; name: string; date: string; location: string | null; status: string }
type SetLog = { set_number: number; weight_kg: number | null; reps: string | null; rpe: number | null; completed: boolean }

// ─── NAVBAR ───────────────────────────────────────────────────────
function TrainingNav({ athleteName, isAdmin, onLogout }: {
  athleteName: string; isAdmin: boolean; onLogout: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const initials = athleteName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const NAV_ITEMS = [
    { href: '/', label: 'Početna' },
    { href: '/exercises', label: 'Vježbe' },
    { href: '/profile', label: 'Profil' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '56px',
      display: 'flex', alignItems: 'center',
      padding: '0 clamp(16px,3vw,32px)',
      background: scrolled ? 'rgba(4,4,8,0.92)' : 'rgba(4,4,8,0.75)',
      borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'}`,
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      transition: 'background 0.4s, border-color 0.4s',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: '32px', flexShrink: 0 }}>
        <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '28px', opacity: 0.95 }} />
      </Link>

      {/* Nav links — Apple style, center-left */}
      <div className="tnav-links" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="tnav-pill"
            style={{ textDecoration: 'none', padding: '6px 14px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--fm)', letterSpacing: '0.01em', borderRadius: '8px', transition: 'all 0.18s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right — status pill + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Live status pill */}
        <div className="tnav-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: '20px' }}>
          <div style={{ position: 'relative', width: '6px', height: '6px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 5px #22c55e' }} />
            <div style={{ position: 'absolute', inset: '-3px', background: 'rgba(34,197,94,0.2)', borderRadius: '50%', animation: 'pingPulse 2.4s ease-in-out infinite' }} />
          </div>
          <span style={{ fontSize: '0.62rem', color: '#4ade80', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>Aktivan</span>
        </div>

        {/* Avatar / profile button */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button onClick={() => setProfileOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 10px 5px 5px', background: profileOpen ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!profileOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' } }}
            onMouseLeave={e => { if (!profileOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}>
            {/* Avatar */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: '#d0d0f0', fontFamily: 'var(--fm)', flexShrink: 0 }}>
              {initials}
            </div>
            <span className="tnav-name" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#e0e0e8', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' as const }}>{athleteName?.split(' ')[0] || 'Atleta'}</span>
            <ChevronDown size={11} color="rgba(255,255,255,0.4)" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: 'rgba(10,10,16,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)', zIndex: 300, animation: 'dropDown 0.2s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden', backdropFilter: 'blur(40px)' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a2a3e 0%, #16161e 100%)', border: '1.5px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#d0d0f0' }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f0f8', fontFamily: 'var(--fm)' }}>{athleteName}</div>
                    <div style={{ fontSize: '0.58rem', color: '#4ade80', fontFamily: 'var(--fm)', marginTop: '1px' }}>● Aktivan</div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              <div style={{ padding: '6px' }}>
                {[
                  { href: '/profile', icon: <User size={14}/>, label: 'Moj profil' },
                  { href: '/exercises', icon: <Dumbbell size={14}/>, label: 'Baza vježbi' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="nav-menu-item">{item.icon}<span>{item.label}</span></button>
                  </Link>
                ))}
                {isAdmin && (
                  <Link href="/admin" onClick={() => setProfileOpen(false)} style={{ textDecoration: 'none' }}>
                    <button className="nav-menu-item nav-menu-admin">
                      <Shield size={14} color="#f59e0b"/>
                      <span>Admin panel</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.5rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '2px 7px', letterSpacing: '0.1em', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px' }}>ADMIN</span>
                    </button>
                  </Link>
                )}
              </div>
              <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => { setProfileOpen(false); onLogout() }} className="nav-menu-item nav-menu-logout">
                  <LogOut size={14}/><span>Odjava</span>
                </button>
              </div>
            </div>
          )}
        </div>
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

// ─── COMPETITION BANNER ───────────────────────────────────────────
function CompetitionBanner({ userId }: { userId: string }) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selected, setSelected]         = useState<Competition | null>(null)
  const [open, setOpen]                 = useState(false)
  const [daysOut, setDaysOut]           = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load upcoming competitions
    supabase.from('competitions')
      .select('id, name, date, location, status')
      .eq('status', 'announced')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .then(({ data }) => setCompetitions((data ?? []) as Competition[]))

    // Load saved selection
    supabase.from('athlete_competition_selection')
      .select('competition_id, competitions(id, name, date, location, status)')
      .eq('athlete_id', userId)
      .single()
      .then(({ data }) => {
        if (data?.competitions) {
          const c = data.competitions as any
          setSelected(c)
          calcDays(c.date)
        }
      })
  }, [userId])

  const calcDays = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    setDaysOut(diff)
  }

  const pick = async (comp: Competition) => {
    setSelected(comp); calcDays(comp.date); setOpen(false)
    await supabase.from('athlete_competition_selection')
      .upsert({ athlete_id: userId, competition_id: comp.id, selected_at: new Date().toISOString() },
               { onConflict: 'athlete_id' })
  }

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  if (competitions.length === 0) return null

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: '20px', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.025)', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>

        {/* Days out pill */}
        {selected && daysOut !== null && (
          <div style={{ padding: '0 24px', background: daysOut <= 14 ? 'rgba(239,68,68,0.12)' : daysOut <= 30 ? 'rgba(250,204,21,0.08)' : 'rgba(34,197,94,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, minWidth: '90px' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: daysOut <= 14 ? '#ef4444' : daysOut <= 30 ? '#facc15' : '#22c55e' }}>{daysOut}</div>
            <div style={{ fontSize: '0.46rem', letterSpacing: '0.25em', color: '#666', marginTop: '3px', fontFamily: 'var(--fm)', fontWeight: 700 }}>DAYS OUT</div>
          </div>
        )}

        {/* Picker button */}
        <button onClick={() => setOpen(o => !o)}
          style={{ flex: 1, padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.35em', color: '#666', marginBottom: '3px', fontFamily: 'var(--fm)' }}>SLJEDEĆE NATJECANJE</div>
            {selected ? (
              <>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f0f0f0', fontFamily: 'var(--fm)' }}>{selected.name}</div>
                <div style={{ fontSize: '0.58rem', color: '#777', marginTop: '2px' }}>{selected.date}{selected.location ? ` · ${selected.location}` : ''}</div>
              </>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#555', fontFamily: 'var(--fm)' }}>Odaberi natjecanje...</div>
            )}
          </div>
          <ChevronDown size={13} color="#555" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'dropDown 0.18s ease' }}>
          {competitions.map((comp, i) => (
            <button key={comp.id} onClick={() => pick(comp)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 18px', background: selected?.id === comp.id ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderBottom: i < competitions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = selected?.id === comp.id ? 'rgba(255,255,255,0.05)' : 'transparent'}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e0e0', fontFamily: 'var(--fm)' }}>{comp.name}</div>
                <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '2px' }}>{comp.date}{comp.location ? ` · ${comp.location}` : ''}</div>
              </div>
              {selected?.id === comp.id && <Check size={12} color="#22c55e" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SET LOG ROW — one box per set ─────────────────────────────────
// Admin sees planned data. Lifter gets N input boxes (one per set).
function SetLogSection({ we, userId, isAdmin, onAggregateUpdate }: {
  we: WorkoutExercise; userId: string; isAdmin: boolean
  onAggregateUpdate: (data: Partial<WorkoutExercise>) => void
}) {
  const plannedSets = we.planned_sets ?? 3
  const [logs, setLogs] = useState<SetLog[]>([])
  const [saving, setSaving] = useState(false)

  // Initialise logs array — one entry per planned set
  useEffect(() => {
    if (isAdmin) return
    supabase.from('set_logs')
      .select('set_number, weight_kg, reps, rpe, completed')
      .eq('workout_exercise_id', we.id)
      .eq('athlete_id', userId)
      .order('set_number')
      .then(({ data }) => {
        const existing = (data ?? []) as SetLog[]
        // Fill in missing sets
        const filled: SetLog[] = Array.from({ length: plannedSets }, (_, i) => {
          const found = existing.find(s => s.set_number === i + 1)
          return found ?? { set_number: i + 1, weight_kg: null, reps: null, rpe: null, completed: false }
        })
        setLogs(filled)
      })
  }, [we.id, plannedSets, isAdmin])

  const saveSet = async (setNum: number, field: keyof SetLog, raw: string) => {
    const val = (field === 'weight_kg' || field === 'rpe') ? (raw ? Number(raw) : null) : (raw || null)
    setSaving(true)

    const updated = logs.map(s => s.set_number === setNum ? { ...s, [field]: val } : s)
    setLogs(updated)

    await supabase.from('set_logs').upsert({
      workout_exercise_id: we.id,
      athlete_id: userId,
      set_number: setNum,
      [field]: val,
    }, { onConflict: 'workout_exercise_id,set_number' })

    // Update aggregate actual_ on workout_exercises so progress tracking still works
    const completed = updated.filter(s => s.weight_kg || s.reps)
    if (completed.length > 0) {
      const avgKg = completed.reduce((s, x) => s + (x.weight_kg ?? 0), 0) / completed.length
      const lastRpe = completed[completed.length - 1].rpe
      onAggregateUpdate({ actual_weight_kg: avgKg, actual_rpe: lastRpe })
    }
    setSaving(false)
  }

  const markSetDone = async (setNum: number) => {
    const s = logs.find(l => l.set_number === setNum)
    if (!s) return
    const nowDone = !s.completed
    setLogs(logs.map(l => l.set_number === setNum ? { ...l, completed: nowDone } : l))
    await supabase.from('set_logs').upsert({
      workout_exercise_id: we.id, athlete_id: userId,
      set_number: setNum, completed: nowDone,
    }, { onConflict: 'workout_exercise_id,set_number' })
  }

  if (isAdmin) {
    // Admin sees a summary of planned sets
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '8px 0 0' }}>
        {Array.from({ length: plannedSets }, (_, i) => (
          <div key={i} style={{ padding: '4px 10px', background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '0.62rem', color: '#888', fontFamily: 'var(--fm)' }}>
            Set {i + 1} · {we.planned_reps ?? '?'} reps · {we.planned_weight_kg ? `${we.planned_weight_kg}kg` : '—'}
          </div>
        ))}
      </div>
    )
  }

  // Lifter: one input group per set
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0 4px' }}>
      {saving && <div style={{ fontSize: '0.48rem', color: '#555', letterSpacing: '0.2em', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> SNIMANJE...</div>}
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr 32px', gap: '6px', alignItems: 'center', padding: '8px 10px', background: log.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${log.completed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '7px', transition: 'all 0.2s' }}>
          {/* Set number */}
          <div style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: log.completed ? '#22c55e' : '#555', fontFamily: 'var(--fd)' }}>S{log.set_number}</div>
          {/* KG */}
          <div>
            <div style={{ fontSize: '0.44rem', color: '#6b8cff', letterSpacing: '0.2em', marginBottom: '3px' }}>KG</div>
            <input
              type="number" step="0.5" value={log.weight_kg ?? ''}
              onChange={e => saveSet(log.set_number, 'weight_kg', e.target.value)}
              placeholder={we.planned_weight_kg ? String(we.planned_weight_kg) : '—'}
              style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', outline: 'none', borderRadius: '5px', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(107,140,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* Reps */}
          <div>
            <div style={{ fontSize: '0.44rem', color: '#aaa', letterSpacing: '0.2em', marginBottom: '3px' }}>PONOV</div>
            <input
              type="text" value={log.reps ?? ''}
              onChange={e => saveSet(log.set_number, 'reps', e.target.value)}
              placeholder={we.planned_reps ?? '—'}
              style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', outline: 'none', borderRadius: '5px', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* RPE */}
          <div>
            <div style={{ fontSize: '0.44rem', color: '#facc15', letterSpacing: '0.2em', marginBottom: '3px' }}>
              RPE{(we.target_rpe ?? we.planned_rpe) ? ` (cilj: ${we.target_rpe ?? we.planned_rpe})` : ''}
            </div>
            <input
              type="number" step="0.5" min="1" max="10" value={log.rpe ?? ''}
              onChange={e => saveSet(log.set_number, 'rpe', e.target.value)}
              placeholder="—"
              style={{ width: '100%', background: '#0a0a12', border: '1px solid rgba(255,255,255,0.1)', color: log.rpe && (we.target_rpe ?? we.planned_rpe) ? (Number(log.rpe) - Number(we.target_rpe ?? we.planned_rpe) > 1 ? '#f87171' : Number(log.rpe) - Number(we.target_rpe ?? we.planned_rpe) > 0 ? '#facc15' : '#4ade80') : '#e0e0e0', padding: '5px 8px', fontSize: '0.82rem', outline: 'none', borderRadius: '5px', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(250,204,21,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          {/* Done toggle */}
          <button onClick={() => markSetDone(log.set_number)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: log.completed ? '#22c55e' : '#444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
            title={log.completed ? 'Poništi' : 'Označi kao odrađeno'}>
            <Check size={14} strokeWidth={log.completed ? 3 : 1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────
// isAdmin=true  → edits planned_ + target_rpe + coach_note + delete
// isAdmin=false → reads planned_, edits actual_ + actual_note + completed
function ExerciseRow({ we, isAdmin, userId, onUpdate, onDelete }: {
  we: WorkoutExercise; isAdmin: boolean; userId: string
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

      {/* Set log section — shown always (below main row) */}
      <div style={{ padding: '0 16px 0 44px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <SetLogSection
          we={we} userId={userId} isAdmin={isAdmin}
          onAggregateUpdate={data => onUpdate(we.id, data)}
        />
      </div>

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
function WorkoutCard({ workout, exercises, isAdmin, userId, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  workout: Workout; exercises: Exercise[]; isAdmin: boolean; userId: string
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
              <ExerciseRow key={we.id} we={we} isAdmin={isAdmin} userId={userId} onUpdate={onUpdateExercise} onDelete={onDeleteExercise} />
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
function WeekPanel({ week, exercises, isAdmin, userId, onDeleteWeek, onUpdateWeek, onAddWorkout, onUpdateWorkout, onDeleteWorkout, onAddExercise, onUpdateExercise, onDeleteExercise }: {
  week: Week; exercises: Exercise[]; isAdmin: boolean; userId: string
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
      <div style={{ background: 'linear-gradient(160deg, #0f0f18 0%, #0a0a12 100%)', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
        onClick={() => setOpen(!open)}>

        {/* Top: large week label row */}
        <div style={{ padding: 'clamp(14px,3vw,20px) clamp(16px,4vw,24px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            {/* Giant W number */}
            <span style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,4vw,3.2rem)', fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.04em' }}>
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
            <WorkoutCard key={w.id} workout={w} exercises={exercises} isAdmin={isAdmin} userId={userId}
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

// ─── SHARED: Input component ────────────────────────────────────
function CalcInput({ label, value, onChange, color = '#6b8cff', type = 'number', step = '1', min = '0', max = '9999', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  color?: string; type?: string; step?: string; min?: string; max?: string; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
      <label style={{ fontSize: '0.6rem', fontWeight: 600, color: focused ? color : 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          step={step} min={min} max={max} placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${focused ? color : 'rgba(255,255,255,0.1)'}`,
            color: '#f0f0f5', padding: '11px 14px', borderRadius: '10px', outline: 'none',
            fontSize: '1rem', fontFamily: 'var(--fm)', boxSizing: 'border-box' as const,
            transition: 'border-color 0.2s, background 0.2s',
            boxShadow: focused ? `0 0 0 3px ${color}18` : 'none',
          }}
        />
        {/* Animated focus bar */}
        <div style={{ position: 'absolute', bottom: 0, left: '10px', right: '10px', height: '2px', borderRadius: '1px', background: color, transform: focused ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', transformOrigin: 'left' }} />
      </div>
    </div>
  )
}

// ─── SHARED: Result card ─────────────────────────────────────────
function ResultCard({ label, value, unit, color, sub }: { label: string; value: string | number; unit?: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '20px 24px', background: `${color}0c`, border: `1.5px solid ${color}28`, borderRadius: '14px', display: 'flex', flexDirection: 'column' as const, gap: '4px', animation: 'popIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ fontSize: '0.6rem', color: `${color}cc`, letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: '2.6rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}{unit && <span style={{ fontSize: '1rem', color: `${color}88`, marginLeft: '4px', fontFamily: 'var(--fm)', fontWeight: 400 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)' }}>{sub}</div>}
    </div>
  )
}

// ─── SHARED: Section title ────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.15)' }} />
      <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>{children}</span>
    </div>
  )
}

// ─── HUB: RPE CALCULATOR ─────────────────────────────────────────
const RPE_TABLE: Record<number, Record<number, number>> = {
  10:{1:1.00,2:0.955,3:0.922,4:0.892,5:0.863,6:0.837,7:0.811,8:0.786,9:0.762,10:0.739},
  9:{1:0.978,2:0.933,3:0.900,4:0.871,5:0.843,6:0.818,7:0.792,8:0.768,9:0.745,10:0.723},
  8:{1:0.955,2:0.911,3:0.878,4:0.850,5:0.823,6:0.798,7:0.773,8:0.750,9:0.728,10:0.707},
  7:{1:0.933,2:0.889,3:0.857,4:0.829,5:0.803,6:0.778,7:0.754,8:0.731,9:0.710,10:0.690},
  6:{1:0.911,2:0.867,3:0.835,4:0.808,5:0.783,6:0.759,7:0.736,8:0.714,9:0.693,10:0.674},
}
function calc1RM(w: number, r: number, rpe: number) {
  const pct = RPE_TABLE[Math.round(rpe)]?.[r]; return pct ? Math.round(w / pct) : 0
}
function weightForRPE(orm: number, r: number, rpe: number) {
  const pct = RPE_TABLE[Math.round(rpe)]?.[r]; return pct ? Math.round(orm * pct * 2) / 2 : 0
}

function RpeCalc() {
  const [weight, setWeight] = useState('')
  const [reps,   setReps]   = useState('3')
  const [rpe,    setRpe]    = useState('8')
  const [tRpe,   setTRpe]   = useState('8')
  const [tReps,  setTReps]  = useState('3')

  const w = parseFloat(weight), r = parseInt(reps), rv = parseFloat(rpe)
  const orm = (w && r && rv) ? calc1RM(w, r, rv) : 0
  const sug = (orm && tRpe && tReps) ? weightForRPE(orm, parseInt(tReps), parseFloat(tRpe)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>
      {/* Input section */}
      <div>
        <SectionTitle>Tvoj set</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          <CalcInput label="Težina (kg)" value={weight} onChange={setWeight} color="#f59e0b" step="0.5" placeholder="npr. 150" />
          <CalcInput label="Ponavljanja" value={reps}   onChange={setReps}   color="#f59e0b" min="1" max="10" />
          <CalcInput label="RPE"         value={rpe}    onChange={setRpe}    color="#f59e0b" step="0.5" min="6" max="10" />
        </div>
      </div>

      {/* 1RM result */}
      {orm > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <ResultCard label="Procijenjeni 1RM" value={orm} unit="kg" color="#f59e0b" sub={`iz ${w}kg × ${r} @RPE${rv}`} />
          {/* RPE breakdown */}
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '10px' }}>BREAKDOWN ZA {r} REPS</div>
            {[10,9,8,7].map(r2 => {
              const w2 = weightForRPE(orm, r, r2)
              const isActive = r2 === Math.round(rv)
              return (
                <div key={r2} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: r2 > 7 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: '0.65rem', color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: isActive ? 700 : 400 }}>@RPE {r2}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fd)' }}>{w2} kg</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Target section */}
      {orm > 0 && (
        <div>
          <SectionTitle>Preporučena težina</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <CalcInput label="Ciljna ponavljanja" value={tReps} onChange={setTReps} color="#6b8cff" min="1" max="10" />
            <CalcInput label="Ciljni RPE"         value={tRpe}  onChange={setTRpe}  color="#6b8cff" step="0.5" min="6" max="10" />
          </div>
          {sug > 0 && <ResultCard label="Preporučena težina" value={sug} unit="kg" color="#6b8cff" sub={`${tReps} ponavljanja @RPE${tRpe}`} />}
        </div>
      )}
    </div>
  )
}

// ─── HUB: GL CALCULATOR ──────────────────────────────────────────
function GlCalc() {
  const [total, setTotal] = useState('')
  const [bw,    setBw]    = useState('')
  const [sex,   setSex]   = useState<'male'|'female'>('male')

  const t = parseFloat(total), b = parseFloat(bw)
  const gl = (t && b) ? (() => {
    const P = sex === 'male'
      ? { a: 1199.72839, b: 1025.18162, c: 0.00921 }
      : { a: 610.32796,  b: 1045.59282, c: 0.03048 }
    const d = P.a - P.b * Math.exp(-P.c * b)
    return d > 0 ? Math.round((t * 100 / d) * 100) / 100 : 0
  })() : 0

  const glC = gl >= 120 ? '#22c55e' : gl >= 100 ? '#f59e0b' : gl >= 80 ? '#f87171' : '#6b8cff'
  const glL = gl >= 120 ? 'Elite' : gl >= 100 ? 'Advanced' : gl >= 80 ? 'Intermediate' : gl > 0 ? 'Beginner' : ''
  const pct  = Math.min((gl / 150) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>
      {/* Sex toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {(['male','female'] as const).map(s => (
          <button key={s} onClick={() => setSex(s)} style={{
            padding: '11px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
            background: sex === s ? 'rgba(107,140,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${sex === s ? 'rgba(107,140,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: sex === s ? '#8ba8ff' : 'rgba(255,255,255,0.4)',
            boxShadow: sex === s ? '0 0 0 3px rgba(107,140,255,0.1)' : 'none',
          }}>
            {s === 'male' ? '♂  Muški' : '♀  Ženski'}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <CalcInput label="Total (kg)"         value={total} onChange={setTotal} color="#6b8cff" step="0.5" placeholder="npr. 600" />
        <CalcInput label="Tjelesna masa (kg)" value={bw}    onChange={setBw}    color="#6b8cff" step="0.1" placeholder="npr. 93" />
      </div>

      {/* Result */}
      {gl > 0 && (
        <div style={{ animation: 'popIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ padding: '28px 28px 24px', background: `${glC}0a`, border: `1.5px solid ${glC}22`, borderRadius: '16px', textAlign: 'center' as const, marginBottom: '12px' }}>
            <div style={{ fontSize: '0.62rem', color: `${glC}aa`, letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '8px' }}>IPF GL BODOVI</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '5rem', fontWeight: 800, color: glC, lineHeight: 1, letterSpacing: '-0.03em' }}>{gl}</div>
            <div style={{ marginTop: '6px', display: 'inline-block', padding: '4px 14px', background: `${glC}18`, borderRadius: '20px', border: `1px solid ${glC}33` }}>
              <span style={{ fontSize: '0.7rem', color: glC, fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.06em' }}>{glL}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              {['Beginner', 'Intermediate', 'Advanced', 'Elite'].map((l, i) => (
                <span key={l} style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>{l}</span>
              ))}
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #6b8cff, ${glC})`, borderRadius: '3px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 8px ${glC}66` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              {[0, 80, 100, 120, 150].map(v => (
                <span key={v} style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HUB: WATERCUT CALCULATOR ────────────────────────────────────
function WaterCutCalc() {
  const [curKg,  setCurKg]  = useState('')
  const [tgtKg,  setTgtKg]  = useState('')
  const [date,   setDate]   = useState('')
  const [showPlan, setShowPlan] = useState(false)

  const cur = parseFloat(curKg), tgt = parseFloat(tgtKg)
  const lose  = (cur && tgt) ? cur - tgt : 0
  const days  = date ? Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)) : 0
  const maxWC = cur ? parseFloat((cur * 0.03).toFixed(1)) : 0
  const needsGut = lose > maxWC
  const gutKg    = needsGut ? parseFloat((lose - maxWC).toFixed(1)) : 0

  const PLAN = [
    { d:7, w:5.0, s:2.5, note:'Water loading — maksimum.' },
    { d:6, w:6.0, s:2.5, note:'Nastavi water loading.' },
    { d:5, w:6.0, s:2.0, note:'Zadrži visok unos.' },
    { d:4, w:4.0, s:1.0, note:'Počni smanjivati sol.' },
    { d:3, w:3.0, s:0.5, note:'Smanji vodu i sol.' },
    { d:2, w:2.0, s:0.0, note:'Minimalna sol, manje carba.' },
    { d:1, w:1.0, s:0.0, note:'Drastično smanji — prati kilažu.' },
    { d:0, w:0.3, s:0.0, note:'Samo do vage. Ništa višak.' },
  ].filter(p => p.d <= Math.min(days, 7))

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>
      {/* Inputs */}
      <div>
        <SectionTitle>Unesi podatke</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          <CalcInput label="Trenutna masa (kg)" value={curKg} onChange={setCurKg} color="#22c55e" step="0.1" placeholder="npr. 95.5" />
          <CalcInput label="Ciljna masa (kg)"   value={tgtKg} onChange={setTgtKg} color="#22c55e" step="0.1" placeholder="npr. 93.0" />
          <CalcInput label="Datum natjecanja"   value={date}  onChange={setDate}  color="#22c55e" type="date" />
        </div>
      </div>

      {/* Results */}
      {cur && tgt && date && lose >= 0 && (
        <div style={{ animation: 'popIn 0.3s ease' }}>
          <SectionTitle>Analiza</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { l: 'Days out',    v: days,                c: days < 7 ? '#f59e0b' : '#22c55e' },
              { l: 'Za skinuti',  v: `${lose.toFixed(1)}kg`, c: lose > maxWC ? '#f87171' : '#22c55e' },
              { l: 'Max watercut',v: `${maxWC}kg`,        c: 'rgba(255,255,255,0.5)' },
            ].map(s => (
              <div key={s.l} style={{ padding: '14px 16px', background: `${s.c}0c`, border: `1.5px solid ${s.c}28`, borderRadius: '12px', textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 700, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '5px', fontFamily: 'var(--fm)' }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Gut cut warning */}
          {needsGut && (
            <div style={{ padding: '16px 20px', background: 'rgba(248,113,113,0.07)', border: '1.5px solid rgba(248,113,113,0.2)', borderRadius: '12px', marginBottom: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171', marginBottom: '6px', letterSpacing: '0.01em' }}>
                  Gut cut potreban — još {gutKg}kg prehranom
                </div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  Watercut može ukloniti max <strong style={{ color: '#f87171' }}>{maxWC}kg</strong>. Preostalo skini kalorijski deficitom 3–4 tjedna ranije (0.5–1kg/tjedno).
                </div>
              </div>
            </div>
          )}

          {/* Plan toggle */}
          {PLAN.length > 0 && (
            <>
              <button onClick={() => setShowPlan(!showPlan)} style={{
                width: '100%', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                background: showPlan ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${showPlan ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: showPlan ? '#4ade80' : 'rgba(255,255,255,0.45)',
                fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', fontFamily: 'var(--fm)',
                transition: 'all 0.2s', marginBottom: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a5 5 0 0 1 5 5v3H7V7a5 5 0 0 1 5-5z"/><path d="M7 10H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"/></svg>
                {showPlan ? 'Sakrij plan' : 'Plan vode po danima'}
                <span style={{ marginLeft: 'auto', transform: showPlan ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>↓</span>
              </button>
              {showPlan && (
                <div style={{ border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', animation: 'fadeUp 0.25s ease' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 70px 60px 1fr', padding: '9px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Dan','Voda','Sol','Napomena'].map(h => (
                      <span key={h} style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.06em' }}>{h}</span>
                    ))}
                  </div>
                  {[...PLAN].reverse().map((p, i) => {
                    const isVaga = p.d === 0
                    const isLow  = p.d <= 2
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 70px 60px 1fr', padding: '11px 16px', background: isVaga ? 'rgba(245,158,11,0.06)' : isLow ? 'rgba(248,113,113,0.04)' : 'transparent', borderBottom: i < PLAN.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', transition: 'background 0.15s' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isVaga ? '#f59e0b' : '#e0e0e0', fontFamily: 'var(--fm)' }}>{isVaga ? 'Vaga' : `${p.d}d`}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4ade80' }}>{p.w}L</span>
                        <span style={{ fontSize: '0.78rem', color: p.s === 0 ? '#f87171' : 'rgba(255,255,255,0.45)' }}>{p.s === 0 ? '✗' : `${p.s}g`}</span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{p.note}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── HUB TAB COMPONENT ──────────────────────────────────────────
const HUB_TOOLS = [
  { id:'rpe',       label:'RPE Kalkulator',  sub:'Izračun 1RM i preporučene težine', color:'#f59e0b', badge:'CALC' },
  { id:'gl',        label:'GL Points',        sub:'IPF Goodlift formula',             color:'#6b8cff', badge:'CALC' },
  { id:'watercut',  label:'Water Cut',        sub:'Plan hidratacije i rezanja',       color:'#22c55e', badge:'CALC' },
  { id:'guide-wc',  label:'Water Cut Guide',  sub:'Protokol dehidracije',             color:'#34d399', badge:'GUIDE'},
  { id:'guide-rpe', label:'RPE Guide',        sub:'Kako koristiti RPE',               color:'#fbbf24', badge:'GUIDE'},
  { id:'guide-peak',label:'Peaking Guide',    sub:'Priprema za natjecanje',           color:'#a78bfa', badge:'GUIDE'},
]

const GUIDE_CONTENT: Record<string,{title:string;body:string[]}> = {
  'guide-wc': { title:'Water Cut Guide', body:[
    '💧 Water Loading (7–5 dana): Pij 5–6L dnevno. "Varaš" tijelo da izlučuje više tekućine, pa kad smanjiš unos, ono nastavlja izlučivati.',
    '🧂 Sol: Smanjuj sol od 4. dana. Sol zadržava vodu — njenim smanjenjem tijelo gubi tekućinu.',
    '🍚 Ugljikohidrati: Svaki gram glikogena veže ~3g vode. Smanjenjem carba u posljednja 2 dana oslobađaš dodatnu tekućinu.',
    '⚠️ OPREZ: Watercut od više od 3–4% tjelesne mase je opasan. Loša hidratacija = loš nastup.',
    '🔋 Rehydratacija: Nakon vage pij elektrolite — ORS otopine ili sportski napitci. Cilj: 1–1.5L u 1–2h od vage.',
  ]},
  'guide-rpe': { title:'RPE Guide', body:[
    'RPE (Rate of Perceived Exertion) je skala 1–10 koja opisuje koliko ti je težak set u odnosu na maksimum.',
    '10 — Maksimum. Više reps nije moguće. / 9 — Jedna reps u rezervi. / 8 — Dvije reps u rezervi. Najčešće u treningu. / 7 — Tri reps u rezervi. Lagan trening, tehnika fokus.',
    'U powerlifting programiranju RPE omogućuje auto-regulaciju — isti @RPE8 set je lakši kad si odmoran, teži kad si umoran, ali napor ostaje konstantan.',
    'Pro tip: Nauči razliku između @RPE8 na kompetitivnim liftovima vs pomoćnim vježbama — deadlift @8 je teži nego curl @8.',
  ]},
  'guide-peak': { title:'Peaking Guide', body:[
    '📈 Tjedan 3: Volumen trening, zadnji heavy week. Postavi operativne maxeve za comp. RPE 9 setovi.',
    '📊 Tjedan 2: Smanji volumen 40%, zadrži intenzitet. Aktivacijski setovi do 90–92%. Tijelo "puni" glikogen.',
    '🎯 Tjedan 1: Samo tehnika i aktivacija. Ništa heavy. Odmori se, spavaj, jedi dobro.',
    '🏋️ Odabir kilaže: Opener = 90–93% max-a. Nešto što bi podigao 10 od 10 puta. Ne herojstvuj na openersima.',
    '💡 Mentalitet: Comp dan je samo još jedan trening. Svi liftovi su drilled, tehnika je utjelovljena. Vjeruj procesu.',
  ]},
}

function HubTab({ tips, athleteName }: { tips: CoachTip[]; athleteName: string }) {
  const [active, setActive] = useState<string | null>(null)
  const activeTool = HUB_TOOLS.find(t => t.id === active)
  const CAT_COLORS: Record<string,string> = { general:'#888', technique:'#6b8cff', nutrition:'#22c55e', competition:'#f59e0b', recovery:'#f472b6' }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Coach tips */}
      {tips.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <SectionTitle>Savjeti od trenera</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
            {tips.map((tip, i) => {
              const c = CAT_COLORS[tip.category] ?? '#888'
              return (
                <div key={tip.id} style={{ padding: '16px 20px', background: `${c}07`, border: `1px solid ${c}18`, borderLeft: `3px solid ${c}`, borderRadius: '10px', animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.58rem', color: c, letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 700 }}>{tip.category.toUpperCase()}</span>
                    <span style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.2)' }}>{new Date(tip.created_at).toLocaleDateString('hr-HR')}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px', fontFamily: 'var(--fm)' }}>{tip.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontFamily: 'var(--fm)' }}>{tip.content}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tools grid */}
      <SectionTitle>Kalkulatori & Vodiči</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(180px,26vw,260px),1fr))', gap: '8px', marginBottom: '20px' }}>
        {HUB_TOOLS.map((tool, i) => {
          const isActive = active === tool.id
          return (
            <button key={tool.id} onClick={() => setActive(isActive ? null : tool.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textAlign: 'left' as const,
                background: isActive ? `${tool.color}10` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isActive ? tool.color + '44' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isActive ? `0 4px 20px ${tool.color}18` : 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' } }}>
              {/* Icon dot */}
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${tool.color}14`, border: `1px solid ${tool.color}2a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tool.color, boxShadow: isActive ? `0 0 8px ${tool.color}` : 'none', transition: 'box-shadow 0.2s' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isActive ? tool.color : '#e8e8f0', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}>{tool.label}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px', fontFamily: 'var(--fm)' }}>{tool.sub}</div>
              </div>
              <span style={{ fontSize: '0.5rem', fontWeight: 700, color: tool.badge === 'CALC' ? tool.color : 'rgba(255,255,255,0.3)', background: tool.badge === 'CALC' ? `${tool.color}14` : 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '5px', border: `1px solid ${tool.badge === 'CALC' ? tool.color + '25' : 'rgba(255,255,255,0.06)'}`, letterSpacing: '0.06em', fontFamily: 'var(--fm)', flexShrink: 0 }}>
                {tool.badge}
              </span>
            </button>
          )
        })}
      </div>

      {/* Active tool panel */}
      {active && activeTool && (
        <div style={{ border: `1.5px solid ${activeTool.color}28`, borderRadius: '16px', overflow: 'hidden', boxShadow: `0 12px 48px rgba(0,0,0,0.4), 0 0 0 1px ${activeTool.color}0a`, animation: 'panelIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
          {/* Panel header */}
          <div style={{ padding: '16px 24px', background: `${activeTool.color}08`, borderBottom: `1px solid ${activeTool.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeTool.color, boxShadow: `0 0 8px ${activeTool.color}` }} />
              <div>
                <div style={{ fontSize: '0.58rem', color: `${activeTool.color}99`, letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '1px' }}>{activeTool.badge}</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f0f0f5', fontFamily: 'var(--fm)' }}>{activeTool.label}</div>
              </div>
            </div>
            <button onClick={() => setActive(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
              <X size={13} />
            </button>
          </div>
          {/* Content */}
          <div style={{ padding: 'clamp(20px,4vw,32px)', background: 'rgba(255,255,255,0.01)' }}>
            {active === 'rpe'      && <RpeCalc />}
            {active === 'gl'       && <GlCalc />}
            {active === 'watercut' && <WaterCutCalc />}
            {['guide-wc','guide-rpe','guide-peak'].includes(active) && (() => {
              const g = GUIDE_CONTENT[active]
              if (!g) return null
              return (
                <div>
                  <SectionTitle>{g.title}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0' }}>
                    {g.body.map((para, i) => (
                      <div key={i} style={{ padding: '14px 0', borderBottom: i < g.body.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <p style={{ fontSize: '0.85rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.65)', margin: 0, fontFamily: 'var(--fm)' }}>{para}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
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
  const [activeTab, setActiveTab] = useState<'program' | 'hub'>('program')
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
            {([['program','Program'],['hub','Hub & Alati']] as [string,string][]).map(([tab,label])=>(
              <button key={tab} onClick={()=>setActiveTab(tab as 'program'|'hub')}
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