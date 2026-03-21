'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ChevronDown, Check, Loader2, LogOut, Home, Edit3, Trophy, TrendingUp, Award, X } from 'lucide-react'

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
type PrLog = {
  id: string; lift: 'squat' | 'bench' | 'deadlift' | 'other'
  reps: number; weight_kg: number; date: string; source: string; notes: string | null
}
type LeaderboardEntry = {
  id: string; full_name: string; avatar_icon: string | null; weight_class: string | null
  body_weight: number | null        // profile body weight
  sex: string | null                // 'male' | 'female'
  training_total: number | null; latest_comp_total: number | null
  latest_comp_date: string | null; latest_body_weight: number | null  // from competition
  current_squat_1rm: number | null; current_bench_1rm: number | null; current_deadlift_1rm: number | null
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

// ─── AVATAR ICONS ─────────────────────────────────────────────────
const AVATARS: { id: string; label: string; svg: string }[] = [
  { id: 'barbell', label: 'Šipka',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="18" width="36" height="4" rx="2" fill="currentColor"/><rect x="6" y="12" width="4" height="16" rx="1.5" fill="currentColor" opacity=".8"/><rect x="30" y="12" width="4" height="16" rx="1.5" fill="currentColor" opacity=".8"/><rect x="3" y="15" width="4" height="10" rx="1" fill="currentColor"/><rect x="33" y="15" width="4" height="10" rx="1" fill="currentColor"/></svg>` },
  { id: 'squat', label: 'Čučanj',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="3" fill="currentColor"/><path d="M14 12h12M20 12v10l-5 8M20 22l5 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="4" y="19" width="32" height="3" rx="1.5" fill="currentColor" opacity=".4"/></svg>` },
  { id: 'deadlift', label: 'Mrtvo',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="6" r="3" fill="currentColor"/><path d="M20 9v12M14 28l6-7 6 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="29" width="32" height="4" rx="2" fill="currentColor" opacity=".5"/><rect x="4" y="26" width="6" height="10" rx="1.5" fill="currentColor" opacity=".7"/><rect x="30" y="26" width="6" height="10" rx="1.5" fill="currentColor" opacity=".7"/></svg>` },
  { id: 'bench', label: 'Klupa',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="20" width="28" height="5" rx="2.5" fill="currentColor" opacity=".7"/><rect x="8" y="25" width="4" height="10" rx="2" fill="currentColor" opacity=".6"/><rect x="28" y="25" width="4" height="10" rx="2" fill="currentColor" opacity=".6"/><rect x="4" y="14" width="32" height="4" rx="2" fill="currentColor" opacity=".3"/><circle cx="20" cy="8" r="3" fill="currentColor"/></svg>` },
  { id: 'trophy', label: 'Trofej',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6h16v14a8 8 0 0 1-16 0V6Z" fill="currentColor" opacity=".8"/><path d="M12 10H6a4 4 0 0 0 4 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M28 10h6a4 4 0 0 1-4 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="16" y="28" width="8" height="4" rx="1" fill="currentColor" opacity=".6"/><rect x="12" y="32" width="16" height="3" rx="1.5" fill="currentColor" opacity=".5"/></svg>` },
  { id: 'flame', label: 'Plamen',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4C20 4 28 14 28 22a8 8 0 0 1-16 0c0-4 2-8 4-10-1 4 2 6 2 6s2-8 2-14Z" fill="currentColor" opacity=".9"/><path d="M20 26a3 3 0 0 0 3-3c0-2-3-5-3-5s-3 3-3 5a3 3 0 0 0 3 3Z" fill="white" opacity=".4"/></svg>` },
  { id: 'lightning', label: 'Munja',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 4L10 22h12l-4 14 18-20H24L22 4Z" fill="currentColor" opacity=".9"/></svg>` },
  { id: 'shield', label: 'Štit',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4L6 10v12c0 8 6 13 14 15 8-2 14-7 14-15V10L20 4Z" fill="currentColor" opacity=".8"/><path d="M13 20l5 5 9-9" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg>` },
  { id: 'mountain', label: 'Planina',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 34L14 14l6 8 4-6 12 18H4Z" fill="currentColor" opacity=".8"/><path d="M24 16l-2 3" stroke="white" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>` },
  { id: 'star', label: 'Zvijezda',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4l4.9 10 11 1.6-8 7.8 1.9 11L20 29.4 10.2 34.4l1.9-11-8-7.8 11-1.6L20 4Z" fill="currentColor" opacity=".9"/></svg>` },
  { id: 'target', label: 'Meta',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="2.5" opacity=".4"/><circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="2.5" opacity=".65"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>` },
  { id: 'crown', label: 'Kruna',
    svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 28h28M6 28L8 14l8 8 4-10 4 10 8-8 2 14" fill="currentColor" opacity=".7"/><path d="M6 28h28M8 14l8 8 4-10 4 10 8-8L30 28H10L8 14Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><circle cx="8" cy="14" r="2.5" fill="currentColor"/><circle cx="20" cy="10" r="2.5" fill="currentColor"/><circle cx="32" cy="14" r="2.5" fill="currentColor"/><rect x="8" y="28" width="24" height="5" rx="1" fill="currentColor" opacity=".5"/></svg>` },
]

function AvatarSvg({ iconId, size = 32, color = 'currentColor' }: { iconId: string; size?: number; color?: string }) {
  const icon = AVATARS.find(a => a.id === iconId) ?? AVATARS[0]
  return (
    <div style={{ width: size, height: size, color, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: icon.svg }} />
  )
}

// ─── MINI LINE CHART ───────────────────────────────────────────────
function LineChart({ data, color, label }: {
  data: { date: string; value: number }[]; color: string; label: string
}) {
  if (data.length < 2) return (
    <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.72rem', fontFamily: 'var(--fm)' }}>
      Nedovoljno podataka
    </div>
  )

  const vals  = data.map(d => d.value)
  const min   = Math.min(...vals)
  const max   = Math.max(...vals)
  const range = max - min || 1
  const W = 280, H = 80, PAD = 8

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + ((max - d.value) / range) * (H - PAD * 2)
    return { x, y, ...d }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillD = `${pathD} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '80px', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill */}
      <path d={fillD} fill={`url(#grad-${label})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <title>{p.date}: {p.value}kg</title>
        </g>
      ))}
    </svg>
  )
}

// ─── FULL CHART (competition progress) ────────────────────────────
function CompChart({ compLifts, lift, color }: {
  compLifts: CompLift[]; lift: 'squat_kg' | 'bench_kg' | 'deadlift_kg' | 'total_kg'; color: string
}) {
  const data = compLifts
    .filter(c => c[lift] != null)
    .sort((a, b) => a.comp_date.localeCompare(b.comp_date))
    .map(c => ({ date: c.comp_date, value: c[lift] as number, label: c.comp_name }))

  if (data.length === 0) return (
    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.72rem' }}>Nema comp podataka</div>
  )

  const vals  = data.map(d => d.value)
  const min   = Math.floor(Math.min(...vals) / 10) * 10 - 10
  const max   = Math.ceil(Math.max(...vals) / 10)  * 10 + 10
  const range = max - min
  const W = 500, H = 120, PX = 40, PY = 12

  const pts = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2),
    y: PY + ((max - d.value) / range) * (H - PY * 2),
    ...d,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fillD = pts.length > 1
    ? `${pathD} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
    : ''

  // Y axis ticks
  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => max - (range / ticks) * i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`cg-${lift}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map((v, i) => {
        const y = PY + (i / ticks) * (H - PY * 2)
        return (
          <g key={i}>
            <line x1={PX} y1={y} x2={W - PX / 2} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PX - 4} y={y + 4} textAnchor="end" fill="#555" fontSize="9">{Math.round(v)}</text>
          </g>
        )
      })}
      {/* Fill + line */}
      {fillD && <path d={fillD} fill={`url(#cg-${lift})`} />}
      {pts.length > 1 && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {/* Points + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} />
          <circle cx={p.x} cy={p.y} r="7" fill={color} fillOpacity="0.15" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill={color} fontSize="10" fontWeight="700">{p.value}kg</text>
          <text x={p.x} y={H - 2} textAnchor="middle" fill="#555" fontSize="8">{p.date.slice(0, 7)}</text>
        </g>
      ))}
    </svg>
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

// ─── ADD COMP LIFT MODAL ──────────────────────────────────────────
function AddCompLiftModal({ onSave, onClose }: {
  onSave: (data: Omit<CompLift, 'id'>) => void; onClose: () => void
}) {
  const [form, setForm] = useState({ comp_name: '', comp_date: '', squat_kg: '', bench_kg: '', deadlift_kg: '', total_kg: '', body_weight: '', weight_class: '', place: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const num = (v: string) => v ? Number(v) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.15s' }}
      onClick={onClose}>
      <div style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: '#888', marginBottom: '20px', fontFamily: 'var(--fm)' }}>DODAJ COMP REZULTAT</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { k: 'comp_name',   label: 'Naziv natjecanja', span: true },
            { k: 'comp_date',   label: 'Datum', type: 'date' },
            { k: 'weight_class',label: 'Kategorija (npr. M-93kg)' },
            { k: 'body_weight', label: 'Tjelesna masa (kg)', type: 'number' },
            { k: 'squat_kg',    label: 'Čučanj (kg)', type: 'number' },
            { k: 'bench_kg',    label: 'Bench Press (kg)', type: 'number' },
            { k: 'deadlift_kg', label: 'Mrtvo dizanje (kg)', type: 'number' },
            { k: 'total_kg',    label: 'Total (kg)', type: 'number' },
            { k: 'place',       label: 'Plasman', type: 'number' },
          ].map(f => (
            <div key={f.k} style={{ gridColumn: f.span ? '1 / -1' : 'auto' }}>
              <div style={{ fontSize: '0.48rem', color: '#777', letterSpacing: '0.2em', marginBottom: '5px', fontFamily: 'var(--fm)' }}>{f.label.toUpperCase()}</div>
              <input type={f.type ?? 'text'} value={(form as any)[f.k]} onChange={e => set(f.k, e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '9px 12px', fontSize: '0.88rem', borderRadius: '6px', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>ODUSTANI</button>
          <button onClick={() => {
            if (!form.comp_name || !form.comp_date) return
            onSave({ comp_name: form.comp_name, comp_date: form.comp_date, squat_kg: num(form.squat_kg), bench_kg: num(form.bench_kg), deadlift_kg: num(form.deadlift_kg), total_kg: num(form.total_kg) || (num(form.squat_kg)! + num(form.bench_kg)! + num(form.deadlift_kg)!), body_weight: num(form.body_weight), weight_class: form.weight_class || null, place: num(form.place) })
            onClose()
          }} style={{ flex: 1, padding: '11px', background: '#fff', border: 'none', color: '#000', borderRadius: '7px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>SPREMI</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PROFILE PAGE ────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [compLifts, setCompLifts]     = useState<CompLift[]>([])
  const [prLogs, setPrLogs]           = useState<PrLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<'progress' | 'prs' | 'leaderboard'>('progress')
  const [chartLift, setChartLift]     = useState<'squat_kg'|'bench_kg'|'deadlift_kg'|'total_kg'>('total_kg')
  const [prLift, setPrLift]           = useState<'squat'|'bench'|'deadlift'>('squat')
  const [prReps, setPrReps]           = useState(1)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showAddComp, setShowAddComp] = useState(false)
  const [editingORM, setEditingORM]   = useState(false)
  const [ormVals, setOrmVals]         = useState({ squat: '', bench: '', deadlift: '', body_weight: '', sex: 'male' as 'male'|'female' })
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: comps }, { data: prs }, { data: lb }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('competition_lifts').select('*').eq('athlete_id', user.id).order('comp_date'),
        supabase.from('pr_logs').select('*').eq('athlete_id', user.id).order('date', { ascending: false }),
        supabase.from('leaderboard_view').select('*'),
      ])

      setProfile(prof as Profile)
      setCompLifts((comps ?? []) as CompLift[])
      setPrLogs((prs ?? []) as PrLog[])
      setLeaderboard((lb ?? []) as LeaderboardEntry[])
      if (prof) setOrmVals({ squat: String(prof.current_squat_1rm ?? ''), bench: String(prof.current_bench_1rm ?? ''), deadlift: String(prof.current_deadlift_1rm ?? ''), body_weight: String(prof.body_weight ?? ''), sex: (prof.sex ?? 'male') as 'male'|'female' })
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
      current_squat_1rm:    ormVals.squat        ? Number(ormVals.squat)        : null,
      current_bench_1rm:    ormVals.bench        ? Number(ormVals.bench)        : null,
      current_deadlift_1rm: ormVals.deadlift     ? Number(ormVals.deadlift)     : null,
      body_weight:          ormVals.body_weight  ? Number(ormVals.body_weight)  : null,
      sex:                  ormVals.sex,
    }
    await supabase.from('profiles').update(data).eq('id', userId)
    setProfile(p => p ? { ...p, ...data } : p)
    // Update leaderboard entry for self so GL updates instantly
    setLeaderboard(lb => lb.map(e => e.id === userId ? { ...e, body_weight: data.body_weight, sex: data.sex } : e))
    setEditingORM(false)
  }

  const addCompLift = async (data: Omit<CompLift, 'id'>) => {
    if (!userId) return
    const { data: row } = await supabase.from('competition_lifts').insert({ ...data, athlete_id: userId }).select('*').single()
    if (row) setCompLifts(c => [...c, row as CompLift].sort((a, b) => a.comp_date.localeCompare(b.comp_date)))
  }

  const deleteCompLift = async (id: string) => {
    await supabase.from('competition_lifts').delete().eq('id', id)
    setCompLifts(c => c.filter(x => x.id !== id))
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

  // ── Best lift by reps ──────────────────────────────────────────
  const bestByReps = (lift: 'squat'|'bench'|'deadlift', reps: number): PrLog | null => {
    const filtered = prLogs.filter(p => p.lift === lift && p.reps === reps)
    if (!filtered.length) return null
    return filtered.reduce((best, cur) => cur.weight_kg > best.weight_kg ? cur : best)
  }

  // ── Leaderboard sort + GL calc ─────────────────────────────────
  const lbSorted = [...leaderboard]
    .map(e => {
      // Priority: 1) latest comp total + comp body weight
      //           2) training total  + profile body weight
      //           3) training total  + 93kg fallback
      const total = e.latest_comp_total ?? e.training_total ?? 0
      const bw    = e.latest_body_weight  // from last competition
               ?? e.body_weight           // from profile (lifter enters this)
               ?? 93                      // absolute fallback
      const sex   = (e.sex === 'female' ? 'female' : 'male') as 'male' | 'female'
      return { ...e, gl: calcGL(total, bw, sex), bwUsed: bw }
    })
    .filter(e => e.gl > 0)
    .sort((a, b) => b.gl - a.gl)

  // ── Comp progress chart data ───────────────────────────────────
  const chartColors: Record<string, string> = {
    squat_kg: '#6b8cff', bench_kg: '#f59e0b', deadlift_kg: '#22c55e', total_kg: '#e0e0e0'
  }
  const chartLabels: Record<string, string> = {
    squat_kg: 'ČUČANJ', bench_kg: 'BENCH', deadlift_kg: 'MRTVO', total_kg: 'TOTAL'
  }

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
  const latestComp = compLifts.length > 0 ? compLifts[compLifts.length - 1] : null

  return (
    <div style={{ background: '#06060a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', overflowX: 'hidden' }}>

      {/* Bg glows */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div style={{ position: 'fixed', top: '-20vh', left: '-10vw', width: '60vw', height: '60vh', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse, rgba(56,100,255,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />

      {/* Mini nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,32px)', background: 'rgba(6,6,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '0.65rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#aaa'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#555'}>
          <Home size={13} /> POČETNA
        </Link>
        <Link href="/training" style={{ textDecoration: 'none', padding: '8px 18px', border: '1px solid rgba(255,255,255,0.15)', color: '#ccc', fontSize: '0.65rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', borderRadius: '6px', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLAnchorElement).style.color = '#ccc' }}>
          TRENING →
        </Link>
      </nav>

      <div style={{ paddingTop: '60px', maxWidth: '1000px', margin: '0 auto', padding: 'clamp(80px,10vw,100px) clamp(16px,4vw,32px) 80px', position: 'relative', zIndex: 1 }}>

        {/* ── PROFILE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'clamp(16px,4vw,32px)', marginBottom: '40px', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
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
          <div style={{ marginBottom: '28px', padding: '18px 20px', background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
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
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
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

            {/* Comp progress chart */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0e0e14', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', marginBottom: '3px', fontFamily: 'var(--fm)' }}>COMP NAPREDAK</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0' }}>{chartLabels[chartLift]}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['total_kg', 'squat_kg', 'bench_kg', 'deadlift_kg'] as const).map(k => (
                    <button key={k} onClick={() => setChartLift(k)}
                      style={{ padding: '5px 12px', background: chartLift === k ? chartColors[k] + '22' : 'transparent', border: `1px solid ${chartLift === k ? chartColors[k] : 'rgba(255,255,255,0.1)'}`, color: chartLift === k ? chartColors[k] : '#666', borderRadius: '5px', cursor: 'pointer', fontSize: '0.58rem', letterSpacing: '0.1em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s' }}>
                      {chartLabels[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '20px 20px 12px', background: '#09090e' }}>
                <CompChart compLifts={compLifts} lift={chartLift} color={chartColors[chartLift]} />
              </div>
            </div>

            {/* Comp history table */}
            <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0e0e14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.5rem', letterSpacing: '0.4em', color: '#666', fontFamily: 'var(--fm)' }}>NATJECANJA</div>
                <button onClick={() => setShowAddComp(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#ccc' }}>
                  <Plus size={11} /> DODAJ
                </button>
              </div>

              {compLifts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
                  Dodaj svoje natjecateljske rezultate za prikaz grafa napretka.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0a0a10' }}>
                        {['NATJECANJE', 'DATUM', 'SQ', 'BP', 'DL', 'TOTAL', 'TJEL.', 'MJ.', ''].map(h => (
                          <th key={h} style={{ padding: '8px 14px', fontSize: '0.46rem', color: '#555', letterSpacing: '0.2em', textAlign: h === '' ? 'center' : 'left', fontFamily: 'var(--fm)', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...compLifts].reverse().map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: i < compLifts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#e0e0e0', fontWeight: 500 }}>{c.comp_name}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#777' }}>{c.comp_date}</td>
                          {[c.squat_kg, c.bench_kg, c.deadlift_kg].map((v, j) => (
                            <td key={j} style={{ padding: '10px 14px', fontSize: '0.82rem', color: ['#6b8cff','#f59e0b','#22c55e'][j], fontWeight: 600 }}>{v ?? '—'}</td>
                          ))}
                          <td style={{ padding: '10px 14px', fontSize: '0.88rem', color: '#e0e0e0', fontWeight: 700 }}>{c.total_kg ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#777' }}>{c.body_weight ?? '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: c.place === 1 ? '#facc15' : '#888', fontWeight: c.place ? 700 : 400 }}>
                            {c.place ? `${c.place}.` : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <button onClick={() => deleteCompLift(c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#333', padding: '2px', transition: 'color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = '#333'}>
                              <Trash2 size={11} />
                            </button>
                          </td>
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

            {/* Progress over time for selected lift */}
            {(() => {
              const liftPrs = prLogs.filter(p => p.lift === prLift && p.reps === prReps).reverse()
              const liftColor = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }[prLift]
              if (liftPrs.length < 2) return null
              return (
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0e0e14', fontSize: '0.5rem', color: '#666', letterSpacing: '0.35em', fontFamily: 'var(--fm)' }}>NAPREDAK {prLift.toUpperCase()} {prReps}RM</div>
                  <div style={{ padding: '16px 20px', background: '#09090e' }}>
                    <LineChart data={liftPrs.map(p => ({ date: p.date, value: p.weight_kg }))} color={liftColor} label={`${prLift}-${prReps}`} />
                  </div>
                </div>
              )
            })()}

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
              IPF GL BODOVI · SORTIRANO PO TOTAL-U (COMP ILI TRENING)
            </div>

            {lbSorted.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>Nema dovoljno podataka za leaderboard.</div>
            ) : lbSorted.map((e, i) => {
              const isMe = e.id === userId
              const medal = i === 0 ? '#facc15' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : null
              const total = e.latest_comp_total ?? e.training_total ?? 0
              // bwUsed is already computed in lbSorted map above
              const bw    = (e as any).bwUsed ?? 93
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', marginBottom: '6px', background: isMe ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'all 0.15s', boxShadow: isMe ? '0 0 20px rgba(255,255,255,0.05)' : 'none' }}>

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

                  {/* Name + class */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isMe ? '#fff' : '#e0e0e0', fontFamily: 'var(--fm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {e.full_name}
                      {isMe && <span style={{ fontSize: '0.48rem', letterSpacing: '0.2em', color: '#6b8cff', border: '1px solid rgba(107,140,255,0.3)', padding: '2px 6px', borderRadius: '4px' }}>TI</span>}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#555', marginTop: '1px' }}>
                      {e.weight_class ?? '—'}
                      {' · '}
                      {(e as any).bwUsed ? `${(e as any).bwUsed}kg` : '—kg'}
                      {e.latest_comp_date ? ` · comp ${e.latest_comp_date.slice(0, 7)}` : ` · trening total`}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '16px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 800, color: '#e0e0e0' }}>{total || '—'}</div>
                      <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.15em' }}>TOTAL</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.3rem', fontWeight: 800, color: medal ?? '#888' }}>{e.gl.toFixed(2)}</div>
                      <div style={{ fontSize: '0.46rem', color: '#555', letterSpacing: '0.15em' }}>GL PTS</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '0.6rem', color: '#444', lineHeight: 1.7 }}>
              GL bodovi se računaju po IPF GL formuli koristeći zadnji natjecatelji total i tjelesnu masu, ili trening total (SQ+BP+DL 1RM) ako nema comp podataka. Muški parametri: a=1199.73, b=1025.18, c=0.00921.
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showAvatarPicker && <AvatarPicker current={currentAvatar} onSelect={saveAvatar} onClose={() => setShowAvatarPicker(false)} />}
      {showAddComp && <AddCompLiftModal onSave={addCompLift} onClose={() => setShowAddComp(false)} />}

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes spin    { to { transform:rotate(360deg) } }
        table { font-family: var(--fm); }
        td, th { vertical-align: middle; }
        input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { opacity: 0.5; }
        @media (max-width: 600px) {
          table { font-size: 0.75rem; }
          td, th { padding: 8px !important; }
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