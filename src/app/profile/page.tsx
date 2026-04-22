'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Edit3, X } from 'lucide-react'
import { AppNav, AVATARS, AvatarSvg } from '../training/training-components'
import { CATEGORY_GROUPS } from '@/lib/exercises'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Profile = {
  id: string; full_name: string; role: string; avatar_icon: string | null
  bio: string | null; weight_class: string | null
  body_weight: number | null   // current body weight for GL calculation
  sex: 'male' | 'female'       // for GL formula parameters
  current_squat_1rm: number | null; current_bench_1rm: number | null; current_deadlift_1rm: number | null
}
type CompLift = {
  id: string; comp_name: string; comp_date: string
  squat_kg: number | null; bench_kg: number | null; deadlift_kg: number | null
  total_kg: number | null; body_weight: number | null; weight_class: string | null; place: number | null
}
type AdminComp = {
  result_squat: number | null; result_bench: number | null; result_deadlift: number | null
  result_total: number | null; result_place: number | null; result_notes: string | null
  competition: { id: string; name: string; date: string; location: string | null; status: string }
}
type PrLog = {
  id: string; lift: 'squat' | 'bench' | 'deadlift' | 'other'
  reps: number; weight_kg: number; date: string; source: string; notes: string | null
}
type LeaderboardEntry = {
  id: string; full_name: string; avatar_icon: string | null; weight_class: string | null
  body_weight: number | null
  sex: string | null
  training_total: number | null; latest_comp_total: number | null
  latest_comp_date: string | null; latest_body_weight: number | null
  current_squat_1rm: number | null; current_bench_1rm: number | null; current_deadlift_1rm: number | null
}

type CompletionEntry = {
  athlete_id: string
  total_workouts: number
  completed_workouts: number
  completion_pct: number
}

// ─── IPF GL POINTS ────────────────────────────────────────────────
// Formula: GL = total × 100 / (a - b × e^(-c × bodyweight))
const GL_PARAMS = {
  male:   { a: 1199.72839, b: 1025.18162, c: 0.00921 },
  female: { a: 610.32796,  b: 1045.59282, c: 0.03048 },
}
function calcGL(total: number, bw: number, sex: 'male' | 'female' = 'male'): number {
  if (!total || !bw) return 0
  const { a, b, c } = GL_PARAMS[sex]
  const denom = a - b * Math.exp(-c * bw)
  if (denom <= 0) return 0
  return Math.round((total * 100 / denom) * 100) / 100
}


// ─── MINI LINE CHART ───────────────────────────────────────────────

// ─── PROGRESS CHART (NAPREDAK tab) ────────────────────────────────
function ProgressChart({ data, color, label }: {
  data: { date: string; value: number }[]; color: string; label: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) return (
    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '0.72rem', fontFamily: 'var(--fm)', letterSpacing: '0.15em' }}>
      NEMA ULOGIRANIH LIFTOVA
    </div>
  )

  if (data.length === 1) return (
    <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', fontWeight: 800, color, lineHeight: 1 }}>
        {data[0].value}<span style={{ fontSize: '1.4rem', color: '#555', marginLeft: '6px' }}>kg</span>
      </div>
      <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.15em' }}>{data[0].date}</div>
      <div style={{ fontSize: '0.55rem', color: '#2a2a35', letterSpacing: '0.1em', marginTop: '4px' }}>DODAJ JOŠ UNOSA ZA PRIKAZ GRAFA</div>
    </div>
  )

  const W = 560, H = 180, PX = 52, PY = 20
  const vals = data.map(d => d.value)
  const dataMin = Math.min(...vals)
  const dataMax = Math.max(...vals)
  const pad = Math.max((dataMax - dataMin) * 0.25, 10)
  const yMin = Math.floor((dataMin - pad) / 5) * 5
  const yMax = Math.ceil((dataMax + pad) / 5) * 5
  const range = yMax - yMin

  const toX = (i: number) => PX + (i / (data.length - 1)) * (W - PX - 16)
  const toY = (v: number) => PY + ((yMax - v) / range) * (H - PY - 24)

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }))

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }, '')

  const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`

  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMax - (range / ticks) * i)
  const best = Math.max(...vals)
  const glowId = `glow-${label}`
  const gradId = `grad-${label}`

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '180px', overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {yTicks.map((v, i) => {
          const y = PY + (i / ticks) * (H - PY - 24)
          return (
            <g key={i}>
              <line x1={PX} y1={y} x2={W - 8} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PX - 8} y={y + 4} textAnchor="end" fill="#383848" fontSize="10" fontFamily="var(--fm)">{Math.round(v)}</text>
            </g>
          )
        })}

        {pts.map((p, i) => {
          const show = data.length <= 6 || i === 0 || i === pts.length - 1 || i % Math.ceil(data.length / 5) === 0
          if (!show) return null
          return (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fill="#2e2e42" fontSize="9" fontFamily="var(--fm)">{p.date.slice(0, 7)}</text>
          )
        })}

        <path d={fillPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} opacity="0.5" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hovered !== null && (
          <line x1={pts[hovered].x} y1={PY} x2={pts[hovered].x} y2={H - 24} stroke={color} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 4" />
        )}

        {pts.map((p, i) => {
          const isHov = hovered === i
          const isBest = p.value === best
          return (
            <g key={i} style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}>
              <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
              {isHov && <circle cx={p.x} cy={p.y} r="10" fill={color} fillOpacity="0.1" />}
              {isBest && !isHov && <circle cx={p.x} cy={p.y} r="7" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.35" />}
              <circle cx={p.x} cy={p.y} r={isHov ? 5 : 3.5} fill={isHov ? '#fff' : color} stroke={isHov ? color : 'none'} strokeWidth="2" />
            </g>
          )
        })}
      </svg>

      {hovered !== null && (() => {
        const p = pts[hovered]
        const isBest = p.value === best
        const leftPct = (p.x / W) * 100
        const alignRight = leftPct > 68
        return (
          <div style={{
            position: 'absolute',
            bottom: `${(1 - p.y / H) * 100}%`,
            left: alignRight ? 'auto' : `${leftPct}%`,
            right: alignRight ? `${100 - leftPct}%` : 'auto',
            transform: `translateY(-8px) translateX(${alignRight ? '0' : '-50%'})`,
            background: '#0d0d14',
            border: `1px solid ${color}33`,
            borderRadius: '8px',
            padding: '10px 16px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${color}11`,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              {p.value}
              <span style={{ fontSize: '0.8rem', color: '#555' }}>kg</span>
              {isBest && <span style={{ fontSize: '0.42rem', color, border: `1px solid ${color}44`, borderRadius: '3px', padding: '2px 5px', marginLeft: '4px', letterSpacing: '0.12em' }}>BEST</span>}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#555', marginTop: '4px', letterSpacing: '0.05em' }}>{p.date}</div>
          </div>
        )
      })()}
    </div>
  )
}


