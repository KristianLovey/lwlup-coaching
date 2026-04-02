'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Check, ChevronDown, Loader2, Trash2 } from 'lucide-react'
import type { MeetAttempt, Competition } from './types'

const supabase = createClient()

// ─── TYPES ────────────────────────────────────────────────────────
type Lift = 'squat' | 'bench' | 'deadlift'

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
function LiftCard({ lift, attempt, isAdmin, athleteId, onUpdate, onDelete }: {
  lift: Lift
  attempt: MeetAttempt | null
  isAdmin: boolean
  athleteId: string
  onUpdate: (data: Partial<MeetAttempt> & { lift: Lift; athlete_id: string }) => Promise<MeetAttempt>
  onDelete: (id: string) => void
}) {
  const meta = LIFT_META[lift]
  const [open, setOpen] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local state for all fields
  const [w1, setW1] = useState(attempt?.warmup1_kg?.toString() ?? '')
  const [w2, setW2] = useState(attempt?.warmup2_kg?.toString() ?? '')
  const [w3, setW3] = useState(attempt?.warmup3_kg?.toString() ?? '')
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
  const [lifterNotes, setLifterNotes] = useState(attempt?.lifter_notes ?? '')

  const num = (v: string) => v ? parseFloat(v) : null

  const save = async () => {
    setSaving(true)
    const data = {
      lift, athlete_id: athleteId,
      warmup1_kg: num(w1), warmup2_kg: num(w2), warmup3_kg: num(w3),
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

  return (
    <div style={{ border: `1.5px solid ${open ? meta.color + '30' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.25s', boxShadow: open ? `0 4px 24px ${meta.color}0a` : 'none' }}>

      {/* Header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '14px 20px', background: open ? `${meta.color}08` : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', userSelect: 'none' as const, transition: 'background 0.2s' }}>
        {/* Short badge */}
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${meta.color}14`, border: `1.5px solid ${meta.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

          {/* Warmups — admin fills, lifter reads */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>WARMUPS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              <MeetInput label="Warmup 1" value={w1} onChange={setW1} color={meta.color} disabled={!isAdmin} placeholder="kg" />
              <MeetInput label="Warmup 2" value={w2} onChange={setW2} color={meta.color} disabled={!isAdmin} placeholder="kg" />
              <MeetInput label="Warmup 3" value={w3} onChange={setW3} color={meta.color} disabled={!isAdmin} placeholder="kg" />
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
                <div key={row.n} style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr 1fr 40px' : '1fr 1fr 40px', gap: '8px', alignItems: 'end', marginBottom: '8px', padding: '12px 14px', background: row.good === true ? 'rgba(34,197,94,0.05)' : row.good === false ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${row.good === true ? 'rgba(34,197,94,0.15)' : row.good === false ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', transition: 'all 0.2s' }}>
                  <div style={{ gridColumn: isAdmin ? '1 / 3' : '1 / 2' }}>
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
                  <div style={{ gridColumn: isAdmin ? '3 / 4' : '2 / 3' }}>
                    <MeetInput label="Podignuto" value={row.act} onChange={row.setAct} color={row.good === true ? '#4ade80' : row.good === false ? '#f87171' : 'rgba(255,255,255,0.5)'} placeholder="kg" disabled={isAdmin} />
                  </div>
                  {/* Good/No lift toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
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

          {/* Save button — admin only for structure, lifter can save actuals */}
          {isAdmin && (
            <button onClick={save} disabled={saving}
              style={{ padding: '11px 24px', background: saving ? 'rgba(255,255,255,0.06)' : '#fff', border: 'none', color: saving ? '#666' : '#000', borderRadius: '9px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--fm)', transition: 'all 0.2s', alignSelf: 'flex-start' as const }}>
              {saving ? 'Snimanje...' : 'Spremi plan'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MEET DAY TAB ─────────────────────────────────────────────────
export function MeetDayTab({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [attempts, setAttempts]     = useState<MeetAttempt[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [selectedComp, setSelectedComp] = useState<string | null>(null)
  const [meetDate, setMeetDate]     = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading]       = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // For admin — which athlete to view
  const [athleteId, setAthleteId]   = useState(userId)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: comps }, { data: atts }] = await Promise.all([
        supabase.from('competitions').select('id,name,date,location,status').gte('date', new Date(Date.now() - 365*24*3600*1000).toISOString().split('T')[0]).order('date', { ascending: false }),
        supabase.from('meet_attempts').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
      ])
      setCompetitions((comps ?? []) as Competition[])
      setAttempts((atts ?? []) as MeetAttempt[])
      // Auto-select latest date
      if (atts && atts.length > 0) setMeetDate(atts[0].meet_date)
      setLoading(false)
    }
    load()
  }, [athleteId])

  // Get attempts for current date
  const dateAttempts = attempts.filter(a => a.meet_date === meetDate)
  const attemptByLift = (lift: Lift) => dateAttempts.find(a => a.lift === lift) ?? null

  // Unique dates with attempts
  const meetDates = Array.from(new Set(attempts.map(a => a.meet_date))).sort((a,b) => b.localeCompare(a))

  const upsertAttempt = async (data: Partial<MeetAttempt> & { lift: Lift; athlete_id: string }): Promise<MeetAttempt> => {
    const existing = dateAttempts.find(a => a.lift === data.lift)
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

  // Competition linked to current date's attempts
  const linkedComp = dateAttempts[0]?.competition_id
    ? competitions.find(c => c.id === dateAttempts[0].competition_id)
    : null

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
  const total = Object.values(bestByLift).every(v => v !== null)
    ? Object.values(bestByLift).reduce((s, v) => s! + v!, 0)
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: '#555' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', fontFamily: 'var(--fm)' }}>UČITAVANJE...</span>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Header bar — date selector + comp link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Date selector */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowDatePicker(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', cursor: 'pointer', color: '#e0e0e0', fontFamily: 'var(--fm)', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {meetDate}
          </button>
          {showDatePicker && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#09090e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 200, minWidth: '200px', overflow: 'hidden', animation: 'dropDown 0.18s ease' }}>
              {/* New meet date */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: '0.54rem', color: '#555', letterSpacing: '0.2em', marginBottom: '6px', fontFamily: 'var(--fm)' }}>NOVI DATUM</div>
                <input type="date" value={meetDate} onChange={e => { setMeetDate(e.target.value); setShowDatePicker(false) }}
                  style={{ background: 'transparent', border: 'none', color: '#e0e0e0', fontFamily: 'var(--fm)', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }} />
              </div>
              {/* Existing dates */}
              {meetDates.map(d => (
                <button key={d} onClick={() => { setMeetDate(d); setShowDatePicker(false) }}
                  style={{ width: '100%', padding: '9px 14px', background: d === meetDate ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: d === meetDate ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left', fontSize: '0.8rem', fontFamily: 'var(--fm)', transition: 'background 0.1s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={e => { if (d !== meetDate) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (d !== meetDate) e.currentTarget.style.background = 'transparent' }}>
                  {d === meetDate && <Check size={11} color="#4ade80" />}
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comp link — optional */}
        {competitions.length > 0 && isAdmin && (
          <select value={selectedComp ?? ''} onChange={e => setSelectedComp(e.target.value || null)}
            style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#aaa', fontFamily: 'var(--fm)', fontSize: '0.78rem', outline: 'none', cursor: 'pointer' }}>
            <option value="">Poveži natjecanje (opcionalno)</option>
            {competitions.map(c => <option key={c.id} value={c.id}>{c.name} — {c.date}</option>)}
          </select>
        )}
        {linkedComp && !isAdmin && (
          <div style={{ padding: '7px 14px', background: 'rgba(107,140,255,0.08)', border: '1px solid rgba(107,140,255,0.2)', borderRadius: '9px', fontSize: '0.72rem', color: '#8ba8ff', fontFamily: 'var(--fm)' }}>
            🏆 {linkedComp.name} — {linkedComp.date}
          </div>
        )}
      </div>

      {/* Total summary */}
      {(bestByLift.squat || bestByLift.bench || bestByLift.deadlift) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '24px', animation: 'popIn 0.35s ease' }}>
          {(['squat','bench','deadlift'] as Lift[]).map(lift => (
            <div key={lift} style={{ padding: '14px 16px', background: `${LIFT_META[lift].color}0a`, border: `1.5px solid ${LIFT_META[lift].color}22`, borderRadius: '12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '0.52rem', color: LIFT_META[lift].color, letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>{LIFT_META[lift].short}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: bestByLift[lift] ? LIFT_META[lift].color : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>
                {bestByLift[lift] ? `${bestByLift[lift]}` : '—'}
              </div>
            </div>
          ))}
          <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '4px' }}>TOTAL</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 700, color: total ? '#f0f0f5' : 'rgba(255,255,255,0.2)', lineHeight: 1 }}>
              {total ?? '—'}
            </div>
          </div>
        </div>
      )}

      {/* Lift cards */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {(['squat','bench','deadlift'] as Lift[]).map(lift => (
          <LiftCard
            key={lift}
            lift={lift}
            attempt={attemptByLift(lift)}
            isAdmin={isAdmin}
            athleteId={athleteId}
            onUpdate={upsertAttempt}
            onDelete={deleteAttempt}
          />
        ))}
      </div>

      {/* Lifter notes */}
      <div style={{ marginTop: '20px', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ height: '1px', width: '16px', background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>MOJE BILJEŠKE S NATJECANJA</span>
        </div>
        <textarea
          value={dateAttempts[0]?.lifter_notes ?? ''}
          onChange={async e => {
            const notes = e.target.value
            const first = dateAttempts[0]
            if (first) {
              await supabase.from('meet_attempts').update({ lifter_notes: notes }).eq('id', first.id)
              setAttempts(prev => prev.map(a => a.id === first.id ? { ...a, lifter_notes: notes } : a))
            }
          }}
          placeholder="Kako si se osjećao/la, što je prošlo dobro, što bi promijenio/la..."
          disabled={dateAttempts.length === 0}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.84rem', fontFamily: 'var(--fm)', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' as const, lineHeight: 1.7 }}
        />
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes popIn   { from { opacity:0; transform:scale(0.96) translateY(4px) } to { opacity:1; transform:none } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
      `}</style>
    </div>
  )
}