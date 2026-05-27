'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { AppNav, AVATARS, AvatarSvg } from '../training/training-components'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Profile = {
  id: string; full_name: string; role: string; avatar_icon: string | null
  bio: string | null; weight_class: string | null
  body_weight: number | null
  sex: 'male' | 'female'
  current_squat_1rm: number | null; current_bench_1rm: number | null; current_deadlift_1rm: number | null
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
  body_weight: number | null; sex: string | null
  training_total: number | null; latest_comp_total: number | null
  latest_comp_date: string | null; latest_body_weight: number | null
  current_squat_1rm: number | null; current_bench_1rm: number | null; current_deadlift_1rm: number | null
}

// ─── IPF GL POINTS ────────────────────────────────────────────────
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

// ─── MUSCLE GROUP COLORS ──────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'SQUAT': '#6b8cff', 'BENCH': '#f59e0b', 'DEADLIFT': '#22c55e',
  'CHEST': '#ec4899', 'SHOULDERS': '#a78bfa', 'BACK': '#06b6d4',
  'BICEPS': '#f97316', 'TRICEPS': '#14b8a6', 'QUADS': '#84cc16',
  'HAMSTRINGS': '#eab308', 'GLUTES': '#fb7185', 'CORE': '#e879f9', 'REHAB': '#94a3b8',
}
const DB_CAT_TO_GROUP: Record<string, string> = {
  'Squat': 'SQUAT', 'Squat Variation': 'SQUAT',
  'Bench': 'BENCH', 'Bench Variation': 'BENCH',
  'Deadlift': 'DEADLIFT', 'Deadlift Variation': 'DEADLIFT',
  'Chest Upper': 'CHEST', 'Chest Mid': 'CHEST', 'Chest Lower': 'CHEST',
  'Delts Front': 'SHOULDERS', 'Delts Side': 'SHOULDERS', 'Delts Rear': 'SHOULDERS',
  'Back Upper': 'BACK', 'Back Mid': 'BACK', 'Back Lats': 'BACK', 'Erectors': 'BACK',
  'Biceps Inner': 'BICEPS', 'Biceps Outer': 'BICEPS', 'Biceps Brachialis': 'BICEPS',
  'Triceps Long': 'TRICEPS', 'Triceps Lateral': 'TRICEPS', 'Triceps Medial': 'TRICEPS',
  'Quads': 'QUADS', 'Hamstring': 'HAMSTRINGS', 'Glute': 'GLUTES', 'Adductors': 'QUADS',
  'Core': 'CORE', 'Knee Rehab': 'REHAB',
}
type MuscleEntry = { group: string; sets: number; tonnage: number; color: string }

// ─── GLASS STYLE ──────────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
}