// ─── MUSCLE GROUP COLORS ──────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'SQUAT':      '#6b8cff',
  'BENCH':      '#f59e0b',
  'DEADLIFT':   '#22c55e',
  'CHEST':      '#ec4899',
  'SHOULDERS':  '#a78bfa',
  'BACK':       '#06b6d4',
  'BICEPS':     '#f97316',
  'TRICEPS':    '#14b8a6',
  'QUADS':      '#84cc16',
  'HAMSTRINGS': '#eab308',
  'GLUTES':     '#fb7185',
}

type MuscleEntry = { group: string; sets: number; tonnage: number; color: string }

// ─── MUSCLE DONUT CHART ───────────────────────────────────────────
function MuscleDonut({ data, view }: { data: MuscleEntry[]; view: 'percent' | 'tonnage' }) {
  const [hovered, setHovered] = useState<string | null>(null)

  const getValue = (d: MuscleEntry) => view === 'percent' ? d.sets : d.tonnage
  const total = data.reduce((s, d) => s + getValue(d), 0)

  if (total === 0) return (
    <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', fontFamily: 'var(--fm)' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.15)', animation: 'ms-ping 2s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: '6px', borderRadius: '50%', border: '2px solid rgba(99,102,241,0.25)', animation: 'ms-ping 2s ease-out infinite 0.4s' }} />
        <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: 'rgba(99,102,241,0.18)', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.25em', color: '#818cf8', marginBottom: '5px' }}>DOLAZI USKORO</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>Statistika mišićnih skupina</div>
      </div>
      <style>{`
        @keyframes ms-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          60%  { transform: scale(1.5); opacity: 0;   }
          100% { transform: scale(1.5); opacity: 0;   }
        }
      `}</style>
    </div>
  )

  const CX = 100, CY = 100, R = 82, r = 50
  let angle = -Math.PI / 2

  const slices = data
    .filter(d => getValue(d) > 0)
    .map(d => {
      const pct = getValue(d) / total
      const span = pct * 2 * Math.PI
      const s = { ...d, start: angle, end: angle + span, pct }
      angle += span
      return s
    })

  const pt = (a: number, radius: number) => ({
    x: CX + radius * Math.cos(a),
    y: CY + radius * Math.sin(a),
  })

  const arc = (sa: number, ea: number) => {
    const o1 = pt(sa, R), o2 = pt(ea, R)
    const i1 = pt(ea, r), i2 = pt(sa, r)
    const lg = ea - sa > Math.PI ? 1 : 0
    return `M${o1.x} ${o1.y} A${R} ${R} 0 ${lg} 1 ${o2.x} ${o2.y} L${i1.x} ${i1.y} A${r} ${r} 0 ${lg} 0 ${i2.x} ${i2.y}Z`
  }

  const hov = hovered ? slices.find(s => s.group === hovered) : null
  const sorted = [...slices].sort((a, b) => b.pct - a.pct)

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          {slices.map(s => {
            const isHov = s.group === hovered
            const gap = 0.018
            return (
              <path key={s.group}
                d={arc(s.start + gap, s.end - gap)}
                fill={isHov ? s.color : `${s.color}b0`}
                stroke="none"
                transform={isHov ? `translate(${Math.cos((s.start+s.end)/2)*4} ${Math.sin((s.start+s.end)/2)*4})` : ''}
                onMouseEnter={() => setHovered(s.group)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer', transition: 'fill 0.15s, transform 0.15s' }}
              />
            )
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {hov ? (
            <>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: hov.color, lineHeight: 1 }}>{Math.round(hov.pct * 100)}%</div>
              <div style={{ fontSize: '0.48rem', color: '#888', letterSpacing: '0.1em', textAlign: 'center', maxWidth: '60px', marginTop: '4px' }}>{hov.group}</div>
              <div style={{ fontSize: '0.58rem', color: '#666', marginTop: '3px' }}>
                {view === 'percent' ? `${hov.sets} ser.` : `${(hov.tonnage / 1000).toFixed(1)}t`}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', color: '#555', lineHeight: 1 }}>{slices.length}</div>
              <div style={{ fontSize: '0.46rem', color: '#444', letterSpacing: '0.1em', marginTop: '4px' }}>GRUPE</div>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
        {sorted.map(s => (
          <div key={s.group}
            onMouseEnter={() => setHovered(s.group)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', opacity: hovered && hovered !== s.group ? 0.35 : 1, transition: 'opacity 0.15s' }}>
            <div style={{ width: '7px', height: '7px', background: s.color, flexShrink: 0, borderRadius: '2px' }} />
            <div style={{ flex: 1, fontSize: '0.68rem', color: '#c0c0c0', fontFamily: 'var(--fm)' }}>{s.group}</div>
            <div style={{ fontSize: '0.62rem', color: s.color, fontFamily: 'var(--fd)', fontWeight: 700 }}>
              {view === 'percent' ? `${s.sets}s` : `${(s.tonnage / 1000).toFixed(1)}t`}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#444', minWidth: '30px', textAlign: 'right' }}>{Math.round(s.pct * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AVATAR PICKER MODAL ──────────────────────────────────────────
function AvatarPicker({ current, onSelect, onClose }: {
  current: string; onSelect: (id: string) => void; onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s' }}
      onClick={onClose}>
      <div style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: '#888', fontFamily: 'var(--fm)' }}>ODABERI AVATAR</div>
          <button onClick={onClose} style={{ background: '#1c1c20', border: '1px solid rgba(255,255,255,0.1)', color: '#888', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {AVATARS.map(av => (
            <button key={av.id} onClick={() => { onSelect(av.id); onClose() }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 8px', background: current === av.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${current === av.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', color: current === av.id ? '#fff' : '#888' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = current === av.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = current === av.id ? '#fff' : '#888' }}>
              <AvatarSvg iconId={av.id} size={36} />
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.1em', fontFamily: 'var(--fm)' }}>{av.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PROFILE PAGE ────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [adminComps, setAdminComps]   = useState<AdminComp[]>([])
  const [prLogs, setPrLogs]           = useState<PrLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [completions, setCompletions] = useState<Record<string, { total: number; done: number; pct: number }>>({})
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<'progress' | 'prs' | 'leaderboard'>('progress')
  const [progressLift, setProgressLift] = useState<'squat'|'bench'|'deadlift'>('squat')
  const [progressReps, setProgressReps] = useState<number>(1)
  const [prLift, setPrLift]           = useState<'squat'|'bench'|'deadlift'>('squat')
  const [prReps, setPrReps]           = useState(1)
  const [muscleData, setMuscleData]   = useState<MuscleEntry[]>([])
  const [muscleView, setMuscleView]   = useState<'percent'|'tonnage'>('percent')
  const [isCoach, setIsCoach]         = useState(false)
  const [assignedLifterIds, setAssignedLifterIds] = useState<string[]>([])
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [editingORM, setEditingORM]   = useState(false)
  const [ormVals, setOrmVals]         = useState({ squat: '', bench: '', deadlift: '', body_weight: '', sex: 'male' as 'male'|'female' })
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: athleteStat }, { data: prs }, { data: lb }, { data: workoutRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('athlete_stats').select('id').eq('profile_id', user.id).maybeSingle(),
        supabase.from('pr_logs').select('*').eq('athlete_id', user.id).order('date', { ascending: false }),
        supabase.from('leaderboard_view').select('*'),
        supabase.from('workouts').select('athlete_id, completed'),
      ])

      if (prof?.role === 'trener') {
        setIsCoach(true)
        const { data: asgn } = await supabase.from('coach_assignments').select('lifter_id').eq('coach_id', user.id)
        setAssignedLifterIds((asgn ?? []).map((a: any) => a.lifter_id))
      }

      let compsData = null
      if (athleteStat?.id) {
        const { data } = await supabase
          .from('competition_athletes')
          .select('result_squat, result_bench, result_deadlift, result_total, result_place, result_notes, competition:competitions(id, name, date, location, status)')
          .eq('athlete_id', athleteStat.id)
        compsData = data
      }

      // Build completion map: athlete_id → { total, done, pct }
      const compMap: Record<string, { total: number; done: number; pct: number }> = {}
      for (const w of (workoutRows ?? [])) {
        if (!w.athlete_id) continue
        if (!compMap[w.athlete_id]) compMap[w.athlete_id] = { total: 0, done: 0, pct: 0 }
        compMap[w.athlete_id].total++
        if (w.completed) compMap[w.athlete_id].done++
      }
      for (const k of Object.keys(compMap)) {
        const c = compMap[k]
        c.pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0
      }
      setCompletions(compMap)

      setProfile(prof as Profile)
      setAdminComps(((compsData ?? []) as unknown as AdminComp[]).sort((a, b) => b.competition.date.localeCompare(a.competition.date)))
      setPrLogs((prs ?? []) as PrLog[])
      setLeaderboard((lb ?? []) as LeaderboardEntry[])
      if (prof) setOrmVals({ squat: String(prof.current_squat_1rm ?? ''), bench: String(prof.current_bench_1rm ?? ''), deadlift: String(prof.current_deadlift_1rm ?? ''), body_weight: String(prof.body_weight ?? ''), sex: (prof.sex ?? 'male') as 'male'|'female' })

      // ── Muscle group data from all logged workout exercises ───────
      try {
        const { data: allBlocks } = await supabase
          .from('blocks').select('id').eq('athlete_id', user.id)
        const blockIds = (allBlocks ?? []).map((b: any) => b.id)
        if (blockIds.length > 0) {
          const { data: wks } = await supabase.from('weeks').select('id').in('block_id', blockIds)
          const wkIds = (wks ?? []).map((w: any) => w.id)
          if (wkIds.length > 0) {
            const { data: wos } = await supabase.from('workouts').select('id').in('week_id', wkIds)
            const woIds = (wos ?? []).map((w: any) => w.id)
            if (woIds.length > 0) {
              const { data: weRows } = await supabase
                .from('workout_exercises')
                .select('actual_reps, actual_weight_kg, planned_sets, planned_reps, planned_weight_kg, exercise:exercises(category)')
                .in('workout_id', woIds)
              const groupMap: Record<string, { sets: number; tonnage: number }> = {}
              for (const we of (weRows ?? [])) {
                const cat = (we.exercise as any)?.category as string
                if (!cat) continue
                let grp: string | null = null
                for (const [g, cats] of Object.entries(CATEGORY_GROUPS)) {
                  if ((cats as string[]).includes(cat)) { grp = g; break }
                }
                if (!grp) continue
                if (!groupMap[grp]) groupMap[grp] = { sets: 0, tonnage: 0 }
                const sets = we.planned_sets ?? 1
                const repsRaw = we.actual_reps ?? String(we.planned_reps ?? '5')
                const reps = parseInt(repsRaw.match(/\d+/)?.[0] ?? '5') || 5
                const kg = we.actual_weight_kg ?? we.planned_weight_kg ?? 0
                groupMap[grp].sets += sets
                groupMap[grp].tonnage += sets * reps * kg
              }
              setMuscleData(Object.entries(groupMap).map(([group, v]) => ({
                group, ...v, color: GROUP_COLORS[group] ?? '#888'
              })))
            }
          }
        }
      } catch { /* ignore muscle data errors */ }

      setLoading(false)
    }
    init()
  }, [])

  const saveAvatar = async (iconId: string) => {
    if (!userId) return
    const { error } = await supabase.from('profiles').update({ avatar_icon: iconId }).eq('id', userId)
    if (error) { console.error('saveAvatar:', error); return }
    setProfile(p => p ? { ...p, avatar_icon: iconId } : p)
    setLeaderboard(lb => lb.map(e => e.id === userId ? { ...e, avatar_icon: iconId } : e))
  }

  const saveORMs = async () => {
    if (!userId) return
    const data = {
      current_squat_1rm:    ormVals.squat        ? Number(ormVals.squat)        : null,
      current_bench_1rm:    ormVals.bench        ? Number(ormVals.bench)        : null,
      current_deadlift_1rm: ormVals.deadlift     ? Number(ormVals.deadlift)     : null,
      body_weight:          ormVals.body_weight  ? Number(ormVals.body_weight)  : null,
      sex:                  ormVals.sex,
    }
    const { error } = await supabase.from('profiles').update(data).eq('id', userId)
    if (error) { console.error('saveORMs:', error); return }
    setProfile(p => p ? { ...p, ...data } : p)
    // Update leaderboard entry for self so GL updates instantly
    setLeaderboard(lb => lb.map(e => e.id === userId ? { ...e, body_weight: data.body_weight, sex: data.sex } : e))
    setEditingORM(false)
  }

  const addPrLog = async (lift: PrLog['lift'], reps: number, weight: number, date: string) => {
    if (!userId) return
    const { data: row } = await supabase.from('pr_logs').insert({ athlete_id: userId, lift, reps, weight_kg: weight, date, source: 'manual' }).select('*').single()
    if (row) setPrLogs(p => [row as PrLog, ...p])
  }

  const deletePrLog = async (id: string) => {
    const { error } = await supabase.from('pr_logs').delete().eq('id', id)
    if (error) { console.error('deletePrLog:', error); return }
    setPrLogs(p => p.filter(x => x.id !== id))
  }


  // ── Best lift by reps ──────────────────────────────────────────
  const bestByReps = (lift: 'squat'|'bench'|'deadlift', reps: number): PrLog | null => {
    const filtered = prLogs.filter(p => p.lift === lift && p.reps === reps)
    if (!filtered.length) return null
    return filtered.reduce((best, cur) => cur.weight_kg > best.weight_kg ? cur : best)
  }

  // ── Leaderboard sort by workout completion % ──────────────────
  const lbSorted = useMemo(() =>
    [...leaderboard]
      .filter(e => !isCoach || assignedLifterIds.includes(e.id))
      .map(e => {
        const c = completions[e.id] ?? { total: 0, done: 0, pct: 0 }
        return { ...e, compTotal: c.total, compDone: c.done, compPct: c.pct }
      })
      .filter(e => e.compTotal > 0)
      .sort((a, b) => b.compPct - a.compPct || b.compDone - a.compDone)
  , [leaderboard, isCoach, assignedLifterIds, completions])

  if (loading) return (
    <div style={{ background: '#06060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#555', fontFamily: 'var(--fm)' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.25em' }}>UČITAVANJE...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!profile) return null

  const currentAvatar = profile.avatar_icon ?? 'barbell'
  const trainingTotal = (profile.current_squat_1rm ?? 0) + (profile.current_bench_1rm ?? 0) + (profile.current_deadlift_1rm ?? 0)

  return (
    <div style={{ background: '#04040a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── BACKGROUND ── */}
      {/* Noise */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px' }} />
      {/* Grid — fades toward bottom */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 72%)' }} />
      {/* Aurora — top left, indigo */}
      <div style={{ position: 'fixed', top: '-25vh', left: '-15vw', width: '80vw', height: '80vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 40% 40%, rgba(79,70,229,0.15) 0%, rgba(59,130,246,0.07) 40%, transparent 70%)',
        filter: 'blur(70px)', transform: 'rotate(-12deg)' }} />
      {/* Aurora — bottom right, emerald */}
      <div style={{ position: 'fixed', bottom: '-20vh', right: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 60% 60%, rgba(16,185,129,0.11) 0%, rgba(5,150,105,0.05) 45%, transparent 70%)',
        filter: 'blur(80px)' }} />
      {/* Top beam */}
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 30%, rgba(139,92,246,0.45) 50%, rgba(99,102,241,0.35) 70%, transparent 100%)',
        boxShadow: '0 0 40px 8px rgba(99,102,241,0.1)' }} />
      {/* Vignette */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)' }} />
      {/* logopng — bottom right */}
      <div style={{ position: 'fixed', bottom: '5vh', right: '2vw', zIndex: 0, pointerEvents: 'none', opacity: 0.03, filter: 'blur(0.5px) grayscale(1)' }}>
        <img src="/slike/logopng.png" alt="" width="160" height="117" style={{ width: '160px', height: 'auto' }} />
      </div>

      <AppNav
        athleteName={profile?.full_name ?? ''}
        isAdmin={profile?.role === 'admin'}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/') }}
        avatarIcon={profile?.avatar_icon ?? 'barbell'}
      />

      <div style={{ paddingTop: '60px', maxWidth: '1000px', margin: '0 auto', padding: 'clamp(80px,10vw,100px) clamp(16px,4vw,32px) 80px', position: 'relative', zIndex: 1 }}>

        {/* ── PROFILE HEADER ── */}
        <div className="prof-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(16px,4vw,32px)', marginBottom: '40px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setShowAvatarPicker(true)}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(145deg, #141420, #0c0c14)', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: '0', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none' }}>
              <AvatarSvg iconId={currentAvatar} size={44} color="rgba(255,255,255,0.9)" />
            </button>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '22px', height: '22px', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit3 size={10} color="#aaa" />
            </div>
          </div>

          {/* Name & info */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.45em', color: '#555', marginBottom: '6px', fontFamily: 'var(--fm)' }}>
              {profile.role.toUpperCase()} {profile.weight_class ? `· ${profile.weight_class}` : ''}
            </div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,5vw,2.8rem)', fontWeight: 800, lineHeight: 0.92, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {profile.full_name}
            </h1>
          </div>

          {/* 1RM summary */}
          <div className="prof-orm-bar" style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
            {[
              { label: 'SQ', val: profile.current_squat_1rm, color: '#6b8cff' },
              { label: 'BP', val: profile.current_bench_1rm, color: '#f59e0b' },
              { label: 'DL', val: profile.current_deadlift_1rm, color: '#22c55e' },
              { label: 'TOT', val: trainingTotal || null, color: '#e0e0e0' },
            ].map((s, i) => (
              <div key={i} style={{ padding: 'clamp(10px,2vw,16px) clamp(12px,2.5vw,20px)', background: '#09090e', textAlign: 'center', minWidth: 'clamp(52px,8vw,64px)' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.1rem,3vw,1.6rem)', fontWeight: 800, lineHeight: 1, color: s.val ? s.color : '#2a2a35' }}>
                  {s.val ? `${s.val}` : '—'}
                </div>
                <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.2em', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
            <button onClick={() => setEditingORM(!editingORM)}
              style={{ padding: '0 12px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.07)', color: '#555', cursor: 'pointer', transition: 'color 0.2s' }}
              title="Uredi 1RM"
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}>
              <Edit3 size={13} />
            </button>
          </div>
        </div>

        {/* 1RM edit panel */}
        {editingORM && (
          <div className="prof-orm-edit" style={{ marginBottom: '28px', padding: '18px 20px', background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
            {[
              { k: 'squat', label: 'ČUČANJ 1RM (kg)', color: '#6b8cff' },
              { k: 'bench', label: 'BENCH 1RM (kg)', color: '#f59e0b' },
              { k: 'deadlift', label: 'MRTVO 1RM (kg)', color: '#22c55e' },
            ].map(f => (
              <div key={f.k} style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ fontSize: '0.46rem', color: f.color, letterSpacing: '0.2em', marginBottom: '5px', fontFamily: 'var(--fm)' }}>{f.label}</div>
                <input type="number" step="0.5" value={(ormVals as any)[f.k]} onChange={e => setOrmVals(o => ({ ...o, [f.k]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${f.color}44`, color: '#e0e0e0', padding: '8px 12px', borderRadius: '6px', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = f.color}
                  onBlur={e => e.target.style.borderColor = `${f.color}44`} />
              </div>
            ))}
            <button onClick={saveORMs} style={{ padding: '9px 20px', background: '#fff', border: 'none', color: '#000', borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>SPREMI</button>
            <button onClick={() => setEditingORM(false)} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#666', borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'var(--fm)' }}>✕</button>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="prof-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
          {([['progress', 'NAPREDAK'], ['prs', 'OSOBNI REKORDI'], ['leaderboard', 'LEADERBOARD']] as [string, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              style={{ padding: '12px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.62rem', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, color: activeTab === tab ? '#fff' : '#555', borderBottom: `2px solid ${activeTab === tab ? '#fff' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ TAB: NAPREDAK ══════════════════════════════════════════ */}
        {activeTab === 'progress' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>

            {/* PR progress chart */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0e0e14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', marginBottom: '3px', fontFamily: 'var(--fm)' }}>PR NAPREDAK</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0' }}>
                    {{ squat: 'ČUČANJ', bench: 'BENCH PRESS', deadlift: 'MRTVO DIZANJE' }[progressLift]}
                  </div>
                </div>
                <div className="prof-chart-filters" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {([['squat', 'ČUČANJ', '#6b8cff'], ['bench', 'BENCH', '#f59e0b'], ['deadlift', 'MRTVO', '#22c55e']] as const).map(([k, label, color]) => (
                    <button key={k} onClick={() => setProgressLift(k)}
                      style={{ padding: '5px 12px', background: progressLift === k ? color + '22' : 'transparent', border: `1px solid ${progressLift === k ? color : 'rgba(255,255,255,0.1)'}`, color: progressLift === k ? color : '#666', borderRadius: '5px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 20px 0', background: '#09090e', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, paddingBottom: '12px' }}>
                  {[1,2,3,4,5,6,8,10,12].map(r => {
                    const hasData = prLogs.some(p => p.lift === progressLift && p.reps === r)
                    return (
                      <button key={r} onClick={() => setProgressReps(r)} disabled={!hasData}
                        style={{ padding: '4px 10px', background: progressReps === r ? 'rgba(255,255,255,0.1)' : 'transparent', border: `1px solid ${progressReps === r ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}`, color: progressReps === r ? '#fff' : hasData ? '#555' : '#2a2a35', borderRadius: '5px', cursor: hasData ? 'pointer' : 'default', fontSize: '0.58rem', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}>
                        {r}RM
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ padding: '20px 20px 12px', background: '#09090e' }}>
                {(() => {
                  const liftColor = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[progressLift]
                  const chartData = [...prLogs]
                    .filter(p => p.lift === progressLift && p.reps === progressReps)
                    .reverse()
                    .map(p => ({ date: p.date, value: p.weight_kg }))
                  return <ProgressChart data={chartData} color={liftColor} label={`${progressLift}-${progressReps}rm`} />
                })()}
              </div>
            </div>

            {/* ── MUSCLE GROUP PIE CHART ── */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0e0e14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', marginBottom: '3px', fontFamily: 'var(--fm)' }}>AKTIVNI BLOK</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0' }}>RASPODJELA MIŠIĆNIH SKUPINA</div>
                </div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                  {(['percent', 'tonnage'] as const).map(v => (
                    <button key={v} onClick={() => setMuscleView(v)}
                      style={{ padding: '6px 16px', background: muscleView === v ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: muscleView === v ? '#fff' : '#666', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s' }}>
                      {v === 'percent' ? '% SERIJA' : 'TONAZA'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '20px', background: '#09090e' }}>
                <MuscleDonut data={muscleData} view={muscleView} />
              </div>
            </div>


            {/* Admin-logged competition history */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0e0e14' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', fontFamily: 'var(--fm)' }}>NATJECANJA</div>
              </div>

              {adminComps.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                  Admin još nije ulogirao tvoje natjecateljske rezultate.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0a0a10' }}>
                        {['NATJECANJE', 'DATUM', 'SQ', 'BP', 'DL', 'TOTAL', 'MJ.', 'BILJEŠKA'].map(h => (
                          <th key={h} className={h === 'BILJEŠKA' ? 'comp-table-hide' : ''} style={{ padding: '8px 14px', fontSize: '0.46rem', color: '#555', letterSpacing: '0.2em', textAlign: 'left', fontFamily: 'var(--fm)', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminComps.map((c, i) => (
                        <tr key={i} style={{ borderBottom: i < adminComps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#e0e0e0', fontWeight: 500 }}>{c.competition.name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#777' }}>{c.competition.date}</td>
                          {[c.result_squat, c.result_bench, c.result_deadlift].map((v, j) => (
                            <td key={j} style={{ padding: '10px 14px', fontSize: '0.82rem', color: ['#6b8cff','#f59e0b','#22c55e'][j], fontWeight: 600 }}>{v ?? '—'}</td>
                          ))}
                          <td style={{ padding: '10px 14px', fontSize: '0.88rem', color: '#e0e0e0', fontWeight: 700 }}>{c.result_total ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: c.result_place === 1 ? '#facc15' : '#888', fontWeight: c.result_place ? 700 : 400 }}>
                            {c.result_place ? `${c.result_place}.` : '—'}
                          </td>
                          <td className="comp-table-hide" style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#666', fontStyle: 'italic' }}>{c.result_notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: OSOBNI REKORDI ════════════════════════════════════ */}
        {activeTab === 'prs' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>

            {/* Best by reps selector */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', background: 'linear-gradient(160deg, #0e0e14 0%, #09090e 100%)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', marginBottom: '12px', fontFamily: 'var(--fm)' }}>BEST LIFT PO BROJU PONAVLJANJA</div>
                {/* Lift selector */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {([['squat', 'ČUČANJ', '#6b8cff'], ['bench', 'BENCH', '#f59e0b'], ['deadlift', 'MRTVO', '#22c55e']] as const).map(([k, label, color]) => (
                    <button key={k} onClick={() => setPrLift(k)}
                      style={{ padding: '6px 14px', background: prLift === k ? color + '22' : 'transparent', border: `1px solid ${prLift === k ? color : 'rgba(255,255,255,0.1)'}`, color: prLift === k ? color : '#666', borderRadius: '6px', cursor: 'pointer', fontSize: '0.62rem', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Reps selector */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(r => {
                    const best = bestByReps(prLift, r)
                    return (
                      <button key={r} onClick={() => setPrReps(r)}
                        style={{ padding: '6px 12px', background: prReps === r ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${prReps === r ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: prReps === r ? '#fff' : '#555', borderRadius: '6px', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--fm)', transition: 'all 0.15s', position: 'relative' }}>
                        {r}RM
                        {best && <div style={{ position: 'absolute', top: '-6px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: ['squat','bench','deadlift'].includes(prLift) ? { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[prLift] : '#888' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Best result display */}
              {(() => {
                const best = bestByReps(prLift, prReps)
                const liftColor = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[prLift]
                return (
                  <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      {best ? (
                        <>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(2.5rem,7vw,4rem)', fontWeight: 800, lineHeight: 1, color: liftColor }}>
                            {best.weight_kg}<span style={{ fontSize: '1.2rem', color: '#555', marginLeft: '4px' }}>kg</span>
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '6px', letterSpacing: '0.1em' }}>
                            {prReps}RM · {best.date} · {best.source}
                          </div>
                          {best.notes && <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px' }}>{best.notes}</div>}
                        </>
                      ) : (
                        <div style={{ color: '#444', fontSize: '0.82rem' }}>Nema ulogiranog {prReps}RM za {prLift}</div>
                      )}
                    </div>
                    <div style={{ fontSize: '2.5rem', opacity: 0.15, fontFamily: 'var(--fd)', fontWeight: 800 }}>{prReps}RM</div>
                  </div>
                )
              })()}
            </div>

            {/* Add PR form */}
            <AddPrForm prLift={prLift} prReps={prReps} onAdd={addPrLog} />

            {/* PR log list */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginTop: '16px' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0e0e14', fontSize: '0.5rem', color: '#666', letterSpacing: '0.35em', fontFamily: 'var(--fm)' }}>SVE ULOGIRANO</div>
              {prLogs.filter(p => p.lift === prLift).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: '0.75rem' }}>Nema ulogiranih liftova za {prLift}.</div>
              ) : prLogs.filter(p => p.lift === prLift).map((p, i, arr) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ fontSize: '0.62rem', color: '#555', width: '32px', flexShrink: 0 }}>{p.reps}RM</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.9rem' }}>{p.weight_kg}kg</span>
                    {p.notes && <span style={{ marginLeft: '10px', fontSize: '0.68rem', color: '#666' }}>{p.notes}</span>}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#555' }}>{p.date}</div>
                  <div style={{ fontSize: '0.55rem', color: '#444', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>{p.source}</div>
                  <button onClick={() => deletePrLog(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#333', padding: '2px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#333'}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: LEADERBOARD ══════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: '#555', marginBottom: '16px', fontFamily: 'var(--fm)' }}>
              POSTOTAK ZAVRŠENIH TRENINGA · SORTIRANO PO KONZISTENTNOSTI
            </div>

            {lbSorted.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>Nema dovoljno podataka za leaderboard.</div>
            ) : lbSorted.map((e, i) => {
              const isMe = e.id === userId
              const medal = i === 0 ? '#facc15' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : null
              const pctColor = e.compPct >= 90 ? '#22c55e' : e.compPct >= 70 ? '#f59e0b' : e.compPct >= 50 ? '#6b8cff' : '#666'
              return (
                <div key={e.id} className="lb-entry" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', marginBottom: '6px', background: isMe ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'all 0.15s', boxShadow: isMe ? '0 0 20px rgba(255,255,255,0.05)' : 'none' }}>

                  {/* Rank */}
                  <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                    {medal
                      ? <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 800, color: medal }}>{i + 1}</div>
                      : <div style={{ fontSize: '0.72rem', color: '#555', fontFamily: 'var(--fd)', fontWeight: 700 }}>{i + 1}</div>
                    }
                  </div>

                  {/* Avatar */}
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111118', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AvatarSvg iconId={e.avatar_icon ?? 'barbell'} size={22} color="rgba(255,255,255,0.7)" />
                  </div>

                  {/* Name + progress bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lb-entry-name" style={{ fontSize: '0.88rem', fontWeight: 600, color: isMe ? '#fff' : '#e0e0e0', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {e.full_name}
                      {isMe && <span style={{ fontSize: '0.48rem', letterSpacing: '0.2em', color: '#6b8cff', border: '1px solid rgba(107,140,255,0.3)', padding: '2px 6px', borderRadius: '4px' }}>TI</span>}
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${e.compPct}%`, background: pctColor, borderRadius: '2px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="lb-entry-stats" style={{ display: 'flex', gap: '16px', flexShrink: 0, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 800, color: medal ?? pctColor }}>{e.compPct}%</div>
                      <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.15em' }}>ZAVRŠENO</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#666', fontFamily: 'var(--fm)' }}>{e.compDone}/{e.compTotal}</div>
                      <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.15em' }}>TRENINGA</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '0.6rem', color: '#444', lineHeight: 1.7 }}>
              Rangirano po postotku završenih treninga. U slučaju jednakog postotka, više apsolutnih treninga dolazi više.
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showAvatarPicker && <AvatarPicker current={currentAvatar} onSelect={saveAvatar} onClose={() => setShowAvatarPicker(false)} />}


      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes spin    { to { transform:rotate(360deg) } }
        table { font-family: var(--fm); }
        td, th { vertical-align: middle; }
        input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { opacity: 0.5; }

        /* ─ Profile header: stack on mobile ─ */
        @media (max-width: 600px) {
          .prof-header { flex-direction: column; align-items: flex-start !important; }
          .prof-orm-bar { width: 100%; flex-shrink: 1 !important; }
          .prof-orm-bar > div { flex: 1; min-width: 0; padding: 10px 8px !important; }
        }

        /* ─ Tabs: scrollable on mobile ─ */
        @media (max-width: 540px) {
          .prof-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .prof-tabs button { white-space: nowrap; padding: 10px 10px !important; font-size: 0.54rem !important; letter-spacing: 0.15em !important; }
        }

        /* ─ Comp chart buttons: wrap on mobile ─ */
        @media (max-width: 520px) {
          .prof-chart-filters { flex-wrap: wrap !important; gap: 4px !important; }
          .prof-chart-filters button { font-size: 0.52rem !important; padding: 4px 8px !important; }
        }

        /* ─ 1RM edit panel ─ */
        @media (max-width: 520px) {
          .prof-orm-edit { flex-direction: column !important; }
          .prof-orm-edit > div { min-width: 0 !important; width: 100% !important; }
          .prof-orm-edit button { width: 100%; justify-content: center; }
        }

        /* ─ Comp table ─ */
        @media (max-width: 600px) {
          table { font-size: 0.72rem; }
          td, th { padding: 7px 8px !important; }
        }
        @media (max-width: 440px) {
          .comp-table-hide { display: none !important; }
        }

        /* ─ Leaderboard entries: smaller on mobile ─ */
        @media (max-width: 540px) {
          .lb-entry { padding: 10px 12px !important; gap: 8px !important; }
          .lb-entry-stats { gap: 10px !important; }
          .lb-entry-stats > div > div:first-child { font-size: 1.1rem !important; }
        }
        @media (max-width: 380px) {
          .lb-entry-name { font-size: 0.78rem !important; }
          .lb-entry-stats { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ─── ADD PR FORM ──────────────────────────────────────────────────
function AddPrForm({ prLift, prReps, onAdd }: {
  prLift: 'squat'|'bench'|'deadlift'
  prReps: number
  onAdd: (lift: 'squat'|'bench'|'deadlift', reps: number, weight: number, date: string) => Promise<void>
}) {
  const [weight, setWeight] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const liftColor = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[prLift]

  const submit = async () => {
    if (!weight || !date) return
    setSaving(true)
    await onAdd(prLift, prReps, Number(weight), date)
    setWeight('')
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px 20px', background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '100px' }}>
        <div style={{ fontSize: '0.46rem', color: liftColor, letterSpacing: '0.2em', marginBottom: '5px', fontFamily: 'var(--fm)' }}>KILAZA (KG)</div>
        <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={`novi ${prReps}RM...`}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${liftColor}44`, color: '#e0e0e0', padding: '9px 12px', borderRadius: '7px', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = liftColor}
          onBlur={e => e.target.style.borderColor = `${liftColor}44`} />
      </div>
      <div style={{ flex: 1, minWidth: '120px' }}>
        <div style={{ fontSize: '0.46rem', color: '#666', letterSpacing: '0.2em', marginBottom: '5px', fontFamily: 'var(--fm)' }}>DATUM</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '9px 12px', borderRadius: '7px', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
      </div>
      <button onClick={submit} disabled={saving || !weight}
        style={{ padding: '10px 20px', background: weight ? '#fff' : 'rgba(255,255,255,0.08)', border: 'none', color: weight ? '#000' : '#555', borderRadius: '7px', cursor: weight ? 'pointer' : 'not-allowed', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
        {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
        LOGIRAJ {prReps}RM
      </button>
    </div>
  )
}