'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { CoachTip } from './types'

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

export function HubTab({ tips, athleteName }: { tips: CoachTip[]; athleteName: string }) {
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