'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, ChevronDown, Loader2, Trash2 } from 'lucide-react'
import type { MeetAttempt, Competition } from './types'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Lift = 'squat' | 'bench' | 'deadlift'
type AthleteOption = { id: string; full_name: string }
type Competitor    = { id: string; name: string; bw: string; sex: 'male' | 'female'; sq: string; bp: string; dl: string }

// ─── GL POINTS ────────────────────────────────────────────────────
function calcGLP(total: number, bw: number, sex: 'male' | 'female'): number {
  if (!total || !bw) return 0
  const P = sex === 'male'
    ? { a: 1199.72839, b: 1025.18162, c: 0.00921 }
    : { a: 610.32796,  b: 1045.59282, c: 0.03048 }
  const denom = P.a - P.b * Math.exp(-P.c * bw)
  return denom > 0 ? Math.round((total * 100 / denom) * 100) / 100 : 0
}
function glpColor(gl: number) {
  return gl >= 115 ? '#ff4444' : gl >= 100 ? '#c0a060' : gl >= 90 ? '#8888ff' : gl >= 80 ? '#44cc88' : gl >= 70 ? '#aaaaaa' : '#6b8cff'
}
function glpLabel(gl: number) {
  return gl >= 115 ? 'Monster' : gl >= 100 ? 'Elite' : gl >= 90 ? 'Prof.' : gl >= 80 ? 'Adv.' : gl >= 70 ? 'Inter.' : gl > 0 ? 'Beg.' : '—'
}

const LIFT_META: Record<Lift, { label: string; color: string; short: string }> = {
  squat:    { label: 'Čučanj',        color: '#6b8cff', short: 'SQ' },
  bench:    { label: 'Bench Press',   color: '#f59e0b', short: 'BP' },
  deadlift: { label: 'Mrtvo dizanje', color: '#22c55e', short: 'DL' },
}

