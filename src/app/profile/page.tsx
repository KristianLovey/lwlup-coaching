'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Home, LogOut, User, BarChart2, TrendingUp, Plus, Check, Loader2, Edit2, X, Save } from 'lucide-react'

const supabase = createClient()

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
}

type AthleteStats = {
  id: string
  athlete_id: string
  stat_date: string
  squat_pr: number | null
  bench_pr: number | null
  deadlift_pr: number | null
  total: number | null
  bodyweight_kg: number | null
  weekly_volume_sets: number | null
}

type Block = {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
  weeks?: { workouts?: { completed: boolean }[] }[]
}

// ── Mini line chart (pure SVG) ─────────────────────────────────────
function LineChart({
  data, color = '#fff', label, unit = 'kg', height = 120
}: {
  data: { date: string; value: number }[]
  color?: string
  label: string
  unit?: string
  height?: number
}) {
  if (data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>
      NEMA DOVOLJNO PODATAKA
    </div>
  )

  const values = data.map(d => d.value)
  const min = Math.min(...values) * 0.97
  const max = Math.max(...values) * 1.03
  const range = max - min || 1
  const w = 600
  const h = height
  const pad = { t: 10, r: 10, b: 24, l: 40 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  const pts = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * cw,
    y: pad.t + (1 - (d.value - min) / range) * ch,
    ...d
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(pad.t + ch).toFixed(1)} L${pad.l},${(pad.t + ch).toFixed(1)} Z`

  const latest = data[data.length - 1].value
  const prev = data[data.length - 2]?.value
  const diff = prev ? latest - prev : 0
  const isUp = diff >= 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.56rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800, color }}>{latest}</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{unit}</span>
          {diff !== 0 && (
            <span style={{ fontSize: '0.65rem', color: isUp ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {isUp ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = pad.t + t * ch
          const val = max - t * range
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="var(--fm)">{val.toFixed(0)}</text>
            </g>
          )
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${label})`} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#0a0a0a" stroke={color} strokeWidth="2" />
            {i === pts.length - 1 && (
              <circle cx={p.x} cy={p.y} r="6" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.4">
                <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}

        {/* X axis dates */}
        {pts.filter((_, i) => i === 0 || i === pts.length - 1 || (data.length > 4 && i % Math.floor(data.length / 3) === 0)).map((p, i) => (
          <text key={i} x={p.x} y={h - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="var(--fm)">
            {p.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ── Bar chart for volume ───────────────────────────────────────────
function BarChart({ data, color = '#fff', label }: { data: { label: string; value: number }[]; color?: string; label: string }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div style={{ fontSize: '0.56rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '16px', fontFamily: 'var(--fm)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', background: color, opacity: 0.7 + 0.3 * (d.value / max), height: `${(d.value / max) * 72}px`, transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)', minHeight: d.value > 0 ? '2px' : '0' }} />
            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', whiteSpace: 'nowrap', fontFamily: 'var(--fm)' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Profile navbar ─────────────────────────────────────────────────
function ProfileNav({ onLogout }: { onLogout: () => void }) {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: '64px', display: 'flex', alignItems: 'center', background: 'rgba(10,10,12,0.98)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <img src="/slike/logopng.png" alt="LWLUP" style={{ height: '40px' }} />
        </Link>
        <Link href="/training" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', height: '100%', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'var(--fm)', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.35)'}
        ><ArrowLeft size={13} /> TRENING</Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <User size={14} color="rgba(255,255,255,0.4)" />
        <span style={{ fontFamily: 'var(--fd)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.7)' }}>PROFIL & STATISTIKE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', height: '100%', padding: '0 18px', borderLeft: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#fff'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.3)'}
        ><Home size={13} /></Link>
        <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', padding: '0 20px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.62rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ff5555'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,60,60,0.06)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        ><LogOut size={13} /> ODJAVA</button>
      </div>
    </nav>
  )
}

// ── Add PR modal ───────────────────────────────────────────────────
function AddPRModal({ onSave, onClose }: { onSave: (data: Partial<AthleteStats>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ stat_date: new Date().toISOString().split('T')[0], squat_pr: '', bench_pr: '', deadlift_pr: '', bodyweight_kg: '', weekly_volume_sets: '' })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#0f0f12', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.45em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>UNOS PODATAKA</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 800 }}>NOVI UNOS</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '6px 14px', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}
          >✕</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>DATUM</label>
            <input type="date" value={form.stat_date} onChange={e => setForm(f => ({ ...f, stat_date: e.target.value }))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 14px', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box', colorScheme: 'dark' }} />
          </div>

          {/* Lifts grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            {[
              { key: 'squat_pr', label: 'SQUAT' },
              { key: 'bench_pr', label: 'BENCH' },
              { key: 'deadlift_pr', label: 'DEADLIFT' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.52rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>{f.label} (kg)</label>
                <input type="number" value={(form as any)[f.key]} onChange={e => setForm(f2 => ({ ...f2, [f.key]: e.target.value }))}
                  placeholder="0" style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 12px', fontSize: '1rem', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
            ))}
          </div>

          {/* Bodyweight + volume */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { key: 'bodyweight_kg', label: 'TJELESNA TEŽINA (kg)' },
              { key: 'weekly_volume_sets', label: 'TJEDNI VOLUMEN (seti)' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.52rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', fontFamily: 'var(--fm)' }}>{f.label}</label>
                <input type="number" value={(form as any)[f.key]} onChange={e => setForm(f2 => ({ ...f2, [f.key]: e.target.value }))}
                  placeholder="0" style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '10px 12px', fontSize: '1rem', outline: 'none', fontFamily: 'var(--fm)', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}>ODUSTANI</button>
          <button onClick={() => {
            const s = Number(form.squat_pr) || null
            const b = Number(form.bench_pr) || null
            const d = Number(form.deadlift_pr) || null
            onSave({
              stat_date: form.stat_date,
              squat_pr: s, bench_pr: b, deadlift_pr: d,
              total: (s && b && d) ? s + b + d : null,
              bodyweight_kg: Number(form.bodyweight_kg) || null,
              weekly_volume_sets: Number(form.weekly_volume_sets) || null,
            })
          }} style={{ padding: '10px 28px', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 800, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
          >SPREMI</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<AthleteStats[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'pr'>('stats')
  const [showAddPR, setShowAddPR] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [profileRes, statsRes, blocksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('athlete_stats').select('*').eq('athlete_id', user.id).order('stat_date', { ascending: true }),
        supabase.from('blocks').select('id, name, status, start_date, end_date, weeks(workouts(completed))').eq('athlete_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      setEditName(profileRes.data?.full_name ?? '')
      setStats(statsRes.data ?? [])
      setBlocks(blocksRes.data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  const savePR = async (data: Partial<AthleteStats>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const { data: inserted } = await supabase.from('athlete_stats').insert({ ...data, athlete_id: user.id }).select('*').single()
    if (inserted) {
      setStats(s => [...s, inserted].sort((a, b) => a.stat_date.localeCompare(b.stat_date)))
    }
    setSaving(false)
    setShowAddPR(false)
  }

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: editName }).eq('id', profile.id)
    setProfile(p => p ? { ...p, full_name: editName } : p)
    setEditingProfile(false)
    setSaving(false)
  }

  // ── Chart data prep ──────────────────────────────────────────────
  const sqData = stats.filter(s => s.squat_pr).map(s => ({ date: s.stat_date, value: s.squat_pr! }))
  const bpData = stats.filter(s => s.bench_pr).map(s => ({ date: s.stat_date, value: s.bench_pr! }))
  const dlData = stats.filter(s => s.deadlift_pr).map(s => ({ date: s.stat_date, value: s.deadlift_pr! }))
  const totalData = stats.filter(s => s.total).map(s => ({ date: s.stat_date, value: s.total! }))
  const bwData = stats.filter(s => s.bodyweight_kg).map(s => ({ date: s.stat_date, value: s.bodyweight_kg! }))
  const volData = stats.filter(s => s.weekly_volume_sets).map(s => ({ date: s.stat_date, value: s.weekly_volume_sets! }))

  // Completed workouts per week (from blocks)
  const completedByWeek = blocks.flatMap(b => b.weeks ?? []).flatMap(w => w.workouts ?? [])
  const completedCount = completedByWeek.filter(w => w.completed).length
  const totalCount = completedByWeek.length

  // Latest PRs
  const latestSq = sqData[sqData.length - 1]?.value
  const latestBp = bpData[bpData.length - 1]?.value
  const latestDl = dlData[dlData.length - 1]?.value
  const latestTotal = (latestSq && latestBp && latestDl) ? latestSq + latestBp + latestDl : totalData[totalData.length - 1]?.value

  // Volume bar chart — last 8 entries
  const volBars = volData.slice(-8).map(d => ({ label: d.date.slice(5), value: d.value }))

  return (
    <div style={{ background: '#08080a', color: '#fff', minHeight: '100vh', fontFamily: 'var(--fm)', position: 'relative', overflowX: 'hidden' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '20%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.04) 0%,transparent 70%)' }} />
      </div>

      <ProfileNav onLogout={handleLogout} />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'rgba(255,255,255,0.3)' }}>
          <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em' }}>UČITAVANJE...</span>
        </div>
      ) : (
        <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '88px 60px 80px', position: 'relative', zIndex: 1 }}>

          {/* ── Header ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', gap: '24px', flexWrap: 'wrap', animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
            <div>
              <div style={{ fontSize: '0.56rem', letterSpacing: '0.55em', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>PROFIL ATLETA</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Avatar */}
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--fd)', flexShrink: 0 }}>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  {editingProfile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveProfile() }}
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 12px', fontSize: '1.5rem', fontFamily: 'var(--fd)', fontWeight: 800, outline: 'none', width: '280px' }}
                        autoFocus
                      />
                      <button onClick={saveProfile} style={{ background: '#fff', border: 'none', color: '#000', padding: '8px 16px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', fontFamily: 'var(--fm)' }}>
                        {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'SPREMI'}
                      </button>
                      <button onClick={() => { setEditingProfile(false); setEditName(profile?.full_name ?? '') }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', padding: '8px 14px', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'var(--fm)' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.8rem,3vw,2.8rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{profile?.full_name}</h1>
                      <button onClick={() => setEditingProfile(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', padding: '5px 10px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                      ><Edit2 size={12} /></button>
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.08em' }}>{profile?.email}</div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              {[
                { val: blocks.length, label: 'BLOKOVA' },
                { val: totalCount, label: 'TRENINGA' },
                { val: completedCount, label: 'GOTOVO' },
                { val: stats.length, label: 'UNOSA' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px 20px', background: '#08080a', textAlign: 'center', minWidth: '70px' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800 }}>{s.val}</div>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Current PRs ─────────────────────────────────────── */}
          {(latestSq || latestBp || latestDl) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '40px', animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
              {[
                { label: 'SQUAT PR', val: latestSq, color: '#60a5fa' },
                { label: 'BENCH PR', val: latestBp, color: '#f472b6' },
                { label: 'DEADLIFT PR', val: latestDl, color: '#fb923c' },
                { label: 'TOTAL', val: latestTotal, color: '#4ade80' },
              ].map((pr, i) => (
                <div key={i} style={{ padding: '24px 20px', background: '#0a0a0c', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: pr.color, opacity: 0.6 }} />
                  <div style={{ fontSize: '0.52rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontFamily: 'var(--fm)' }}>{pr.label}</div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '2.8rem', fontWeight: 800, lineHeight: 1, color: pr.color }}>
                    {pr.val ?? '—'}
                  </div>
                  {pr.val && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>kg</div>}
                </div>
              ))}
            </div>
          )}

          {/* ── Tab nav ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '40px', animation: 'fadeUp 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
            {([
              { key: 'stats', icon: <BarChart2 size={13} />, label: 'GRAFOVI' },
              { key: 'pr', icon: <TrendingUp size={13} />, label: 'POVIJEST PR' },
              { key: 'profile', icon: <User size={13} />, label: 'BLOKOVI' },
            ] as { key: 'stats' | 'pr' | 'profile'; icon: React.ReactNode; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer', color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, borderBottom: `2px solid ${activeTab === tab.key ? '#fff' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.2s' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowAddPR(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', margin: '4px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: '0.65rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#000' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            ><Plus size={12} /> DODAJ UNOS</button>
          </div>

          {/* ── GRAFOVI TAB ──────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              {/* PR Trendovi - 2 col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {[
                  { data: sqData, color: '#60a5fa', label: 'SQUAT TREND' },
                  { data: bpData, color: '#f472b6', label: 'BENCH PRESS TREND' },
                  { data: dlData, color: '#fb923c', label: 'DEADLIFT TREND' },
                  { data: totalData, color: '#4ade80', label: 'TOTAL TREND' },
                ].map((c, i) => (
                  <div key={i} style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.09)', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <LineChart data={c.data} color={c.color} label={c.label} height={130} />
                  </div>
                ))}
              </div>

              {/* Bottom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.09)', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <LineChart data={bwData} color="#e2e8f0" label="TJELESNA TEŽINA" height={120} />
                </div>
                <div style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.09)', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                  <BarChart data={volBars} color="rgba(255,255,255,0.6)" label="TJEDNI VOLUMEN (SETI)" />
                </div>
              </div>
            </div>
          )}

          {/* ── POVIJEST PR TAB ──────────────────────────────────── */}
          {activeTab === 'pr' && (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              {stats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '3rem', opacity: 0.1, marginBottom: '12px' }}>PR</div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.25em', marginBottom: '8px' }}>NEMA UNOSA</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.15)' }}>Klikni "Dodaj unos" da dodaš prve podatke</div>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 1fr 1fr', gap: '1px', marginBottom: '2px' }}>
                    {['DATUM', 'SQUAT', 'BENCH', 'DEAD', 'TOTAL', 'BW', 'VOLUMEN'].map((h, i) => (
                      <div key={i} style={{ padding: '8px 14px', fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.25em', fontFamily: 'var(--fm)', fontWeight: 700, textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>
                    ))}
                  </div>
                  {[...stats].reverse().map((s, i) => (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr 1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1px', animation: `fadeUp 0.3s ${i * 0.03}s both` }}>
                      {[
                        { val: s.stat_date, color: 'rgba(255,255,255,0.5)', align: 'left' },
                        { val: s.squat_pr ? `${s.squat_pr}kg` : '—', color: '#60a5fa', align: 'center' },
                        { val: s.bench_pr ? `${s.bench_pr}kg` : '—', color: '#f472b6', align: 'center' },
                        { val: s.deadlift_pr ? `${s.deadlift_pr}kg` : '—', color: '#fb923c', align: 'center' },
                        { val: s.total ? `${s.total}kg` : '—', color: '#4ade80', align: 'center' },
                        { val: s.bodyweight_kg ? `${s.bodyweight_kg}kg` : '—', color: 'rgba(255,255,255,0.6)', align: 'center' },
                        { val: s.weekly_volume_sets ?? '—', color: 'rgba(255,255,255,0.6)', align: 'center' },
                      ].map((cell, j) => (
                        <div key={j} style={{ padding: '12px 14px', background: '#0a0a0c', fontSize: j === 0 ? '0.7rem' : '0.85rem', color: cell.color as string, fontFamily: j > 0 ? 'var(--fd)' : 'var(--fm)', fontWeight: j > 0 ? 800 : 400, textAlign: cell.align as any, letterSpacing: j === 0 ? '0.06em' : '0.02em' }}>
                          {cell.val}
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── BLOKOVI TAB ──────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blocks.map((b, i) => {
                  const allWorkouts = b.weeks?.flatMap(w => w.workouts ?? []) ?? []
                  const done = allWorkouts.filter(w => w.completed).length
                  const total = allWorkouts.length
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  const statusColor = b.status === 'active' ? '#4ade80' : b.status === 'completed' ? '#60a5fa' : 'rgba(255,255,255,0.3)'

                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${b.status === 'active' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.2s', animation: `fadeUp 0.4s ${i * 0.06}s both` }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                    >
                      <div style={{ padding: '4px 10px', background: `${statusColor}18`, border: `1px solid ${statusColor}44`, color: statusColor, fontSize: '0.55rem', letterSpacing: '0.25em', fontWeight: 700, fontFamily: 'var(--fm)', flexShrink: 0 }}>
                        {b.status.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--fm)', marginBottom: '4px' }}>{b.name}</div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
                          {b.start_date} — {b.end_date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', letterSpacing: '0.1em' }}>{done}/{total} treninga</div>
                        <div style={{ width: '100px', height: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: statusColor, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 800, color: statusColor, minWidth: '48px', textAlign: 'right' }}>
                        {pct}%
                      </div>
                    </div>
                  )
                })}
                {blocks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', letterSpacing: '0.25em' }}>NEMA BLOKOVA</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {showAddPR && <AddPRModal onSave={savePR} onClose={() => setShowAddPR(false)} />}

      <style>{`
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }
        @media(max-width:768px){
          main{padding-left:16px!important;padding-right:16px!important;}
          div[style*="gridTemplateColumns: 'repeat(4"]{grid-template-columns:1fr 1fr!important;}
          div[style*="gridTemplateColumns: '1fr 1fr'"]{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  )
}