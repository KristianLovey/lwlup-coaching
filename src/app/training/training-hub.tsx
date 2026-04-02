'use client'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { CoachTip } from './types'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ─── SHARED UI ───────────────────────────────────────────────────
// ─── SHARED: Input component ────────────────────────────────────
export function CalcInput({ label, value, onChange, color = '#6b8cff', type = 'number', step = '1', min = '0', max = '9999', placeholder = '' }: {
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
export function ResultCard({ label, value, unit, color, sub }: { label: string; value: string | number; unit?: string; color: string; sub?: string }) {
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
export function SectionTitle({ children }: { children: React.ReactNode }) {
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

export function RpeCalc() {
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
export function GlCalc() {
  const [squat,  setSquat]  = useState('')
  const [bench,  setBench]  = useState('')
  const [dead,   setDead]   = useState('')
  const [bw,     setBw]     = useState('')
  const [sex,    setSex]    = useState<'male'|'female'>('male')

  const s = parseFloat(squat) || 0
  const bn = parseFloat(bench) || 0
  const d = parseFloat(dead) || 0
  const total = s > 0 && bn > 0 && d > 0 ? Math.round((s + bn + d) * 2) / 2 : 0
  const b = parseFloat(bw)

  const gl = (total && b) ? (() => {
    const P = sex === 'male'
      ? { a: 1199.72839, b: 1025.18162, c: 0.00921 }
      : { a: 610.32796,  b: 1045.59282, c: 0.03048 }
    const denom = P.a - P.b * Math.exp(-P.c * b)
    return denom > 0 ? Math.round((total * 100 / denom) * 100) / 100 : 0
  })() : 0

  const glC = gl >= 115 ? '#ff4444' : gl >= 100 ? '#c0a060' : gl >= 90 ? '#8888ff' : gl >= 80 ? '#44cc88' : gl >= 70 ? '#aaaaaa' : '#6b8cff'
  const glL = gl >= 115 ? 'Monster' : gl >= 100 ? 'Elite' : gl >= 90 ? 'Professional' : gl >= 80 ? 'Advanced' : gl >= 70 ? 'Intermediate' : gl > 0 ? 'Beginner' : ''
  const pct  = Math.min((gl / 130) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>
      {/* Sex toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {(['male','female'] as const).map(sv => (
          <button key={sv} onClick={() => setSex(sv)} style={{
            padding: '11px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--fm)', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
            background: sex === sv ? 'rgba(107,140,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${sex === sv ? 'rgba(107,140,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: sex === sv ? '#8ba8ff' : 'rgba(255,255,255,0.4)',
            boxShadow: sex === sv ? '0 0 0 3px rgba(107,140,255,0.1)' : 'none',
          }}>
            {sv === 'male' ? '♂  Muški' : '♀  Ženski'}
          </button>
        ))}
      </div>

      {/* Lift inputs */}
      <div>
        <SectionTitle>Unesi liftove</SectionTitle>
        <div className="gl-lifts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          <CalcInput label="Čučanj (kg)"        value={squat} onChange={setSquat} color="#f87171" step="0.5" placeholder="npr. 200" />
          <CalcInput label="Bench Press (kg)"   value={bench} onChange={setBench} color="#f59e0b" step="0.5" placeholder="npr. 140" />
          <CalcInput label="Mrtvo Dizanje (kg)" value={dead}  onChange={setDead}  color="#6b8cff" step="0.5" placeholder="npr. 250" />
        </div>
      </div>

      {/* Auto total display */}
      {total > 0 && (
        <div className="gl-total-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', animation: 'popIn 0.3s ease' }}>
          {[['SQ', squat, '#f87171'], ['BP', bench, '#f59e0b'], ['DL', dead, '#6b8cff'], ['TOTAL', String(total), '#fff']].map(([l, v, c]) => (
            <div key={l} style={{ padding: '14px 10px', background: '#09090e', textAlign: 'center' as const }}>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: 'var(--fm)', marginBottom: '4px' }}>{l}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: l === 'TOTAL' ? '1.6rem' : '1.3rem', fontWeight: 700, color: c as string, lineHeight: 1 }}>{v || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* BW input */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        <CalcInput label="Tjelesna masa (kg)" value={bw} onChange={setBw} color="#6b8cff" step="0.1" placeholder="npr. 93" />
      </div>

      {/* Result */}
      {gl > 0 && (
        <div style={{ animation: 'popIn 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ padding: '28px 28px 24px', background: `${glC}0a`, border: `1.5px solid ${glC}22`, borderRadius: '16px', textAlign: 'center' as const, marginBottom: '12px' }}>
            <div style={{ fontSize: '0.62rem', color: `${glC}aa`, letterSpacing: '0.12em', fontFamily: 'var(--fm)', fontWeight: 600, marginBottom: '8px' }}>IPF GL BODOVI</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '5rem', fontWeight: 800, color: glC, lineHeight: 1, letterSpacing: '-0.03em' }}>{gl}</div>
            <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 14px', background: `${glC}18`, borderRadius: '20px', border: `1px solid ${glC}33` }}>
              <span style={{ fontSize: '0.7rem', color: glC, fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.06em' }}>{glL}</span>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>
              {total}kg total · {bw}kg BW
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              {['Beginner', 'Inter.', 'Advanced', 'Prof.', 'Elite', 'Monster'].map((l) => (
                <span key={l} style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)' }}>{l}</span>
              ))}
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, #6b8cff, ${glC})`, borderRadius: '3px', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 8px ${glC}66` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              {[0, 70, 80, 90, 100, 115].map(v => (
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
export function WaterCutCalc() {
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
  { id:'weight',    label:'Praćenje kilaze',  sub:'Dnevni unos i tjedna projekcija',  color:'#f472b6', badge:'LOG'  },
  { id:'progress',  label:'Graf napretka',   sub:'Kilaze kroz blokove po liftu/RPE', color:'#22d3ee', badge:'GRAF' },
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

// ─── PROGRESS GRAPH ─────────────────────────────────────────────
type ProgressRow = {
  date: string
  weight_kg: number | null
  actual_rpe: number | null
  exercise_name: string
  block_name: string
  week_number: number
  priority: 'primary' | 'secondary' | 'other'
}

const RPE_RANGES = [
  { label: 'Sve', min: 0, max: 10 },
  { label: '@6-7', min: 6, max: 7 },
  { label: '@7-8', min: 7, max: 8 },
  { label: '@8-9', min: 8, max: 9 },
  { label: '@9+',  min: 9, max: 10 },
]

const GRAPH_COLORS = ['#22d3ee', '#f59e0b', '#f472b6', '#a78bfa', '#22c55e', '#f87171']

function ProgressGraph({ userId }: { userId: string }) {
  const [rows, setRows]           = useState<ProgressRow[]>([])
  const [exercises, setExercises] = useState<string[]>([])
  const [primaryLift, setPrimary] = useState('')
  const [secondaryLift, setSecondary] = useState('')
  const [rpeRange, setRpeRange]   = useState(0) // index into RPE_RANGES
  const [loading, setLoading]     = useState(true)
  const [hovered, setHovered]     = useState<{lift:string;idx:number}|null>(null)

  const COLOR = '#22d3ee'

  useEffect(() => {
    const load = async () => {
      // Get all blocks → weeks → workouts → workout_exercises with exercise name and dates
      const { data: blocks } = await supabase
        .from('blocks')
        .select('id, name, weeks(week_number, workouts(workout_date, workout_exercises(actual_weight_kg, actual_rpe, exercise:exercises(name))))')
        .eq('athlete_id', userId)
        .order('created_at', { ascending: true })

      const allRows: ProgressRow[] = []
      const exSet = new Set<string>()

      for (const block of (blocks ?? []) as any[]) {
        for (const week of (block.weeks ?? []) as any[]) {
          for (const workout of (week.workouts ?? []) as any[]) {
            for (const we of (workout.workout_exercises ?? []) as any[]) {
              if (!we.actual_weight_kg || !we.exercise?.name) continue
              exSet.add(we.exercise.name)
              allRows.push({
                date: workout.workout_date,
                weight_kg: we.actual_weight_kg,
                actual_rpe: we.actual_rpe,
                exercise_name: we.exercise.name,
                block_name: block.name,
                week_number: week.week_number,
                priority: 'other',
              })
            }
          }
        }
      }

      allRows.sort((a, b) => a.date.localeCompare(b.date))
      setRows(allRows)
      const exList = Array.from(exSet).sort()
      setExercises(exList)
      if (exList.length > 0) setPrimary(exList[0])
      if (exList.length > 1) setSecondary(exList[1])
      setLoading(false)
    }
    load()
  }, [userId])

  function filterRows(lift: string) {
    const range = RPE_RANGES[rpeRange]
    return rows.filter(r =>
      r.exercise_name === lift &&
      (range.min === 0 || (r.actual_rpe !== null && r.actual_rpe >= range.min && r.actual_rpe <= range.max))
    )
  }

  function LiftChart({ lift, color, label }: { lift: string; color: string; label: string }) {
    const data = filterRows(lift)
    if (data.length === 0) return (
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', fontFamily: 'var(--fm)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
        Nema podataka za odabrani filter
      </div>
    )

    const W = 500, H = 120, PL = 40, PR = 12, PT = 14, PB = 20
    const ys = data.map(d => d.weight_kg!)
    const minY = Math.floor(Math.min(...ys)) - 2
    const maxY = Math.ceil(Math.max(...ys)) + 2
    const toX = (i: number) => PL + (i / Math.max(data.length - 1, 1)) * (W - PL - PR)
    const toY = (v: number) => PT + (1 - (v - minY) / (maxY - minY)) * (H - PT - PB)
    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.weight_kg!), ...d }))
    const linePath = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = pts[i - 1]
      const cx = (prev.x + p.x) / 2
      return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
    }, '')
    const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
    const yTicks = [minY, Math.round((minY + maxY) / 2), maxY]
    const hov = hovered?.lift === lift ? hovered.idx : null

    // Group block labels
    const blockLabels: { x: number; name: string }[] = []
    let lastBlock = ''
    pts.forEach((p, i) => {
      if (p.block_name !== lastBlock) { blockLabels.push({ x: p.x, name: p.block_name }); lastBlock = p.block_name }
    })

    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color, fontFamily: 'var(--fm)' }}>{label}</span>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>{data.length} unosa · max {Math.max(...ys)}kg</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px', overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={`pg-${lift.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={PL - 4} y={toY(v) + 3.5} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.2)" fontFamily="var(--fm)">{v}</text>
            </g>
          ))}
          {/* Block dividers */}
          {blockLabels.map((bl, i) => i > 0 && (
            <g key={bl.name}>
              <line x1={bl.x} y1={PT} x2={bl.x} y2={H - PB} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
            </g>
          ))}
          <path d={fillPath} fill={`url(#pg-${lift.replace(/\s/g,'')})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {hov !== null && <line x1={pts[hov].x} y1={PT} x2={pts[hov].x} y2={H - PB} stroke={color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />}
          {pts.map((p, i) => (
            <g key={i} onMouseEnter={() => setHovered({ lift, idx: i })} onMouseLeave={() => setHovered(null)} style={{ cursor: 'crosshair' }}>
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={hov === i ? 5 : 2.5} fill={hov === i ? '#fff' : color} stroke={color} strokeWidth="1.5" />
              {hov === i && (
                <foreignObject x={p.x - 60} y={p.y - 56} width="120" height="50" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  <div style={{ background: '#0d0d16', border: `1px solid ${color}44`, borderRadius: '8px', padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' as const, fontFamily: 'var(--fm)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'var(--fd)', lineHeight: 1 }}>{p.weight_kg}kg</div>
                    {p.actual_rpe && <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>@RPE {p.actual_rpe}</div>}
                    <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>{p.block_name} · W{p.week_number} · {p.date}</div>
                  </div>
                </foreignObject>
              )}
            </g>
          ))}
          {/* Block name labels on x-axis */}
          {blockLabels.map((bl, i) => (
            <text key={bl.name} x={bl.x + 4} y={H - 3} fontSize="7" fill="rgba(255,255,255,0.18)" fontFamily="var(--fm)">{bl.name.slice(0, 14)}</text>
          ))}
        </svg>
      </div>
    )
  }

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '20px 0', textAlign: 'center' as const }}>UČITAVANJE...</div>
  if (exercises.length === 0) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '20px 0', textAlign: 'center' as const }}>Nema ulogiranih kilaža u treninzima.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: COLOR, fontFamily: 'var(--fm)', marginBottom: '6px', fontWeight: 700 }}>PRIMARNI LIFT</div>
          <select value={primaryLift} onChange={e => setPrimary(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${COLOR}33`, borderRadius: '9px', color: '#f0f0f5', padding: '9px 12px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
            <option value="">— bez odabira —</option>
            {exercises.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: '#f59e0b', fontFamily: 'var(--fm)', marginBottom: '6px', fontWeight: 700 }}>SEKUNDARNI LIFT</div>
          <select value={secondaryLift} onChange={e => setSecondary(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: '9px', color: '#f0f0f5', padding: '9px 12px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
            <option value="">— bez odabira —</option>
            {exercises.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* RPE filter */}
      <div>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', marginBottom: '6px' }}>RPE FILTER</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {RPE_RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRpeRange(i)}
              style={{ padding: '5px 12px', background: rpeRange === i ? `${COLOR}18` : 'transparent', border: `1px solid ${rpeRange === i ? COLOR : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: rpeRange === i ? COLOR : '#555', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {primaryLift && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
          <LiftChart lift={primaryLift} color={COLOR} label={primaryLift} />
        </div>
      )}
      {secondaryLift && secondaryLift !== primaryLift && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
          <LiftChart lift={secondaryLift} color="#f59e0b" label={secondaryLift} />
        </div>
      )}
    </div>
  )
}

// ─── WEIGHT TRACKER ─────────────────────────────────────────────
type WeightEntry = { id: string; weight_kg: number; logged_at: string; notes: string | null }

const DAY_NAMES = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 7 : d.getDay() // Mon=1 ... Sun=7
  const mon = new Date(d); mon.setDate(d.getDate() - (day - 1))
  return mon.toISOString().split('T')[0]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.`
}

function linReg(pts: {x:number;y:number}[]) {
  const n = pts.length
  if (n < 2) return null
  const sumX = pts.reduce((s,p)=>s+p.x,0), sumY = pts.reduce((s,p)=>s+p.y,0)
  const sumXY = pts.reduce((s,p)=>s+p.x*p.y,0), sumXX = pts.reduce((s,p)=>s+p.x*p.x,0)
  const slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
  const intercept = (sumY - slope*sumX) / n
  return { slope, intercept }
}

function WeightTracker({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [weight, setWeight]   = useState('')
  const [date, setDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const COLOR = '#f472b6'

  useEffect(() => {
    supabase
      .from('weight_logs')
      .select('id, weight_kg, logged_at, notes')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
      .limit(180)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }, [userId])

  async function addEntry() {
    const kg = parseFloat(weight)
    if (!kg || kg < 20 || kg > 400 || !date) return
    setSaving(true)
    // upsert by date — replace existing entry for same day
    const existing = entries.find(e => e.logged_at === date)
    if (existing) {
      const { data, error } = await supabase
        .from('weight_logs').update({ weight_kg: kg, notes: notes || null })
        .eq('id', existing.id).select('id, weight_kg, logged_at, notes').single()
      if (!error && data) setEntries(prev => prev.map(e => e.id === data.id ? data : e))
    } else {
      const { data, error } = await supabase
        .from('weight_logs').insert({ user_id: userId, weight_kg: kg, logged_at: date, notes: notes || null })
        .select('id, weight_kg, logged_at, notes').single()
      if (!error && data) setEntries(prev => [...prev, data].sort((a,b) => a.logged_at.localeCompare(b.logged_at)))
    }
    setWeight(''); setNotes('')
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    await supabase.from('weight_logs').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // Group entries by ISO week (Mon–Sun)
  const weeks = (() => {
    const map = new Map<string, WeightEntry[]>()
    for (const e of entries) {
      const wk = getWeekKey(e.logged_at)
      if (!map.has(wk)) map.set(wk, [])
      map.get(wk)!.push(e)
    }
    // Sort weeks desc (newest first)
    return Array.from(map.entries()).sort((a,b) => b[0].localeCompare(a[0]))
  })()

  // Per-week projection: use entries from this week + previous week
  function weekProjection(weekKey: string) {
    const wIdx = weeks.findIndex(([k]) => k === weekKey)
    const relevant: WeightEntry[] = []
    for (let i = wIdx; i < Math.min(wIdx + 2, weeks.length); i++) relevant.push(...weeks[i][1])
    if (relevant.length < 2) return null
    const base = new Date(relevant[0].logged_at).getTime()
    const pts = relevant.map(e => ({ x: (new Date(e.logged_at).getTime() - base) / 86400000, y: e.weight_kg }))
    const reg = linReg(pts)
    if (!reg) return null
    const lastX = pts[pts.length - 1].x
    const endX = lastX + 7
    const projEnd = +(reg.intercept + reg.slope * endX).toFixed(2)
    const weeklyChange = +(reg.slope * 7).toFixed(2)
    return { projEnd, weeklyChange }
  }

  // Full chart (all entries)
  function FullChart() {
    if (entries.length < 2) return null
    const W = 400, H = 110, PL = 36, PR = 12, PT = 12, PB = 16
    const ys = entries.map(e => e.weight_kg)
    const minY = Math.floor(Math.min(...ys)) - 1
    const maxY = Math.ceil(Math.max(...ys)) + 1
    const toX = (i: number) => PL + (i / (entries.length - 1)) * (W - PL - PR)
    const toY = (v: number) => PT + (1 - (v - minY) / (maxY - minY)) * (H - PT - PB)
    const pts = entries.map((e, i) => `${toX(i)},${toY(e.weight_kg)}`).join(' ')
    const yTicks = [minY, Math.round((minY + maxY) / 2), maxY]
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '110px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="wgfull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity="0.2" />
            <stop offset="100%" stopColor={COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PL - 4} y={toY(v) + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.2)" fontFamily="var(--fm)">{v}</text>
          </g>
        ))}
        <polygon points={`${PL},${H - PB} ${pts} ${toX(entries.length-1)},${H - PB}`} fill="url(#wgfull)" />
        <polyline points={pts} fill="none" stroke={COLOR} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {entries.map((e, i) => (
          <g key={e.id} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'pointer' }}>
            <circle cx={toX(i)} cy={toY(e.weight_kg)} r={hoverIdx === i ? 5 : 2.5} fill={hoverIdx === i ? '#fff' : COLOR} stroke={COLOR} strokeWidth="1.5" style={{ transition: 'r 0.1s' }} />
            {hoverIdx === i && (
              <text x={toX(i)} y={toY(e.weight_kg) - 8} textAnchor="middle" fontSize="8.5" fill="#fff" fontFamily="var(--fm)" fontWeight="700">{e.weight_kg}kg</text>
            )}
          </g>
        ))}
      </svg>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

      {/* Input */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <CalcInput label="Datum" value={date} onChange={setDate} color={COLOR} type="date" />
        <CalcInput label="Kilaza (kg)" value={weight} onChange={setWeight} color={COLOR} step="0.1" placeholder="npr. 92.5" />
        <CalcInput label="Bilješka" value={notes} onChange={setNotes} color={COLOR} type="text" placeholder="npr. natašte" />
      </div>
      <button onClick={addEntry} disabled={saving || !weight}
        style={{ padding: '12px', background: weight ? `${COLOR}18` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${weight ? COLOR+'44' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', color: weight ? COLOR : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--fm)', letterSpacing: '0.06em', cursor: weight ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
        {saving ? 'SPREMA...' : '+ SPREMI UNOS'}
      </button>

      {loading && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const, padding: '20px 0' }}>UČITAVANJE...</div>}

      {/* Full chart */}
      {entries.length >= 2 && (
        <div style={{ padding: '16px 20px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontFamily: 'var(--fm)' }}>
            UKUPNI GRAFIKON · {entries.length} unosa · {entries[0].logged_at} – {entries[entries.length-1].logged_at}
          </div>
          <FullChart />
        </div>
      )}

      {/* Weeks */}
      {weeks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
          {weeks.map(([weekKey, wEntries]) => {
            const proj = weekProjection(weekKey)
            const avg = +(wEntries.reduce((s,e) => s+e.weight_kg, 0) / wEntries.length).toFixed(2)
            const monDate = new Date(weekKey)
            const sunDate = new Date(weekKey); sunDate.setDate(monDate.getDate() + 6)
            const weekLabel = `${monDate.getDate().toString().padStart(2,'0')}.${(monDate.getMonth()+1).toString().padStart(2,'0')} – ${sunDate.getDate().toString().padStart(2,'0')}.${(sunDate.getMonth()+1).toString().padStart(2,'0')}.${sunDate.getFullYear()}`
            return (
              <div key={weekKey} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Week header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <span style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', fontWeight: 700 }}>TJEDAN · </span>
                    <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--fm)' }}>{weekLabel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>PROSJEK</div>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: '#fff', lineHeight: 1 }}>{avg}kg</div>
                    </div>
                    {proj && (
                      <div style={{ textAlign: 'right' as const }}>
                        <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>PROJ. SLJ. TJ.</div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: COLOR, lineHeight: 1 }}>{proj.projEnd}kg</div>
                      </div>
                    )}
                    {proj && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--fm)', color: proj.weeklyChange < 0 ? '#44cc88' : proj.weeklyChange > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', minWidth: '48px', textAlign: 'right' as const }}>
                        {proj.weeklyChange > 0 ? '+' : ''}{proj.weeklyChange}kg/tj
                      </div>
                    )}
                  </div>
                </div>
                {/* Day rows */}
                <div>
                  {wEntries.map((e, i) => {
                    const prevEntry = i < wEntries.length - 1 ? wEntries[i + 1] : entries[entries.findIndex(x => x.id === e.id) - 1]
                    const diff = prevEntry ? +(e.weight_kg - prevEntry.weight_kg).toFixed(2) : null
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        {/* Date */}
                        <div style={{ width: '90px', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.62rem', color: COLOR, fontFamily: 'var(--fm)', fontWeight: 700 }}>{formatDate(e.logged_at)}</div>
                          <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--fm)' }}>{e.logged_at}</div>
                        </div>
                        {/* Weight */}
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: '#fff', minWidth: '64px' }}>{e.weight_kg}kg</div>
                        {/* Diff */}
                        {diff !== null && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--fm)', color: diff < 0 ? '#44cc88' : diff > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        )}
                        {/* Notes */}
                        {e.notes && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.notes}</span>}
                        {/* Delete */}
                        <button onClick={() => deleteEntry(e.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--fm)', padding: '2px 6px', borderRadius: '4px', transition: 'color 0.15s', flexShrink: 0 }}
                          onMouseEnter={e2 => (e2.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                          onMouseLeave={e2 => (e2.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.12)'}>×</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Još nema unosa. Odaberi datum i dodaj kilažu iznad.</div>
      )}
    </div>
  )
}

export function HubTab({ tips, athleteName, userId }: { tips: CoachTip[]; athleteName: string; userId?: string }) {
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
            {active === 'weight'    && userId && <WeightTracker userId={userId} />}
            {active === 'weight'    && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za praćenje kilaze.</div>}
            {active === 'progress'  && userId && <ProgressGraph userId={userId} />}
            {active === 'progress'  && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za prikaz grafa.</div>}
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