// ─── PROGRESS CHART ───────────────────────────────────────────────
function ProgressChart({ data, color, label }: {
  data: { date: string; value: number }[]; color: string; label: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length === 0) return (
    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', fontFamily: 'var(--fm)', letterSpacing: '0.15em' }}>
      NEMA ULOGIRANIH LIFTOVA
    </div>
  )
  if (data.length === 1) return (
    <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', fontWeight: 800, color, lineHeight: 1 }}>
        {data[0].value}<span style={{ fontSize: '1.4rem', color: 'rgba(255,255,255,0.2)', marginLeft: '6px' }}>kg</span>
      </div>
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>{data[0].date}</div>
    </div>
  )

  const W = 680, H = 220, PX = 48, PY = 20
  const vals = data.map(d => d.value)
  const dataMin = Math.min(...vals), dataMax = Math.max(...vals)
  const pad = Math.max((dataMax - dataMin) * 0.25, 10)
  const yMin = Math.floor((dataMin - pad) / 5) * 5
  const yMax = Math.ceil((dataMax + pad) / 5) * 5
  const range = yMax - yMin
  const toX = (i: number) => PX + (i / (data.length - 1)) * (W - PX - 20)
  const toY = (v: number) => PY + ((yMax - v) / range) * (H - PY - 30)
  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }))
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1], cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }, '')
  const fillPath = `${linePath} L ${pts[pts.length-1].x} ${H-30} L ${pts[0].x} ${H-30} Z`
  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMax - (range / ticks) * i)
  const best = Math.max(...vals)
  const gradId = `grad-${label}`, glowId = `glow-${label}`

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '220px', overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {yTicks.map((v, i) => {
          const y = PY + (i / ticks) * (H - PY - 30)
          return (
            <g key={i}>
              <line x1={PX} y1={y} x2={W-12} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PX-8} y={y+4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="var(--fm)">{Math.round(v)}</text>
            </g>
          )
        })}
        {pts.map((p, i) => {
          const show = data.length <= 6 || i === 0 || i === pts.length-1 || i % Math.ceil(data.length/5) === 0
          if (!show) return null
          return <text key={i} x={p.x} y={H-8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="var(--fm)">{new Date(p.date).toLocaleDateString('hr-HR', { month: 'short' })}</text>
        })}
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} />
        {hovered !== null && <line x1={pts[hovered].x} y1={PY} x2={pts[hovered].x} y2={H-30} stroke={color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 4" />}
        <rect x={PX} y={PY} width={W-PX-20} height={H-PY-30} fill="transparent"
          onMouseMove={(e) => {
            const svg = e.currentTarget.ownerSVGElement as SVGSVGElement
            const rect = svg.getBoundingClientRect()
            const px = ((e.clientX - rect.left) / rect.width) * W
            let nearest = 0, bestD = Infinity
            pts.forEach((p, i) => { const d = Math.abs(p.x - px); if (d < bestD) { bestD = d; nearest = i } })
            setHovered(nearest)
          }} />
        {pts.map((p, i) => {
          const isHov = hovered === i, isBest = p.value === best
          return (
            <g key={i}>
              {isHov && <circle cx={p.x} cy={p.y} r="12" fill={color} fillOpacity="0.08" />}
              {isBest && !isHov && <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.3" />}
              <circle cx={p.x} cy={p.y} r={isHov ? 5 : 3.5} fill={isHov ? '#fff' : color} stroke={isHov ? color : isBest ? '#fff' : 'none'} strokeWidth="2" />
            </g>
          )
        })}
      </svg>
      {hovered !== null && (() => {
        const p = pts[hovered], isBest = p.value === best
        const leftPct = (p.x / W) * 100, alignRight = leftPct > 65
        return (
          <div style={{
            position: 'absolute', bottom: `${(1-(p.y/H))*100+2}%`,
            left: alignRight ? 'auto' : `calc(${leftPct}% - 55px)`,
            right: alignRight ? `calc(${100-leftPct}% - 55px)` : 'auto',
            background: '#111111', border: `1px solid ${color}33`,
            borderRadius: '12px', padding: '10px 16px', pointerEvents: 'none', zIndex: 10,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6)`, whiteSpace: 'nowrap',
          }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              {p.value}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginLeft: '2px' }}>kg</span>
              {isBest && <span style={{ fontSize: '0.42rem', color, border: `1px solid ${color}44`, borderRadius: '4px', padding: '2px 5px', marginLeft: '6px', letterSpacing: '0.12em' }}>BEST</span>}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{p.date}</div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── MUSCLE DONUT ─────────────────────────────────────────────────
function MuscleDonut({ data, view }: { data: MuscleEntry[]; view: 'percent' | 'tonnage' }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const getValue = (d: MuscleEntry) => view === 'percent' ? d.sets : d.tonnage
  const total = data.reduce((s, d) => s + getValue(d), 0)

  if (total === 0) return (
    <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: 'var(--fm)' }}>
      <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)' }}>NEMA PODATAKA</div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>Logiraj setove u treningu da se prikaže</div>
    </div>
  )

  const SIZE = 280, C = SIZE / 2, R_OUT = 116, R_IN = 70, GAP = 0.012
  let angle = -Math.PI / 2
  const slices = data.filter(d => getValue(d) > 0).map(d => {
    const pct = getValue(d) / total
    const span = pct * 2 * Math.PI
    const start = angle + GAP / 2, end = angle + span - GAP / 2
    angle += span
    return { ...d, start, end, pct }
  })

  const arcPath = (sa: number, ea: number, rIn: number, rOut: number, lift = 0) => {
    const mid = (sa + ea) / 2
    const ox = Math.cos(mid) * lift, oy = Math.sin(mid) * lift
    const large = ea - sa > Math.PI ? 1 : 0
    const x1 = C + ox + Math.cos(sa) * rOut, y1 = C + oy + Math.sin(sa) * rOut
    const x2 = C + ox + Math.cos(ea) * rOut, y2 = C + oy + Math.sin(ea) * rOut
    const x3 = C + ox + Math.cos(ea) * rIn,  y3 = C + oy + Math.sin(ea) * rIn
    const x4 = C + ox + Math.cos(sa) * rIn,  y4 = C + oy + Math.sin(sa) * rIn
    return `M${x1} ${y1} A${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4}Z`
  }

  const hov = hovered ? slices.find(s => s.group === hovered) : null
  const totalSets = data.reduce((s, d) => s + d.sets, 0)

  return (
    <div className="muscle-donut-grid" style={{ display: 'grid', gridTemplateColumns: `${SIZE}px 1fr`, gap: '28px', alignItems: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            {slices.map(s => (
              <filter key={`f-${s.group}`} id={`gf-${s.group}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            ))}
          </defs>
          <circle cx={C} cy={C} r={R_OUT + 6} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          {slices.map(s => {
            const isHov = s.group === hovered, dim = hovered && !isHov
            return (
              <g key={s.group} onMouseEnter={() => setHovered(s.group)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                {isHov && <path d={arcPath(s.start, s.end, R_IN - 2, R_OUT + 10, 5)} fill={s.color} opacity={0.4} filter={`url(#gf-${s.group})`} />}
                <path d={arcPath(s.start, s.end, R_IN, R_OUT, isHov ? 5 : 0)}
                  fill={s.color} opacity={dim ? 0.22 : isHov ? 1 : 0.9}
                  style={{ transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }} />
              </g>
            )
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center' }}>
          {hov ? (
            <>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2.2rem', fontWeight: 800, color: hov.color, lineHeight: 1, textShadow: `0 0 24px ${hov.color}80` }}>
                {(hov.pct * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', marginTop: '6px', fontFamily: 'var(--fm)' }}>{hov.group}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontFamily: 'var(--fm)' }}>
                {view === 'percent' ? `${hov.sets} serija` : `${(hov.tonnage / 1000).toFixed(1)}t`}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{slices.length}</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginTop: '6px', fontFamily: 'var(--fm)' }}>SKUPINE</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontFamily: 'var(--fm)' }}>{totalSets} serija</div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        {slices.map(s => {
          const isHov = s.group === hovered, dim = hovered && !isHov
          return (
            <div key={s.group} onMouseEnter={() => setHovered(s.group)} onMouseLeave={() => setHovered(null)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '6px 10px 6px 14px', background: isHov ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isHov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '9px', cursor: 'pointer', opacity: dim ? 0.3 : 1, transition: 'all 0.2s' }}>
              <span style={{ position: 'absolute', left: 0, top: '6px', bottom: '6px', width: '3px', borderRadius: '4px', background: s.color, boxShadow: isHov ? `0 0 10px ${s.color}` : 'none' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--fm)' }}>{s.group}</span>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--fm)', whiteSpace: 'nowrap' }}>
                {view === 'percent' ? s.sets : `${(s.tonnage/1000).toFixed(1)}t`} · {(s.pct*100).toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AVATAR PICKER ────────────────────────────────────────────────
function AvatarPicker({ current, onSelect, onClose }: {
  current: string; onSelect: (id: string) => void; onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s' }}
      onClick={onClose}>
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--fm)', fontWeight: 700 }}>ODABERI AVATAR</div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {AVATARS.map(av => (
            <button key={av.id} onClick={() => { onSelect(av.id); onClose() }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 8px', background: current === av.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${current === av.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', color: current === av.id ? '#fff' : 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = current === av.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = current === av.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              <AvatarSvg iconId={av.id} size={36} />
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.1em', fontFamily: 'var(--fm)' }}>{av.label}</div>
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
  const [activeBlockName, setActiveBlockName] = useState<string | null>(null)
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

      const compMap: Record<string, { total: number; done: number; pct: number }> = {}
      for (const w of (workoutRows ?? [])) {
        if (!w.athlete_id) continue
        if (!compMap[w.athlete_id]) compMap[w.athlete_id] = { total: 0, done: 0, pct: 0 }
        compMap[w.athlete_id].total++
        if (w.completed) compMap[w.athlete_id].done++
      }
      for (const k of Object.keys(compMap)) {
        const c = compMap[k]; c.pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0
      }
      setCompletions(compMap)
      setProfile(prof as Profile)
      setAdminComps(((compsData ?? []) as unknown as AdminComp[]).sort((a, b) => b.competition.date.localeCompare(a.competition.date)))
      setPrLogs((prs ?? []) as PrLog[])
      setLeaderboard((lb ?? []) as LeaderboardEntry[])
      if (prof) setOrmVals({ squat: String(prof.current_squat_1rm ?? ''), bench: String(prof.current_bench_1rm ?? ''), deadlift: String(prof.current_deadlift_1rm ?? ''), body_weight: String(prof.body_weight ?? ''), sex: (prof.sex ?? 'male') as 'male'|'female' })

      try {
        const { data: activeBlock } = await supabase.from('blocks').select('id, name').eq('athlete_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (activeBlock?.name) setActiveBlockName(activeBlock.name)

        const { data: setLogs } = await supabase.from('set_logs').select('workout_exercise_id, reps, weight_kg').eq('athlete_id', user.id).eq('completed', true)
        if (!setLogs || setLogs.length === 0) { setLoading(false); return }

        const weIds = [...new Set(setLogs.map((s: any) => s.workout_exercise_id as string))]
        const { data: weRows } = await supabase.from('workout_exercises').select('id, ex:exercises(category)').in('id', weIds)
        if (!weRows || weRows.length === 0) { setLoading(false); return }

        let filteredWeIds = new Set(weIds)
        if (activeBlock) {
          const { data: wks } = await supabase.from('weeks').select('id').eq('block_id', activeBlock.id)
          const wkIds = (wks ?? []).map((w: any) => w.id)
          if (wkIds.length > 0) {
            const { data: wos } = await supabase.from('workouts').select('id').in('week_id', wkIds)
            const woIds = (wos ?? []).map((w: any) => w.id)
            if (woIds.length > 0) {
              const { data: blockWes } = await supabase.from('workout_exercises').select('id').in('workout_id', woIds)
              if (blockWes && blockWes.length > 0) filteredWeIds = new Set(blockWes.map((w: any) => w.id as string))
            }
          }
        }

        const weGroupMap: Record<string, string> = {}
        for (const we of weRows) {
          const cat = (we.ex as any)?.category as string
          if (!cat) continue
          const grp = DB_CAT_TO_GROUP[cat]
          if (grp) weGroupMap[we.id] = grp
        }

        const groupMap: Record<string, { sets: number; tonnage: number }> = {}
        for (const sl of setLogs) {
          if (!filteredWeIds.has(sl.workout_exercise_id)) continue
          const grp = weGroupMap[sl.workout_exercise_id]
          if (!grp) continue
          if (!groupMap[grp]) groupMap[grp] = { sets: 0, tonnage: 0 }
          groupMap[grp].sets++
          groupMap[grp].tonnage += (parseFloat(String(sl.reps)) || 0) * (Number(sl.weight_kg) || 0)
        }
        const result = Object.entries(groupMap).map(([group, v]) => ({ group, ...v, color: GROUP_COLORS[group] ?? '#888' }))
        if (result.length > 0) setMuscleData(result)
      } catch (e) { console.error('muscle chart error:', e) }

      setLoading(false)
    }
    init()
  }, [])

  const saveAvatar = async (iconId: string) => {
    if (!userId) return
    await supabase.from('profiles').update({ avatar_icon: iconId }).eq('id', userId)
    setProfile(p => p ? { ...p, avatar_icon: iconId } : p)
    setLeaderboard(lb => lb.map(e => e.id === userId ? { ...e, avatar_icon: iconId } : e))
  }

  const saveORMs = async () => {
    if (!userId) return
    const data = {
      current_squat_1rm:    ormVals.squat       ? Number(ormVals.squat)       : null,
      current_bench_1rm:    ormVals.bench       ? Number(ormVals.bench)       : null,
      current_deadlift_1rm: ormVals.deadlift    ? Number(ormVals.deadlift)    : null,
      body_weight:          ormVals.body_weight ? Number(ormVals.body_weight) : null,
      sex: ormVals.sex,
    }
    await supabase.from('profiles').update(data).eq('id', userId)
    setProfile(p => p ? { ...p, ...data } : p)
    setLeaderboard(lb => lb.map(e => e.id === userId ? { ...e, body_weight: data.body_weight, sex: data.sex } : e))
    setEditingORM(false)
  }

  const addPrLog = async (lift: PrLog['lift'], reps: number, weight: number, date: string) => {
    if (!userId) return
    const { data: row } = await supabase.from('pr_logs').insert({ athlete_id: userId, lift, reps, weight_kg: weight, date, source: 'manual' }).select('*').single()
    if (row) setPrLogs(p => [row as PrLog, ...p])
  }

  const deletePrLog = async (id: string) => {
    await supabase.from('pr_logs').delete().eq('id', id)
    setPrLogs(p => p.filter(x => x.id !== id))
  }

  const bestByReps = (lift: 'squat'|'bench'|'deadlift', reps: number): PrLog | null => {
    const filtered = prLogs.filter(p => p.lift === lift && p.reps === reps)
    if (!filtered.length) return null
    return filtered.reduce((best, cur) => cur.weight_kg > best.weight_kg ? cur : best)
  }

  const lbSorted = useMemo(() =>
    [...leaderboard]
      .filter(e => !isCoach || assignedLifterIds.includes(e.id))
      .map(e => { const c = completions[e.id] ?? { total: 0, done: 0, pct: 0 }; return { ...e, compTotal: c.total, compDone: c.done, compPct: c.pct } })
      .filter(e => e.compTotal > 0)
      .sort((a, b) => b.compPct - a.compPct || b.compDone - a.compDone)
  , [leaderboard, isCoach, assignedLifterIds, completions])

  if (loading) return (
    <div style={{ background: '#090909', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.25em' }}>UČITAVANJE...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!profile) return null

  const currentAvatar = profile.avatar_icon ?? 'barbell'
  const trainingTotal = (profile.current_squat_1rm ?? 0) + (profile.current_bench_1rm ?? 0) + (profile.current_deadlift_1rm ?? 0)
  const glPoints = calcGL(trainingTotal, profile.body_weight ?? 0, profile.sex)
  const liftColor = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }

  const TILES = [
    { label: 'SQ',  val: profile.current_squat_1rm,    color: '#6b8cff', glow: 'rgba(107,140,255,0.3)' },
    { label: 'BP',  val: profile.current_bench_1rm,    color: '#f59e0b', glow: 'rgba(245,158,11,0.3)'  },
    { label: 'DL',  val: profile.current_deadlift_1rm, color: '#22c55e', glow: 'rgba(34,197,94,0.3)'   },
    { label: 'TOT', val: trainingTotal || null,         color: '#ffffff', glow: 'rgba(255,255,255,0.2)' },
  ]

  return (
    <div style={{ background: '#090909', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* ── BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.3, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)' }} />
      <div style={{ position: 'fixed', top: '-25vh', left: '-15vw', width: '80vw', height: '80vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.03) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      <div style={{ position: 'fixed', bottom: '-20vh', right: '-10vw', width: '65vw', height: '65vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 60% 60%, rgba(16,185,129,0.09) 0%, rgba(5,150,105,0.04) 45%, transparent 70%)', filter: 'blur(80px)' }} />
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, height: '1px', zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent 0%, rgba(239,53,53,0.35) 30%, rgba(239,53,53,0.45) 50%, rgba(239,53,53,0.35) 70%, transparent 100%)', boxShadow: '0 0 40px 8px rgba(239,53,53,0.08)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      <AppNav
        athleteName={profile.full_name ?? ''}
        isAdmin={profile.role === 'admin' || profile.role === 'trener'}
        role={profile.role === 'trener' ? 'trener' : profile.role === 'admin' ? 'admin' : undefined}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/') }}
        avatarIcon={profile.avatar_icon ?? 'barbell'}
        userId={userId ?? undefined}
      />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(80px,10vw,96px) clamp(16px,4vw,32px) 80px', position: 'relative', zIndex: 1 }}>

        {/* ── PROFILE HEADER CARD ── */}
        <div style={{ ...glass, padding: 'clamp(20px,4vw,32px)', marginBottom: '24px', animation: 'fadeUp 0.4s ease' }}>
          <div className="prof-header-inner" style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>

            {/* Avatar + identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* glow ring */}
                <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.12), rgba(255,255,255,0.04), transparent 70%)', filter: 'blur(12px)', pointerEvents: 'none' }} />
                <button onClick={() => setShowAvatarPicker(true)}
                  style={{ position: 'relative', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none' }}>
                  <AvatarSvg iconId={currentAvatar} size={46} color="rgba(255,255,255,0.92)" />
                </button>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '26px', height: '26px', borderRadius: '50%', background: '#ef3535', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(239,53,53,0.5)' }}
                  onClick={() => setShowAvatarPicker(true)}>
                  <Pencil size={11} color="#fff" />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{profile.role.toUpperCase()}</span>
                  {profile.weight_class && <><span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }} /><span>{profile.weight_class}</span></>}
                </div>
                <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 800, lineHeight: 1.0, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                  {profile.full_name}
                </h1>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.04em' }}>
                  {profile.sex === 'male' ? 'Muški' : 'Ženski'}
                  {profile.body_weight ? ` · ${profile.body_weight} kg` : ''}
                  {glPoints > 0 ? ` · GL ${glPoints} pts` : ''}
                </div>
              </div>
            </div>

            {/* 1RM tiles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div className="prof-orm-tiles" style={{ display: 'flex', gap: '8px' }}>
                {TILES.map((t, i) => (
                  <div key={t.label}
                    style={{ background: t.val ? `linear-gradient(160deg, ${t.color}12 0%, rgba(255,255,255,0.02) 100%)` : 'rgba(255,255,255,0.03)', border: `1px solid ${t.val ? t.color + '28' : 'rgba(255,255,255,0.07)'}`, borderBottom: `2px solid ${t.val ? t.color + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: 'clamp(10px,2vw,16px) clamp(14px,2.5vw,22px)', textAlign: 'center', minWidth: 'clamp(60px,8vw,90px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'transform 0.25s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 800, lineHeight: 1, color: t.val ? t.color : 'rgba(255,255,255,0.15)' }}>
                      {t.val ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', marginTop: '6px' }}>{t.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setEditingORM(v => !v)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: editingORM ? 'rgba(239,53,53,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editingORM ? 'rgba(239,53,53,0.4)' : 'rgba(255,255,255,0.1)'}`, color: editingORM ? '#ef3535' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { if (!editingORM) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' } }}
                onMouseLeave={e => { if (!editingORM) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' } }}>
                <Pencil size={14} />
              </button>
            </div>
          </div>

          {/* Edit panel */}
          {editingORM && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.07)', animation: 'fadeUp 0.2s ease' }}>
              <div className="prof-orm-edit" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignItems: 'flex-end' }}>
                {[
                  { k: 'squat',    label: 'SQUAT 1RM',    color: '#6b8cff' },
                  { k: 'bench',    label: 'BENCH 1RM',    color: '#f59e0b' },
                  { k: 'deadlift', label: 'DEADLIFT 1RM', color: '#22c55e' },
                ].map(f => (
                  <div key={f.k}>
                    <div style={{ fontSize: '0.5rem', color: f.color, letterSpacing: '0.2em', marginBottom: '6px', fontFamily: 'var(--fm)', fontWeight: 700 }}>{f.label}</div>
                    <input type="number" step="0.5" value={(ormVals as any)[f.k]}
                      onChange={e => setOrmVals(o => ({ ...o, [f.k]: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${f.color}44`, color: '#e0e0e0', padding: '10px 12px', borderRadius: '10px', outline: 'none', fontSize: '1rem', fontFamily: 'var(--fd)', fontWeight: 700, boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = f.color}
                      onBlur={e => e.target.style.borderColor = `${f.color}44`} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginBottom: '6px', fontFamily: 'var(--fm)', fontWeight: 700 }}>SPOL</div>
                  <div style={{ display: 'flex', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px', gap: '3px' }}>
                    {(['male', 'female'] as const).map(s => (
                      <button key={s} onClick={() => setOrmVals(o => ({ ...o, sex: s }))}
                        style={{ flex: 1, padding: '7px', borderRadius: '7px', background: ormVals.sex === s ? '#fff' : 'transparent', color: ormVals.sex === s ? '#000' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--fm)', fontWeight: 600, transition: 'all 0.15s' }}>
                        {s === 'male' ? 'M' : 'Ž'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginBottom: '6px', fontFamily: 'var(--fm)', fontWeight: 700 }}>TJELESNA (kg)</div>
                  <input type="number" step="0.1" value={ormVals.body_weight}
                    onChange={e => setOrmVals(o => ({ ...o, body_weight: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#e0e0e0', padding: '10px 12px', borderRadius: '10px', outline: 'none', fontSize: '1rem', fontFamily: 'var(--fd)', fontWeight: 700, boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => setEditingORM(false)}
                  style={{ padding: '9px 20px', borderRadius: '20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
                  <X size={13} /> Odustani
                </button>
                <button onClick={saveORMs}
                  style={{ padding: '9px 24px', borderRadius: '20px', background: '#fff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 24px rgba(255,255,255,0.15)', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.88)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <Check size={13} /> Spremi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── PILL TABS ── */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: '24px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content', maxWidth: '100%', overflowX: 'auto', animation: 'fadeUp 0.45s ease' }}>
          {([['progress', 'NAPREDAK'], ['prs', 'OSOBNI REKORDI'], ['leaderboard', 'LEADERBOARD']] as [string, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              style={{ padding: '9px 22px', background: activeTab === tab ? '#fff' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.12em', color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: activeTab === tab ? '0 2px 12px rgba(0,0,0,0.3)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ TAB: NAPREDAK ══════════════════════════════════════════ */}
        {activeTab === 'progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeUp 0.3s ease' }}>

            {/* PR Progress Chart */}
            <div style={{ ...glass, padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>PR NAPREDAK</h3>
                <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px' }}>
                  {([['squat','SQUAT','#6b8cff'],['bench','BENCH','#f59e0b'],['deadlift','DEADLIFT','#22c55e']] as const).map(([k, label, color]) => (
                    <button key={k} onClick={() => setProgressLift(k)}
                      style={{ padding: '6px 16px', background: progressLift === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '16px', color: progressLift === k ? color : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--fm)', transition: 'all 0.2s', textShadow: progressLift === k ? `0 0 12px ${color}90` : 'none' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[1,2,3,4,5,6,8,10,12].map(r => {
                  const hasData = prLogs.some(p => p.lift === progressLift && p.reps === r)
                  const active = progressReps === r
                  return (
                    <button key={r} onClick={() => setProgressReps(r)} disabled={!hasData}
                      style={{ padding: '5px 11px', background: active ? '#fff' : hasData ? 'rgba(255,255,255,0.06)' : 'transparent', border: `1px solid ${active ? '#fff' : hasData ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, color: active ? '#000' : hasData ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', borderRadius: '8px', cursor: hasData ? 'pointer' : 'default', fontSize: '0.65rem', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', position: 'relative' }}>
                      {r}RM
                      {hasData && !active && <span style={{ position: 'absolute', top: '-4px', right: '-3px', width: '6px', height: '6px', borderRadius: '50%', background: liftColor[progressLift] }} />}
                    </button>
                  )
                })}
              </div>
              {(() => {
                const color = liftColor[progressLift]
                const chartData = [...prLogs].filter(p => p.lift === progressLift && p.reps === progressReps).reverse().map(p => ({ date: p.date, value: p.weight_kg }))
                return (
                  <div key={`${progressLift}-${progressReps}`} style={{ animation: 'chartIn 0.3s cubic-bezier(0.22,1,0.36,1) both' }}>
                    <ProgressChart data={chartData} color={color} label={`${progressLift}-${progressReps}rm`} />
                  </div>
                )
              })()}
            </div>

            {/* Muscle Group Donut */}
            <div style={{ ...glass, padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
                    {activeBlockName ? activeBlockName.toUpperCase() : 'AKTIVNI BLOK'}
                  </div>
                  <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>RASPODJELA MIŠIĆNIH SKUPINA</h3>
                </div>
                <div style={{ display: 'flex', gap: '3px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px' }}>
                  {(['percent', 'tonnage'] as const).map(v => (
                    <button key={v} onClick={() => setMuscleView(v)}
                      style={{ padding: '7px 18px', background: muscleView === v ? '#fff' : 'transparent', border: 'none', borderRadius: '16px', color: muscleView === v ? '#000' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}>
                      {v === 'percent' ? '% SERIJA' : 'TONAŽA'}
                    </button>
                  ))}
                </div>
              </div>
              <MuscleDonut data={muscleData} view={muscleView} />
            </div>

            {/* Competition History */}
            <div style={{ ...glass, padding: '24px 28px' }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px' }}>NATJECANJA</h3>
              {adminComps.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                  Admin još nije ulogirao tvoje natjecateljske rezultate.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--fm)' }}>
                    <thead>
                      <tr>
                        {['NATJECANJE', 'DATUM', 'SQ', 'BP', 'DL', 'TOTAL', 'MJ.', 'BILJEŠKA'].map(h => (
                          <th key={h} className={h === 'BILJEŠKA' ? 'comp-table-hide' : ''} style={{ padding: '8px 14px', fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.22em', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminComps.map((c, i) => (
                        <tr key={i} style={{ borderBottom: i < adminComps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                          <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: '#e0e0e0', fontWeight: 500 }}>{c.competition.name}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(c.competition.date).toLocaleDateString('hr-HR')}</td>
                          {[c.result_squat, c.result_bench, c.result_deadlift].map((v, j) => (
                            <td key={j} style={{ padding: '12px 14px', fontSize: '0.88rem', color: ['#6b8cff','#f59e0b','#22c55e'][j], fontWeight: 700 }}>{v ?? '—'}</td>
                          ))}
                          <td style={{ padding: '12px 14px', fontSize: '0.95rem', color: '#fff', fontWeight: 800, fontFamily: 'var(--fd)' }}>{c.result_total ?? '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: c.result_place === 1 ? '#facc15' : 'rgba(255,255,255,0.5)', fontWeight: c.result_place ? 700 : 400 }}>
                            {c.result_place ? `${c.result_place}.` : '—'}
                          </td>
                          <td className="comp-table-hide" style={{ padding: '12px 14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{c.result_notes ?? '—'}</td>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeUp 0.3s ease' }}>

            {/* Selectors row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px' }}>
                {([['squat','SQUAT','#6b8cff'],['bench','BENCH','#f59e0b'],['deadlift','DEADLIFT','#22c55e']] as const).map(([k, label, color]) => (
                  <button key={k} onClick={() => setPrLift(k)}
                    style={{ padding: '7px 18px', background: prLift === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '16px', color: prLift === k ? color : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--fm)', transition: 'all 0.2s', textShadow: prLift === k ? `0 0 12px ${color}90` : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {[1,2,3,4,5,6,8,10,12].map(r => {
                  const best = bestByReps(prLift, r)
                  const active = prReps === r
                  return (
                    <button key={r} onClick={() => setPrReps(r)}
                      style={{ padding: '6px 12px', background: active ? '#fff' : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? '#fff' : 'rgba(255,255,255,0.1)'}`, color: active ? '#000' : 'rgba(255,255,255,0.6)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', position: 'relative' }}>
                      {r}RM
                      {best && !active && <span style={{ position: 'absolute', top: '-4px', right: '-3px', width: '6px', height: '6px', borderRadius: '50%', background: liftColor[prLift] }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Best lift display */}
            <div style={{ ...glass, padding: '32px 36px', textAlign: 'center' }}>
              {(() => {
                const best = bestByReps(prLift, prReps)
                const color = liftColor[prLift]
                return best ? (
                  <>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(4rem,12vw,6rem)', fontWeight: 800, lineHeight: 1, color, textShadow: `0 0 60px ${color}50`, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                      {best.weight_kg}
                      <span style={{ fontSize: 'clamp(1.5rem,4vw,2rem)', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>kg</span>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      {new Date(best.date).toLocaleDateString('hr-HR')} · {best.source}
                      {best.notes && ` · ${best.notes}`}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.88rem', padding: '20px 0' }}>
                    Nema ulogiranog {prReps}RM za {prLift}
                  </div>
                )
              })()}
            </div>

            <AddPrForm prLift={prLift} prReps={prReps} onAdd={addPrLog} />

            {/* PR log list */}
            <div style={{ ...glass, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3em', fontWeight: 700 }}>SVE ULOGIRANO</div>
              {prLogs.filter(p => p.lift === prLift).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>Nema ulogiranih liftova za {prLift}.</div>
              ) : prLogs.filter(p => p.lift === prLift).map((p, i, arr) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', width: '30px', flexShrink: 0 }}>{p.reps}RM</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.95rem' }}>{p.weight_kg} kg</span>
                    {p.notes && <span style={{ marginLeft: '10px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{p.notes}</span>}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(p.date).toLocaleDateString('hr-HR')}</div>
                  <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', padding: '2px 8px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px' }}>{p.source}</div>
                  <button onClick={() => deletePrLog(p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '2px', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: LEADERBOARD ══════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)', marginBottom: '20px', fontWeight: 700 }}>
              POSTOTAK ZAVRŠENIH TRENINGA · SORTIRANO PO KONZISTENTNOSTI
            </div>

            {lbSorted.length === 0 ? (
              <div style={{ ...glass, padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>Nema dovoljno podataka za leaderboard.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lbSorted.map((e, i) => {
                  const isMe = e.id === userId
                  const medal = i === 0 ? '#facc15' : i === 1 ? '#d1d5db' : i === 2 ? '#cd7f32' : null
                  const pctColor = e.compPct >= 90 ? '#22c55e' : e.compPct >= 70 ? '#f59e0b' : e.compPct >= 50 ? '#6b8cff' : 'rgba(255,255,255,0.3)'
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: isMe ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isMe ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', transition: 'all 0.15s', boxShadow: isMe ? '0 0 24px rgba(255,255,255,0.05)' : 'none', animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
                      <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                        {medal
                          ? <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 800, color: medal, textShadow: `0 0 12px ${medal}60` }}>{i + 1}</div>
                          : <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fd)', fontWeight: 700 }}>{i + 1}</div>
                        }
                      </div>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AvatarSvg iconId={e.avatar_icon ?? 'barbell'} size={22} color="rgba(255,255,255,0.75)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isMe ? '#fff' : '#e0e0e0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {e.full_name}
                          {isMe && <span style={{ fontSize: '0.48rem', letterSpacing: '0.18em', color: '#ef3535', border: '1px solid rgba(239,53,53,0.35)', padding: '2px 7px', borderRadius: '5px' }}>TI</span>}
                        </div>
                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${e.compPct}%`, background: pctColor, borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 8px ${pctColor}60` }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexShrink: 0, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: medal ?? pctColor, lineHeight: 1 }}>{e.compPct}%</div>
                          <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: '3px' }}>ZAVRŠENO</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--fm)' }}>{e.compDone}/{e.compTotal}</div>
                          <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: '3px' }}>TRENINGA</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
              Rangirano po postotku završenih treninga. U slučaju jednakog postotka, više apsolutnih treninga dolazi više.
            </div>
          </div>
        )}
      </div>

      {showAvatarPicker && <AvatarPicker current={currentAvatar} onSelect={saveAvatar} onClose={() => setShowAvatarPicker(false)} />}

      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes slideUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes spin      { to { transform:rotate(360deg) } }
        @keyframes chartIn   { from { opacity:0; transform:translateX(10px) } to { opacity:1; transform:none } }
        table { font-family: var(--fm); }
        td, th { vertical-align: middle; }
        input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { opacity: 0.5; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        @media (max-width: 640px) {
          .muscle-donut-grid { grid-template-columns: 1fr !important; }
          .muscle-donut-grid > div:first-child { margin: 0 auto; }
          .prof-orm-tiles { flex-wrap: wrap !important; }
          .prof-orm-tiles > div { min-width: 60px !important; flex: 1; }
          .prof-orm-edit { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .prof-header-inner { flex-direction: column !important; }
          .comp-table-hide { display: none !important; }
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
  const color = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[prLift]
  const liftLabel = { squat: 'SQUAT', bench: 'BENCH', deadlift: 'DEADLIFT' }[prLift]

  const submit = async () => {
    if (!weight || !date) return
    setSaving(true)
    await onAdd(prLift, prReps, Number(weight), date)
    setWeight('')
    setSaving(false)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px' }}>
      <div style={{ fontSize: '0.52rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: '14px' }}>
        DODAJ PR · {liftLabel} · {prReps}RM
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <input type="number" step="0.5" value={weight}
          onChange={e => setWeight(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Težina (kg)"
          style={{ flex: 2, minWidth: '120px', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.1)`, color: '#e0e0e0', padding: '12px 16px', borderRadius: '12px', outline: 'none', fontSize: '0.95rem', fontFamily: 'var(--fm)', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        <input type="date" value={date}
          onChange={e => setDate(e.target.value)}
          style={{ flex: 1, minWidth: '130px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '12px 16px', borderRadius: '12px', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--fm)', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        <button onClick={submit} disabled={saving || !weight}
          style={{ padding: '12px 24px', background: weight ? '#fff' : 'rgba(255,255,255,0.08)', border: 'none', color: weight ? '#000' : 'rgba(255,255,255,0.3)', borderRadius: '12px', cursor: weight ? 'pointer' : 'not-allowed', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.18em', fontFamily: 'var(--fm)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
          LOGIRAJ {prReps}RM
        </button>
      </div>
    </div>
  )
}