// ─── SHARED INPUT ─────────────────────────────────────────────────
function MeetInput({ label, value, onChange, color, disabled = false, placeholder = '—' }: {
  label: string; value: string; onChange: (v: string) => void
  color: string; disabled?: boolean; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div style={{ fontSize: '0.56rem', fontWeight: 600, color: focused ? color : 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '5px', transition: 'color 0.2s' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type="number" step="0.5" value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: disabled ? 'rgba(255,255,255,0.02)' : focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${focused ? color : disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
            color: disabled ? 'rgba(255,255,255,0.35)' : '#f0f0f5', padding: '9px 12px',
            borderRadius: '9px', outline: 'none', fontSize: '0.95rem', fontFamily: 'var(--fm)',
            boxSizing: 'border-box' as const, transition: 'all 0.2s',
            boxShadow: focused ? `0 0 0 3px ${color}18` : 'none',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: '8px', right: '8px', height: '1.5px', borderRadius: '1px', background: color, transform: focused ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)', transformOrigin: 'left' }} />
      </div>
    </div>
  )
}

// ─── LIFT CARD ────────────────────────────────────────────────────
function LiftCard({ lift, attempt, isAdmin, athleteId, onUpdate, onDelete, onBestChange }: {
  lift: Lift
  attempt: MeetAttempt | null
  isAdmin: boolean
  athleteId: string
  onUpdate: (data: Partial<MeetAttempt> & { lift: Lift; athlete_id: string }) => Promise<MeetAttempt>
  onDelete: (id: string) => void
  onBestChange: (lift: Lift, best: number | null) => void
}) {
  const meta = LIFT_META[lift]
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Warmups — dynamic array built from DB fields
  const initWarmups = () => {
    const base = [
      attempt?.warmup1_kg?.toString() ?? '',
      attempt?.warmup2_kg?.toString() ?? '',
      attempt?.warmup3_kg?.toString() ?? '',
      ...(attempt?.warmup_extra ?? []).map(v => v.toString()),
    ]
    // trim trailing empty slots but keep at least 1
    let end = base.length - 1
    while (end > 0 && base[end] === '') end--
    return base.slice(0, end + 1)
  }
  const [warmups, setWarmups] = useState<string[]>(initWarmups)
  const [a1min, setA1min] = useState(attempt?.attempt1_min?.toString() ?? '')
  const [a1max, setA1max] = useState(attempt?.attempt1_max?.toString() ?? '')
  const [a2min, setA2min] = useState(attempt?.attempt2_min?.toString() ?? '')
  const [a2max, setA2max] = useState(attempt?.attempt2_max?.toString() ?? '')
  const [a3min, setA3min] = useState(attempt?.attempt3_min?.toString() ?? '')
  const [a3max, setA3max] = useState(attempt?.attempt3_max?.toString() ?? '')
  const [a1act, setA1act] = useState(attempt?.attempt1_actual?.toString() ?? '')
  const [a2act, setA2act] = useState(attempt?.attempt2_actual?.toString() ?? '')
  const [a3act, setA3act] = useState(attempt?.attempt3_actual?.toString() ?? '')
  const [a1good, setA1good] = useState<boolean | null>(attempt?.attempt1_good ?? null)
  const [a2good, setA2good] = useState<boolean | null>(attempt?.attempt2_good ?? null)
  const [a3good, setA3good] = useState<boolean | null>(attempt?.attempt3_good ?? null)
  const [adminNotes, setAdminNotes] = useState(attempt?.admin_notes ?? '')
  const [lifterNotes] = useState(attempt?.lifter_notes ?? '')

  const num = (v: string) => v ? parseFloat(v) : null

  const save = async () => {
    setSaving(true)
    const data = {
      lift, athlete_id: athleteId,
      warmup1_kg: num(warmups[0] ?? ''), warmup2_kg: num(warmups[1] ?? ''), warmup3_kg: num(warmups[2] ?? ''),
      warmup_extra: warmups.slice(3).map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0),
      attempt1_min: num(a1min), attempt1_max: num(a1max),
      attempt2_min: num(a2min), attempt2_max: num(a2max),
      attempt3_min: num(a3min), attempt3_max: num(a3max),
      attempt1_actual: num(a1act), attempt2_actual: num(a2act), attempt3_actual: num(a3act),
      attempt1_good: a1good, attempt2_good: a2good, attempt3_good: a3good,
      admin_notes: adminNotes || null,
      lifter_notes: lifterNotes || null,
      updated_at: new Date().toISOString(),
    }
    await onUpdate(data)
    setSaving(false)
  }

  // Calc best from actuals
  const goodLifts = [
    a1good && a1act ? parseFloat(a1act) : null,
    a2good && a2act ? parseFloat(a2act) : null,
    a3good && a3act ? parseFloat(a3act) : null,
  ].filter(Boolean) as number[]
  const best = goodLifts.length > 0 ? Math.max(...goodLifts) : null

  useEffect(() => { onBestChange(lift, best) }, [best, lift, onBestChange])

  return (
    <div style={{ border: `1.5px solid ${open ? meta.color + '55' : 'rgba(255,255,255,0.13)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.25s', boxShadow: open ? `0 4px 24px ${meta.color}18` : '0 2px 8px rgba(0,0,0,0.35)', background: '#111111' }}>

      {/* Header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '14px 20px', background: open ? `${meta.color}18` : 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', userSelect: 'none' as const, transition: 'background 0.2s' }}>
        {/* Short badge */}
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${meta.color}22`, border: `1.5px solid ${meta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.8rem', fontWeight: 800, color: meta.color, letterSpacing: '-0.01em' }}>{meta.short}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0f0f5', fontFamily: 'var(--fm)' }}>{meta.label}</div>
          {best && <div style={{ fontSize: '0.65rem', color: meta.color, fontFamily: 'var(--fm)', marginTop: '1px' }}>Best: {best}kg ✓</div>}
          {!attempt && <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginTop: '1px' }}>{isAdmin ? 'Klikni da dodaš plan' : 'Trener još nije postavio plan'}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saving && <Loader2 size={13} color="#888" style={{ animation: 'spin 1s linear infinite' }} />}
          {attempt && isAdmin && (
            <button onClick={e => { e.stopPropagation(); onDelete(attempt.id) }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '5px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
              <Trash2 size={12} />
            </button>
          )}
          <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s' }} />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '20px', background: '#111111', display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

          {/* Warmups — admin fills, lifter reads */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>WARMUPS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {warmups.map((w, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <MeetInput label={`Warmup ${idx + 1}`} value={w} onChange={v => setWarmups(prev => prev.map((x, i) => i === idx ? v : x))} color={meta.color} disabled={!isAdmin} placeholder="kg" />
                    {isAdmin && warmups.length > 1 && (
                      <button onClick={() => setWarmups(prev => prev.filter((_, i) => i !== idx))}
                        style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', padding: '2px 4px', lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'}>×</button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && warmups.length < 8 && (
                <button onClick={() => setWarmups(prev => [...prev, ''])}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: `${meta.color}10`, border: `1px dashed ${meta.color}33`, borderRadius: '7px', color: meta.color, fontSize: '0.62rem', fontFamily: 'var(--fm)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${meta.color}1e`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.color}66` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${meta.color}10`; (e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.color}33` }}>
                  <Plus size={11} /> DODAJ WARMUP
                </button>
              )}
            </div>
          </div>

          {/* Attempt ranges — admin fills min/max, lifter sees */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>RASPONI POKUŠAJA</span>
              {!isAdmin && <span style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>od trenera</span>}
            </div>
            {[
              { n: 1, min: a1min, setMin: setA1min, max: a1max, setMax: setA1max, act: a1act, setAct: setA1act, good: a1good, setGood: setA1good },
              { n: 2, min: a2min, setMin: setA2min, max: a2max, setMax: setA2max, act: a2act, setAct: setA2act, good: a2good, setGood: setA2good },
              { n: 3, min: a3min, setMin: setA3min, max: a3max, setMax: setA3max, act: a3act, setAct: setA3act, good: a3good, setGood: setA3good },
            ].map(row => {
              const hasRange = row.min || row.max
              return (
                <div key={row.n} className={`meet-attempt-row${isAdmin ? ' meet-attempt-admin' : ''}`} style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr 1fr 40px' : '1fr 1fr 40px', gap: '8px', alignItems: 'end', marginBottom: '8px', padding: '12px 14px', background: row.good === true ? 'rgba(34,197,94,0.05)' : row.good === false ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${row.good === true ? 'rgba(34,197,94,0.15)' : row.good === false ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', transition: 'all 0.2s' }}>
                  <div className="meet-minmax" style={{ gridColumn: isAdmin ? '1 / 3' : '1 / 2' }}>
                    {isAdmin ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <MeetInput label={`A${row.n} min`} value={row.min} onChange={row.setMin} color={meta.color} placeholder="kg" />
                        <MeetInput label={`A${row.n} max`} value={row.max} onChange={row.setMax} color={meta.color} placeholder="kg" />
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.56rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '5px' }}>POKUŠAJ {row.n} — RASPON</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: meta.color, fontFamily: 'var(--fd)' }}>
                          {hasRange ? `${row.min || '?'} – ${row.max || '?'} kg` : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>Nije postavljeno</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Actual column — lifter fills on meet day */}
                  <div className="meet-actual" style={{ gridColumn: isAdmin ? '3 / 4' : '2 / 3' }}>
                    <MeetInput label="Podignuto" value={row.act} onChange={row.setAct} color={row.good === true ? '#4ade80' : row.good === false ? '#f87171' : 'rgba(255,255,255,0.5)'} placeholder="kg" />
                  </div>
                  {/* Good/No lift toggle */}
                  <div className="meet-toggle" style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)', marginBottom: '2px', textAlign: 'center' as const }}>Ret</div>
                    <button onClick={() => row.setGood(row.good === true ? null : true)}
                      style={{ padding: '7px', borderRadius: '7px', border: `1px solid ${row.good === true ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`, background: row.good === true ? 'rgba(34,197,94,0.12)' : 'transparent', cursor: 'pointer', fontSize: '0.7rem', transition: 'all 0.15s' }}>
                      <Check size={12} color={row.good === true ? '#4ade80' : 'rgba(255,255,255,0.3)'} strokeWidth={row.good === true ? 3 : 1.5} />
                    </button>
                    <button onClick={() => row.setGood(row.good === false ? null : false)}
                      style={{ padding: '7px', borderRadius: '7px', border: `1px solid ${row.good === false ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)'}`, background: row.good === false ? 'rgba(248,113,113,0.1)' : 'transparent', cursor: 'pointer', fontSize: '0.7rem', transition: 'all 0.15s' }}>
                      <span style={{ color: row.good === false ? '#f87171' : 'rgba(255,255,255,0.25)', fontSize: '0.65rem', lineHeight: 1 }}>✗</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Admin notes — admin fills, lifter reads */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>NAPOMENE TRENERA</span>
            </div>
            {isAdmin ? (
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                placeholder="Taktika, psihološke upute, specifičnosti nastupa..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#e0e0e0', padding: '10px 14px', borderRadius: '9px', outline: 'none', fontSize: '0.84rem', fontFamily: 'var(--fm)', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box' as const, lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = meta.color}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            ) : adminNotes ? (
              <div style={{ padding: '12px 16px', background: `${meta.color}08`, border: `1px solid ${meta.color}20`, borderRadius: '9px', borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontFamily: 'var(--fm)' }}>{adminNotes}</div>
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)', fontStyle: 'italic' }}>Trener nije ostavio napomene.</div>
            )}
          </div>

          {/* Save button — all users can save */}
          <button onClick={save} disabled={saving}
            style={{ padding: '11px 24px', background: saving ? 'rgba(255,255,255,0.06)' : '#fff', border: 'none', color: saving ? '#666' : '#000', borderRadius: '9px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--fm)', transition: 'all 0.2s', alignSelf: 'flex-start' as const }}>
            {saving ? 'Snimanje...' : isAdmin ? 'Spremi plan' : 'Spremi rezultate'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MEET DAY TAB ─────────────────────────────────────────────────
export function MeetDayTab({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [attempts, setAttempts]         = useState<MeetAttempt[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedComp, setSelectedComp] = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [showCompPicker, setShowCompPicker] = useState(false)
  const compPickerRef = useRef<HTMLDivElement>(null)

  // For admin — which athlete to view (dynamic selector)
  const [athleteId, setAthleteId]   = useState(userId)
  const [athletes, setAthletes]     = useState<AthleteOption[]>([])
  const [lifterProfile, setLifterProfile] = useState<{ bw: number | null; sex: 'male' | 'female' }>({ bw: null, sex: 'male' })

  // VS Konkurencija
  const [showVS, setShowVS]         = useState(false)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [compDraft, setCompDraft]   = useState<Competitor>({ id: '', name: '', bw: '', sex: 'male', sq: '', bp: '', dl: '' })

  // Real-time bests from LiftCard local state (updates as user types, before save)
  const [localBests, setLocalBests] = useState<Record<Lift, number | null>>({ squat: null, bench: null, deadlift: null })
  const handleBestChange = useCallback((lift: Lift, best: number | null) => {
    setLocalBests(prev => ({ ...prev, [lift]: best }))
  }, [])

  // Load athlete list (admin only) and lifter profile
  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('id, full_name').order('full_name')
        .then(({ data }) => setAthletes((data ?? []) as AthleteOption[]))
    }
  }, [isAdmin])

  useEffect(() => {
    supabase.from('profiles').select('body_weight, sex').eq('id', athleteId).single()
      .then(({ data }) => {
        if (data) setLifterProfile({ bw: data.body_weight ?? null, sex: (data.sex ?? 'male') as 'male' | 'female' })
      })
  }, [athleteId])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: comps }, { data: atts }] = await Promise.all([
        supabase.from('competitions').select('id,name,date,location,status').order('date', { ascending: false }),
        supabase.from('meet_attempts').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
      ])
      const compList = (comps ?? []) as Competition[]
      const attList  = (atts ?? []) as MeetAttempt[]
      setCompetitions(compList)
      setAttempts(attList)
      // Auto-select comp that has most recent attempts, or latest comp
      const latestCompId = attList[0]?.competition_id
      if (latestCompId) {
        setSelectedComp(latestCompId)
      } else if (compList.length > 0) {
        setSelectedComp(compList[0].id)
      }
      setLoading(false)
    }
    load()
  }, [athleteId])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showCompPicker) return
    const handler = (e: MouseEvent) => {
      if (compPickerRef.current && !compPickerRef.current.contains(e.target as Node))
        setShowCompPicker(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showCompPicker])

  // Set of competition ids that have saved attempts
  const compsWithData = new Set(attempts.map(a => a.competition_id).filter(Boolean) as string[])

  // Get attempts for selected competition
  const activeAttempts = selectedComp
    ? attempts.filter(a => a.competition_id === selectedComp)
    : []
  const attemptByLift = (lift: Lift) => activeAttempts.find(a => a.lift === lift) ?? null

  const currentComp = selectedComp ? competitions.find(c => c.id === selectedComp) ?? null : null

  const upsertAttempt = async (data: Partial<MeetAttempt> & { lift: Lift; athlete_id: string }): Promise<MeetAttempt> => {
    const existing = activeAttempts.find(a => a.lift === data.lift)
    const today = new Date().toISOString().split('T')[0]
    const meetDate = currentComp?.date ?? today
    let result: MeetAttempt
    if (existing) {
      const { data: row } = await supabase.from('meet_attempts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').single()
      result = row as MeetAttempt
      setAttempts(prev => prev.map(a => a.id === existing.id ? result : a))
    } else {
      const { data: row } = await supabase.from('meet_attempts').insert({ ...data, meet_date: meetDate, competition_id: selectedComp }).select('*').single()
      result = row as MeetAttempt
      setAttempts(prev => [result, ...prev])
    }
    return result
  }

  const deleteAttempt = async (id: string) => {
    await supabase.from('meet_attempts').delete().eq('id', id)
    setAttempts(prev => prev.filter(a => a.id !== id))
  }

  // Total from good lifts
  const bestByLift: Record<Lift, number | null> = { squat: null, bench: null, deadlift: null }
  for (const lift of ['squat','bench','deadlift'] as Lift[]) {
    const att = attemptByLift(lift)
    if (att) {
      const goods = [
        att.attempt1_good && att.attempt1_actual,
        att.attempt2_good && att.attempt2_actual,
        att.attempt3_good && att.attempt3_actual,
      ].filter(Boolean) as number[]
      bestByLift[lift] = goods.length ? Math.max(...goods) : null
    }
  }
  const LIFT_ORDER: Lift[] = ['squat', 'bench', 'deadlift']
  const hasAnyLocalBest = LIFT_ORDER.some(l => localBests[l] !== null)
  const localTotal = LIFT_ORDER.every(l => localBests[l] !== null)
    ? LIFT_ORDER.reduce((s, l) => s + (localBests[l] ?? 0), 0)
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: '#555' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Athlete selector — admin only */}
      {isAdmin && athletes.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '8px' }}>ODABERI LIFTERA</div>
          <select
            value={athleteId}
            onChange={e => { setAthleteId(e.target.value); setAttempts([]); setLocalBests({ squat: null, bench: null, deadlift: null }) }}
            style={{ width: '100%', padding: '11px 14px', background: '#111111', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '11px', color: '#f0f0f5', fontFamily: 'var(--fm)', fontSize: '0.88rem', outline: 'none', cursor: 'pointer', appearance: 'none' as const }}>
            <option value={userId}> — Moj profil —</option>
            {athletes.filter(a => a.id !== userId).map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Competition selector */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '8px' }}>NATJECANJE</div>
        <div ref={compPickerRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCompPicker(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: currentComp ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${currentComp ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '11px', cursor: 'pointer', color: '#e0e0e0', fontFamily: 'var(--fm)', fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.15s', textAlign: 'left' as const }}>
            {/* Dot indicator */}
            {currentComp && compsWithData.has(currentComp.id) && (
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', flexShrink: 0, boxShadow: '0 0 6px #4ade80aa' }} />
            )}
            {currentComp ? (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', color: '#f0f0f5', fontWeight: 600 }}>{currentComp.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{currentComp.date}{currentComp.location ? ` · ${currentComp.location}` : ''}</div>
              </div>
            ) : (
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>Odaberi natjecanje...</span>
            )}
            <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ transform: showCompPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s', flexShrink: 0 }} />
          </button>

          {showCompPicker && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#09090e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '11px', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', zIndex: 300, overflow: 'hidden', animation: 'dropDown 0.18s ease' }}>
              {competitions.length === 0 && (
                <div style={{ padding: '14px 16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>Nema natjecanja u sustavu</div>
              )}
              {competitions.map(c => {
                const hasSaved = compsWithData.has(c.id)
                const isActive = c.id === selectedComp
                return (
                  <button key={c.id}
                    onClick={() => { setSelectedComp(c.id); setShowCompPicker(false) }}
                    style={{ width: '100%', padding: '11px 16px', background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.1s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                    {/* Saved indicator dot */}
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: hasSaved ? '#4ade80' : 'rgba(255,255,255,0.1)', flexShrink: 0, boxShadow: hasSaved ? '0 0 6px #4ade8066' : 'none', transition: 'all 0.2s' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#f0f0f5' : 'rgba(255,255,255,0.7)', fontFamily: 'var(--fm)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', marginTop: '1px' }}>{c.date}{c.location ? ` · ${c.location}` : ''}</div>
                    </div>
                    {isActive && <Check size={12} color="#f0f0f0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lift cards — shown only when a competition is selected */}
      {selectedComp ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
          {(['squat','bench','deadlift'] as Lift[]).map(lift => (
            <LiftCard
              key={`${lift}-${selectedComp ?? 'none'}`}
              lift={lift}
              attempt={attemptByLift(lift)}
              isAdmin={isAdmin}
              athleteId={athleteId}
              onUpdate={upsertAttempt}
              onDelete={deleteAttempt}
              onBestChange={handleBestChange}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)' }}>
          Odaberi natjecanje za prikaz planova
        </div>
      )}

      {/* Summary grid — shown below cards as soon as any lift is marked green */}
      {selectedComp && hasAnyLocalBest && (
        <div className="meet-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '16px', animation: 'popIn 0.35s ease' }}>
          {LIFT_ORDER.map(lift => (
            <div key={lift} style={{ padding: '14px 16px', background: localBests[lift] ? `${LIFT_META[lift].color}0a` : 'rgba(255,255,255,0.02)', border: `1.5px solid ${localBests[lift] ? LIFT_META[lift].color + '33' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', textAlign: 'center' as const, transition: 'all 0.3s' }}>
              <div style={{ fontSize: '0.52rem', color: localBests[lift] ? LIFT_META[lift].color : 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>{LIFT_META[lift].short}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: localBests[lift] ? LIFT_META[lift].color : 'rgba(255,255,255,0.15)', lineHeight: 1 }}>
                {localBests[lift] ?? '—'}
              </div>
              {localBests[lift] && <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginTop: '3px' }}>kg</div>}
            </div>
          ))}
          <div style={{ padding: '14px 16px', background: localTotal ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${localTotal ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', textAlign: 'center' as const, transition: 'all 0.3s' }}>
            <div style={{ fontSize: '0.52rem', color: localTotal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>TOTAL</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: localTotal ? '#f0f0f5' : 'rgba(255,255,255,0.15)', lineHeight: 1 }}>
              {localTotal ?? '—'}
            </div>
            {localTotal && <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', marginTop: '3px' }}>kg</div>}
          </div>
        </div>
      )}

      {/* ── VS KONKURENCIJA ─────────────────────────────────── */}
      {selectedComp && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setShowVS(v => !v)}
            style={{ width: '100%', padding: '12px 18px', background: showVS ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${showVS ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--fm)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem' }}>⚔️</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: showVS ? '#f0f0f5' : 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>VS KONKURENCIJA</span>
              {competitors.length > 0 && <span style={{ fontSize: '0.52rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '10px', fontFamily: 'var(--fm)' }}>{competitors.length}</span>}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', transform: showVS ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block', fontSize: '0.8rem' }}>↓</span>
          </button>

          {showVS && (() => {
            const lifterSQ   = localBests.squat ?? 0
            const lifterBP   = localBests.bench ?? 0
            const lifterDL   = localBests.deadlift ?? 0
            const lifterTot  = lifterSQ && lifterBP && lifterDL ? lifterSQ + lifterBP + lifterDL : 0
            const lifterGLP  = calcGLP(lifterTot, lifterProfile.bw ?? 0, lifterProfile.sex)
            const lifterName = athletes.find(a => a.id === athleteId)?.full_name ?? 'Moj lifter'

            const compRows = competitors.map(c => {
              const sq = parseFloat(c.sq) || 0, bp = parseFloat(c.bp) || 0, dl = parseFloat(c.dl) || 0
              const tot = sq && bp && dl ? sq + bp + dl : 0
              const glp = calcGLP(tot, parseFloat(c.bw) || 0, c.sex)
              return { ...c, sq, bp, dl, tot, glp }
            })

            const allRows = [
              { id: '__lifter__', name: lifterName, sq: lifterSQ, bp: lifterBP, dl: lifterDL, tot: lifterTot, glp: lifterGLP, isLifter: true },
              ...compRows.map(r => ({ ...r, isLifter: false })),
            ].sort((a, b) => (b.glp || b.tot) - (a.glp || a.tot))

            return (
              <div style={{ marginTop: '10px', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', overflow: 'hidden', animation: 'fadeUp 0.25s ease' }}>

                {/* Leaderboard */}
                {allRows.length > 0 && (
                  <div>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 52px 52px 52px 64px 64px', gap: '4px', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center' }}>
                      {['#','IME','SQ','BP','DL','TOTAL','GLP'].map(h => (
                        <span key={h} style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', fontFamily: 'var(--fm)', fontWeight: 700, textAlign: h === '#' || h === 'IME' ? 'left' as const : 'center' as const }}>{h}</span>
                      ))}
                    </div>
                    {allRows.map((row, idx) => {
                      const gc = row.glp > 0 ? glpColor(row.glp) : 'rgba(255,255,255,0.2)'
                      return (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 52px 52px 52px 64px 64px', gap: '4px', padding: '10px 14px', background: row.isLifter ? 'rgba(107,140,255,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', borderLeft: row.isLifter ? '3px solid #6b8cff' : '3px solid transparent' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: idx === 0 ? '#facc15' : 'rgba(255,255,255,0.25)', fontFamily: 'var(--fd)' }}>{idx + 1}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: row.isLifter ? 700 : 500, color: row.isLifter ? '#a5b4fc' : '#e0e0e0', fontFamily: 'var(--fm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{row.name}</span>
                          {(['sq','bp','dl'] as const).map(k => (
                            <span key={k} style={{ fontSize: '0.78rem', fontWeight: 600, color: row[k] ? LIFT_META[k === 'sq' ? 'squat' : k === 'bp' ? 'bench' : 'deadlift'].color : 'rgba(255,255,255,0.18)', fontFamily: 'var(--fd)', textAlign: 'center' as const }}>{row[k] || '—'}</span>
                          ))}
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: row.tot ? '#f0f0f5' : 'rgba(255,255,255,0.18)', fontFamily: 'var(--fd)', textAlign: 'center' as const }}>{row.tot || '—'}</span>
                          <div style={{ textAlign: 'center' as const }}>
                            {row.glp > 0 ? (
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: gc, fontFamily: 'var(--fd)', background: `${gc}14`, padding: '2px 6px', borderRadius: '6px', border: `1px solid ${gc}28` }}>{row.glp}</span>
                            ) : <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.7rem' }}>—</span>}
                          </div>
                          {!row.isLifter && (
                            <button onClick={() => setCompetitors(prev => prev.filter(c => c.id !== row.id))}
                              style={{ display: 'none' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add competitor form */}
                <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderTop: allRows.length > 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ fontSize: '0.52rem', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '10px' }}>DODAJ NATJECATELJA</div>

                  {/* Name + BW + sex */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px', marginBottom: '8px' }}>
                    <input
                      placeholder="Ime i prezime"
                      value={compDraft.name}
                      onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e0e0e0', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }}
                    />
                    <input
                      type="number" placeholder="BW kg" value={compDraft.bw}
                      onChange={e => setCompDraft(d => ({ ...d, bw: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e0e0e0', padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }}
                    />
                  </div>

                  {/* Sex toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                    {(['male','female'] as const).map(s => (
                      <button key={s} onClick={() => setCompDraft(d => ({ ...d, sex: s }))}
                        style={{ padding: '7px', borderRadius: '7px', border: `1px solid ${compDraft.sex === s ? 'rgba(107,140,255,0.4)' : 'rgba(255,255,255,0.1)'}`, background: compDraft.sex === s ? 'rgba(107,140,255,0.1)' : 'transparent', color: compDraft.sex === s ? '#8ba8ff' : 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {s === 'male' ? '♂ Muški' : '♀ Ženski'}
                      </button>
                    ))}
                  </div>

                  {/* SQ / BP / DL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    {([['sq','SQ','#6b8cff'],['bp','BP','#f59e0b'],['dl','DL','#22c55e']] as const).map(([k, label, color]) => (
                      <div key={k}>
                        <div style={{ fontSize: '0.46rem', color, letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '4px' }}>{label} (kg)</div>
                        <input
                          type="number" step="0.5" placeholder="best"
                          value={compDraft[k]}
                          onChange={e => setCompDraft(d => ({ ...d, [k]: e.target.value }))}
                          style={{ width: '100%', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: '7px', color: '#e0e0e0', padding: '7px 10px', fontSize: '0.85rem', fontFamily: 'var(--fm)', outline: 'none', boxSizing: 'border-box' as const }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (!compDraft.name.trim()) return
                      setCompetitors(prev => [...prev, { ...compDraft, id: Date.now().toString() }])
                      setCompDraft({ id: '', name: '', bw: '', sex: 'male', sq: '', bp: '', dl: '' })
                    }}
                    style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', color: '#f0f0f5', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--fm)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Plus size={13} /> DODAJ
                  </button>

                  {/* Remove buttons inline with rows above via delete icons */}
                  {competitors.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                      {competitors.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--fm)' }}>{c.name}</span>
                          <button onClick={() => setCompetitors(prev => prev.filter(x => x.id !== c.id))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.5)', display: 'flex', alignItems: 'center', padding: '2px' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,100,100,0.5)'}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Lifter notes */}
      {selectedComp && (
        <div style={{ marginTop: '20px', padding: '16px 20px', background: '#111111', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>MOJE BILJEŠKE S NATJECANJA</span>
          </div>
          <textarea
            value={activeAttempts[0]?.lifter_notes ?? ''}
            onChange={async e => {
              const notes = e.target.value
              const first = activeAttempts[0]
              if (first) {
                await supabase.from('meet_attempts').update({ lifter_notes: notes }).eq('id', first.id)
                setAttempts(prev => prev.map(a => a.id === first.id ? { ...a, lifter_notes: notes } : a))
              }
            }}
            placeholder="Kako si se osjećao/la, što je prošlo dobro, što bi promijenio/la..."
            disabled={activeAttempts.length === 0}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem', fontFamily: 'var(--fm)', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' as const, lineHeight: 1.7 }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.96) translateY(4px) } to { opacity:1; transform:none } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }

        /* ── Meet summary: 2×2 on mobile ── */
        @media (max-width: 520px) {
          .meet-summary-grid { grid-template-columns: repeat(2,1fr) !important; }
        }

        /* ── Meet attempt row: stack on mobile ── */
        @media (max-width: 500px) {
          .meet-attempt-admin {
            grid-template-columns: 1fr 40px !important;
            grid-template-rows: auto auto !important;
            align-items: stretch !important;
          }
          .meet-attempt-admin .meet-minmax {
            grid-column: 1 / 2 !important;
            grid-row: 1 !important;
          }
          .meet-attempt-admin .meet-actual {
            grid-column: 1 / 2 !important;
            grid-row: 2 !important;
          }
          .meet-attempt-admin .meet-toggle {
            grid-column: 2 / 3 !important;
            grid-row: 1 / 3 !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  )
}