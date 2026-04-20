'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Calculator, BookOpen, BarChart2, ChevronDown, Check } from 'lucide-react'
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
export function SectionTitle({ children, icon, color }: { children: React.ReactNode; icon?: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      {icon && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: color ? `${color}18` : 'rgba(255,255,255,0.06)', color: color ?? 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <span style={{ fontSize: '0.62rem', fontWeight: 600, color: color ?? 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', fontFamily: 'var(--fm)' }}>{children}</span>
      <div style={{ height: '1px', flex: 1, background: color ? `${color}20` : 'rgba(255,255,255,0.07)' }} />
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
  const validInputs = !isNaN(cur) && cur > 0 && !isNaN(tgt) && tgt > 0 && !!date
  const lose  = validInputs ? +(cur - tgt).toFixed(2) : 0
  const rawDays = date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) : 0
  const days  = isNaN(rawDays) ? 0 : Math.max(0, rawDays)
  const maxWC = validInputs ? parseFloat((cur * 0.03).toFixed(1)) : 0
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
          <CalcInput label="Trenutna masa (kg)" value={curKg} onChange={setCurKg} color="#22c55e" step="0.1" placeholder="npr. 95.5" />
          <CalcInput label="Ciljna masa (kg)"   value={tgtKg} onChange={setTgtKg} color="#22c55e" step="0.1" placeholder="npr. 93.0" />
          <CalcInput label="Datum natjecanja"   value={date}  onChange={setDate}  color="#22c55e" type="date" />
        </div>
      </div>

      {/* Results */}
      {validInputs && lose >= 0 && (
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

// ─── BAR LOADER ─────────────────────────────────────────────────
const BL_PLATES = [
  { kg: 25,   color: '#ef4444', border: '#b91c1c', text: '#fff', h: 84, w: 20, label: '25'   },
  { kg: 20,   color: '#3b82f6', border: '#1d4ed8', text: '#fff', h: 76, w: 18, label: '20'   },
  { kg: 15,   color: '#eab308', border: '#a16207', text: '#111', h: 68, w: 16, label: '15'   },
  { kg: 10,   color: '#22c55e', border: '#15803d', text: '#fff', h: 58, w: 14, label: '10'   },
  { kg: 5,    color: '#e5e7eb', border: '#9ca3af', text: '#111', h: 46, w: 12, label: '5'    },
  { kg: 2.5,  color: '#1f2937', border: '#374151', text: '#e5e7eb', h: 36, w: 9,  label: '2.5'  },
  { kg: 1.25, color: '#6b7280', border: '#4b5563', text: '#fff', h: 28, w: 7,  label: '1.25' },
  { kg: 1,    color: '#6b7280', border: '#4b5563', text: '#fff', h: 25, w: 6,  label: '1'    },
  { kg: 0.5,  color: '#6b7280', border: '#4b5563', text: '#fff', h: 22, w: 5,  label: '0.5'  },
  { kg: 0.25, color: '#6b7280', border: '#4b5563', text: '#fff', h: 19, w: 4,  label: '0.25' },
]
const BL_BAR_KG   = 20

function blCalcSide(perSide: number) {
  const plates: typeof BL_PLATES = []
  let rem = Math.round(perSide * 1000) / 1000
  for (const p of BL_PLATES) {
    while (rem >= p.kg - 0.0001) {
      plates.push(p)
      rem = Math.round((rem - p.kg) * 1000) / 1000
    }
  }
  return { plates, ok: rem < 0.0001 }
}

function BarLoader() {
  const [target, setTarget]           = useState('')
  const [collarType, setCollarType]   = useState<'competition' | 'classic'>('competition')
  const [barKg, setBarKg]             = useState(BL_BAR_KG)
  const [customBar, setCustomBar]     = useState('')
  const COLOR = '#60a5fa'

  const BL_BAR_PRESETS = [10, 15, 17.5, 20, 25]
  const collarKg  = collarType === 'competition' ? 2.5 : 0
  const baseKg    = barKg + collarKg * 2

  const raw      = parseFloat(target.replace(',', '.'))
  const isNum    = !isNaN(raw)
  const tooLight = isNum && raw < baseKg
  const oddSplit = isNum && !tooLight && Math.round((raw - baseKg) * 1000) % 500 !== 0
  const perSide  = isNum && !tooLight && !oddSplit ? (raw - baseKg) / 2 : 0
  const { plates, ok } = isNum && !tooLight && !oddSplit ? blCalcSide(perSide) : { plates: [], ok: true }

  const maxH = 90
  const barH = 10

  const summary = BL_PLATES.map(p => ({ ...p, count: plates.filter(x => x.kg === p.kg).length })).filter(x => x.count > 0)

  return (
    <div style={{ fontFamily: 'var(--fm)' }}>

      {/* Input + collar toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' as const }}>
            Ciljna kilaza (kg)
          </label>
          <input
            type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="npr. 100" min={baseKg} step={0.5}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLOR}33`, borderRadius: '8px', color: '#f0f0f5', padding: '12px 14px', fontFamily: 'var(--fm)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const }}
            onFocus={e => e.currentTarget.style.borderColor = `${COLOR}88`}
            onBlur={e  => e.currentTarget.style.borderColor = `${COLOR}33`}
          />
        </div>
        {/* Collar toggle */}
        <div>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontWeight: 600 }}>COLLAR</div>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {([['competition', '2.5 kg'], ['classic', '0 kg']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => setCollarType(val)}
                style={{ padding: '11px 12px', background: collarType === val ? COLOR : 'rgba(255,255,255,0.03)', border: 'none', color: collarType === val ? '#000' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'var(--fm)', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' as const }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bar weight selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const }}>
        <span style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap' as const }}>ŠIPKA</span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
          {BL_BAR_PRESETS.map(kg => (
            <button key={kg} onClick={() => { setBarKg(kg); setCustomBar('') }}
              style={{ padding: '5px 10px', background: barKg === kg && !customBar ? `${COLOR}18` : 'rgba(255,255,255,0.03)', border: `1px solid ${barKg === kg && !customBar ? COLOR : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: barKg === kg && !customBar ? COLOR : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--fm)', fontWeight: 600, transition: 'all 0.15s' }}>
              {kg} kg
            </button>
          ))}
        </div>
        {/* Custom bar input */}
        <input
          type="number" value={customBar} placeholder="ostalo"
          step={0.5} min={5}
          onChange={e => {
            setCustomBar(e.target.value)
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v > 0) setBarKg(v)
          }}
          style={{ width: '72px', background: customBar ? `${COLOR}0a` : 'rgba(255,255,255,0.03)', border: `1px solid ${customBar ? COLOR : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: customBar ? COLOR : 'rgba(255,255,255,0.4)', padding: '5px 8px', fontFamily: 'var(--fm)', fontSize: '0.7rem', outline: 'none', transition: 'all 0.15s' }}
          onFocus={e => e.currentTarget.style.borderColor = COLOR}
          onBlur={e  => e.currentTarget.style.borderColor = customBar ? COLOR : 'rgba(255,255,255,0.1)'}
        />
      </div>

      {/* Errors */}
      {isNum && tooLight && (
        <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', marginBottom: '16px' }}>
          Minimalna kilaza je {baseKg} kg (šipka{collarKg > 0 ? ` + ${collarKg * 2} kg collari` : ''}).
        </div>
      )}
      {isNum && !tooLight && oddSplit && (
        <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', marginBottom: '16px' }}>
          Kilaza mora biti višekratnik od 0.5 kg za ravnomjernu raspodjelu.
        </div>
      )}
      {isNum && !tooLight && !oddSplit && !ok && (
        <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', marginBottom: '16px' }}>
          Nije moguće sastaviti tu kilažu s dostupnim utezima.
        </div>
      )}

      {/* Single-side bar visual */}
      {isNum && !tooLight && !oddSplit && ok && (
        <>
          {/* Total weight label */}
          <div style={{ textAlign: 'center' as const, marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 800, color: COLOR }}>{raw}</span>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>kg</span>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
            {/* Centered inline-flex assembly */}
            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', height: `${maxH + 8}px` }}>

              {/* Bar shaft spans the full assembly width */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: barH, transform: 'translateY(-50%)', background: 'linear-gradient(180deg,#b0b8c1,#5a6473 40%,#374151 60%,#7a8494)', borderRadius: 3, zIndex: 0 }} />

              {/* Left end cap */}
              <div style={{ width: 14, height: 22, background: 'linear-gradient(180deg,#9ca3af,#4b5563)', borderRadius: '3px 0 0 3px', flexShrink: 0, zIndex: 2 }} />

              {/* Sleeve — fixed width, shows bar weight label */}
              <div style={{ width: 80, height: barH, background: 'transparent', flexShrink: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', letterSpacing: '0.1em', userSelect: 'none' as const }}>{barKg} kg</span>
              </div>

              {/* Plates: innermost (largest) first → outermost (smallest) last */}
              <div style={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
                {plates.map((p, i) => (
                  <div key={i} style={{
                    width: p.w + 4, height: p.h,
                    background: `linear-gradient(180deg, ${p.color}ee, ${p.color} 40%, ${p.border} 60%, ${p.color}cc)`,
                    border: `1px solid ${p.border}`,
                    borderRadius: i === 0 ? '3px 0 0 3px' : '0',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25), -1px 0 0 rgba(0,0,0,0.3)`,
                  }}>
                    <span style={{ fontSize: `${Math.max(7, Math.min(10, p.h / 7))}px`, fontWeight: 800, color: p.text, fontFamily: 'var(--fd)', writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', userSelect: 'none' as const, letterSpacing: '-0.02em' }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Collar */}
              {collarKg > 0 && (
                <div style={{ width: 14, height: 46, flexShrink: 0, zIndex: 2, background: 'linear-gradient(180deg,#d1d5db,#6b7280 35%,#374151 65%,#9ca3af)', border: '1.5px solid #374151', borderRadius: '0 4px 4px 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }} />
              )}
            </div>
          </div>

          {/* Plate list — per side */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase' as const }}>
              Po strani
            </div>
            {summary.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Samo šipka{collarKg > 0 ? ' i collari' : ''} — nema utega.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '7px', marginBottom: '14px' }}>
                {summary.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 11px', background: `${p.color}12`, border: `1px solid ${p.border}44`, borderRadius: '8px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, border: `1px solid ${p.border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0f0f5' }}>{p.count} × {p.label} kg</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', overflow: 'hidden' }}>
              {[
                { label: 'Šipka',   val: `${barKg} kg` },
                { label: 'Collari', val: collarKg > 0 ? `${+(collarKg * 2).toFixed(2)} kg` : '—' },
                { label: 'Utezi',   val: `${+(perSide * 2).toFixed(2)} kg` },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: '10px', background: '#09090f', textAlign: 'center' as const }}>
                  <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: COLOR }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Plate legend */}
      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
        <div style={{ fontSize: '0.54rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' as const }}>Dostupni utezi</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '5px' }}>
          {BL_PLATES.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: `${p.color}12`, border: `1px solid ${p.border}33`, borderRadius: '5px' }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: p.color, border: `1px solid ${p.border}` }} />
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>{p.label} kg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── HUB TAB COMPONENT ──────────────────────────────────────────
// ─── WATER LOG ──────────────────────────────────────────────────
type WaterSettings = { user_id: string; bw_kg: number | null; training_days: number | null; avg_training_min: number | null; goal_ml: number }
type WaterEntry    = { id: string; log_date: string; amount_ml: number; created_at: string }

function calcWaterGoal(bw: number, days: number, mins: number) {
  const base    = bw * 33
  const bonus   = (days * (mins / 60) * 500) / 7
  return Math.round((base + bonus) / 100) * 100
}

const WL_QUICK = [
  { ml: 200,  label: '0.2L', sub: 'Shot' },
  { ml: 300,  label: '0.3L', sub: 'Čaša' },
  { ml: 500,  label: '0.5L', sub: 'Boca' },
  { ml: 1000, label: '1L',   sub: 'Galon' },
]

function WaterIcon({ ml }: { ml: number }) {
  const C = '#38bdf8'
  const fill = `${C}20`
  if (ml <= 200) return ( // Shot glass — V shape
    <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
      <path d="M3 3 H23 L17 27 H9 Z" fill={fill} stroke={C} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9.5 27 H16.5" stroke={C} strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 11 H21" stroke={C} strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  )
  if (ml <= 300) return ( // Cup — straight with handle
    <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
      <path d="M4 4 H22 L20 26 H6 Z" fill={fill} stroke={C} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M20 10 Q26 10 26 16 Q26 22 20 22" fill="none" stroke={C} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 15 H20" stroke={C} strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  )
  if (ml <= 500) return ( // Bottle
    <svg width="22" height="34" viewBox="0 0 22 34" fill="none">
      <rect x="7" y="1" width="8" height="5" rx="2" fill={fill} stroke={C} strokeWidth="1.5"/>
      <path d="M4 6 Q4 10 4 12 L3 31 Q3 33 11 33 Q19 33 19 31 L18 12 Q18 10 18 6 Z" fill={fill} stroke={C} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M4.5 20 H17.5" stroke={C} strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  )
  return ( // Jug/gallon — wide bottle with handle
    <svg width="30" height="34" viewBox="0 0 30 34" fill="none">
      <rect x="8" y="1" width="9" height="5" rx="2" fill={fill} stroke={C} strokeWidth="1.5"/>
      <path d="M3 6 L3 31 Q3 33 13 33 Q23 33 23 31 L23 6 Z" fill={fill} stroke={C} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M23 12 Q29 12 29 18 Q29 24 23 24" fill="none" stroke={C} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 20 H22" stroke={C} strokeWidth="0.8" strokeOpacity="0.35"/>
    </svg>
  )
}

function WaterLog({ userId }: { userId: string }) {
  const COLOR = '#38bdf8'
  const [tab, setTab]               = useState<'log' | 'graph'>('log')
  const [settings, setSettings]     = useState<WaterSettings | null>(null)
  const [entries, setEntries]       = useState<WaterEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [customMl, setCustomMl]     = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [bwInput, setBwInput]       = useState('')
  const [daysInput, setDaysInput]   = useState('')
  const [minInput, setMinInput]     = useState('')
  const [goalInput, setGoalInput]   = useState('')
  const [saving, setSaving]         = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const load = async () => {
      const [{ data: sett }, { data: ents }] = await Promise.all([
        supabase.from('water_settings').select('*').eq('user_id', userId).single(),
        supabase.from('water_logs').select('*').eq('user_id', userId)
          .gte('log_date', (() => { const d = new Date(); d.setHours(0,0,0,0); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().split('T')[0] })())
          .order('created_at', { ascending: false }),
      ])
      if (sett) {
        const s = sett as WaterSettings
        setSettings(s)
        setBwInput(s.bw_kg?.toString() ?? '')
        setDaysInput(s.training_days?.toString() ?? '')
        setMinInput(s.avg_training_min?.toString() ?? '')
        setGoalInput(s.goal_ml?.toString() ?? '')
      } else {
        setShowSettings(true)
      }
      setEntries((ents ?? []) as WaterEntry[])
      setLoading(false)
    }
    load()
  }, [userId])

  const todayEntries = entries.filter(e => e.log_date === today)
  const todayMl      = todayEntries.reduce((s, e) => s + e.amount_ml, 0)
  const goalMl       = settings?.goal_ml ?? 2500
  const progress     = Math.min(todayMl / goalMl, 1)
  const remainL      = Math.max(0, (goalMl - todayMl) / 1000)

  const addWater = async (ml: number) => {
    const { data } = await supabase.from('water_logs')
      .insert({ user_id: userId, log_date: today, amount_ml: ml })
      .select('*').single()
    if (data) setEntries(prev => [data as WaterEntry, ...prev])
  }

  const removeEntry = async (id: string) => {
    await supabase.from('water_logs').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const saveSettings = async () => {
    setSaving(true)
    const bw   = parseFloat(bwInput) || null
    const days = parseInt(daysInput) || null
    const mins = parseInt(minInput) || null
    const autoGoal = bw && days && mins ? calcWaterGoal(bw, days, mins) : null
    const goal = parseInt(goalInput) || autoGoal || 2500
    const payload = { user_id: userId, bw_kg: bw, training_days: days, avg_training_min: mins, goal_ml: goal }
    const { data } = await supabase.from('water_settings')
      .upsert(payload, { onConflict: 'user_id' }).select('*').single()
    if (data) { setSettings(data as WaterSettings); setGoalInput(goal.toString()) }
    setSaving(false)
    setShowSettings(false)
  }

  // Mon–Sun of current week
  const weekMon = (() => {
    const d = new Date(); d.setHours(0,0,0,0)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d
  })()
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMon.getTime() + i * 86400000)
    const ds = d.toISOString().split('T')[0]
    const ml = entries.filter(e => e.log_date === ds).reduce((s, e) => s + e.amount_ml, 0)
    return { ds, label: d.toLocaleDateString('hr', { weekday: 'short' }), ml }
  })
  const maxBar = Math.max(goalMl, ...last7.map(d => d.ml), 1)

  // SVG ring
  const R = 52, CIRC = 2 * Math.PI * R
  const dashLen = CIRC * progress

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const, padding: '24px 0', fontSize: '0.8rem' }}>Učitavanje...</div>

  return (
    <div style={{ fontFamily: 'var(--fm)', display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '9px', padding: '3px' }}>
        {([['log', 'DNEVNI LOG'], ['graph', 'GRAF NAPRETKA']] as const).map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '7px', background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: '6px', color: tab === t ? '#f0f0f5' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--fm)', fontWeight: 600, letterSpacing: '0.08em', transition: 'all 0.15s' }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <>
          {/* Circular gauge */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '148px', height: '148px' }}>
              <svg viewBox="0 0 130 130" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
                <defs>
                  <filter id="wl-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                <circle cx="65" cy="65" r={R} fill="none" stroke={COLOR} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${dashLen} ${CIRC - dashLen}`}
                  filter="url(#wl-glow)"
                  style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: progress >= 1 ? '#4ade80' : COLOR, lineHeight: 1 }}>
                  {progress >= 1 ? '✓' : `${remainL.toFixed(1)}L`}
                </div>
                <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', marginTop: '3px' }}>
                  {progress >= 1 ? 'cilj postignut' : 'preostalo'}
                </div>
              </div>
            </div>

            {/* Cilj row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>CILJ</span>
              <span style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: '#f0f0f5' }}>{(goalMl / 1000).toFixed(1)}L</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>· popijeno {(todayMl / 1000).toFixed(2)}L</span>
            </div>
          </div>

          {/* Quick-add */}
          <div>
            <div style={{ fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontWeight: 600 }}>UNOS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '8px' }}>
              {WL_QUICK.map(({ ml, label, sub }) => (
                <button key={ml} onClick={() => addWater(ml)}
                  style={{ padding: '12px 6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '7px', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${COLOR}12`; e.currentTarget.style.borderColor = `${COLOR}44` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                  <WaterIcon ml={ml} />
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: COLOR, fontFamily: 'var(--fd)' }}>{label}</div>
                    <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" value={customMl} onChange={e => setCustomMl(e.target.value)}
                placeholder="Specifični unos (ml)" min={1} step={50}
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f0f5', padding: '9px 12px', fontFamily: 'var(--fm)', fontSize: '0.88rem', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.currentTarget.style.borderColor = COLOR}
                onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                onKeyDown={e => { if (e.key === 'Enter') { const ml = parseInt(customMl); if (ml > 0) { addWater(ml); setCustomMl('') } } }}
              />
              <button onClick={() => { const ml = parseInt(customMl); if (ml > 0) { addWater(ml); setCustomMl('') } }}
                style={{ padding: '9px 18px', background: COLOR, border: 'none', borderRadius: '8px', color: '#000', fontFamily: 'var(--fm)', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>
                +
              </button>
            </div>
          </div>

          {/* Today's log entries */}
          {todayEntries.length > 0 && (
            <div>
              <div style={{ fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', fontWeight: 600 }}>DANAS</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                {todayEntries.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR, flexShrink: 0, boxShadow: `0 0 5px ${COLOR}88` }} />
                    <span style={{ flex: 1, fontSize: '0.82rem', color: '#e0e0e0', fontFamily: 'var(--fd)', fontWeight: 600 }}>
                      {e.amount_ml >= 1000 ? `${(e.amount_ml / 1000).toFixed(1)}L` : `${e.amount_ml}ml`}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(e.created_at).toLocaleTimeString('hr', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={() => removeEntry(e.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', padding: '2px 4px', lineHeight: 1, transition: 'color 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.color = '#f87171'}
                      onMouseLeave={ev => ev.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
            <button onClick={() => setShowSettings(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.58rem', fontFamily: 'var(--fm)', letterSpacing: '0.15em', fontWeight: 600, padding: 0 }}>
              <ChevronDown size={12} style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              POSTAVKE & CILJ
            </button>
            {showSettings && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {([
                    { lbl: 'KILAZA (kg)', val: bwInput, set: setBwInput, ph: 'npr. 85' },
                    { lbl: 'TRENINZI/TJ', val: daysInput, set: setDaysInput, ph: 'npr. 4' },
                    { lbl: 'MIN/TRENING', val: minInput, set: setMinInput, ph: 'npr. 90' },
                  ] as const).map(({ lbl, val, set, ph }) => (
                    <div key={lbl}>
                      <div style={{ fontSize: '0.48rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '5px', fontWeight: 600 }}>{lbl}</div>
                      <input type="number" value={val} onChange={e => (set as any)(e.target.value)} placeholder={ph}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#f0f0f5', padding: '8px 10px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                        onFocus={e => e.currentTarget.style.borderColor = COLOR}
                        onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  ))}
                </div>
                {/* Auto goal preview */}
                {bwInput && daysInput && minInput && (() => {
                  const auto = calcWaterGoal(parseFloat(bwInput), parseInt(daysInput), parseInt(minInput))
                  return (
                    <div style={{ padding: '8px 12px', background: `${COLOR}08`, border: `1px solid ${COLOR}20`, borderRadius: '7px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                      Preporučeni cilj: <span style={{ color: COLOR, fontWeight: 700 }}>{(auto / 1000).toFixed(1)}L</span>
                      <button onClick={() => setGoalInput(String(auto))}
                        style={{ marginLeft: '8px', background: `${COLOR}18`, border: `1px solid ${COLOR}33`, borderRadius: '4px', color: COLOR, cursor: 'pointer', fontSize: '0.6rem', padding: '2px 7px', fontFamily: 'var(--fm)', fontWeight: 600 }}>
                        Koristi
                      </button>
                    </div>
                  )
                })()}
                {/* Manual goal */}
                <div>
                  <div style={{ fontSize: '0.48rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '5px', fontWeight: 600 }}>VLASTITI CILJ (ml)</div>
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="npr. 3000" step={100}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#f0f0f5', padding: '8px 10px', fontFamily: 'var(--fm)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const }}
                    onFocus={e => e.currentTarget.style.borderColor = COLOR}
                    onBlur={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
                <button onClick={saveSettings} disabled={saving}
                  style={{ padding: '10px', background: saving ? 'rgba(255,255,255,0.06)' : '#fff', border: 'none', borderRadius: '8px', color: saving ? '#555' : '#000', fontFamily: 'var(--fm)', fontSize: '0.72rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
                  {saving ? 'Snimanje...' : 'Spremi postavke'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
          <div style={{ fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>ZADNJIH 7 DANA</div>
          {/* Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', alignItems: 'flex-end', height: '140px' }}>
            {last7.map(({ ds, label, ml }) => {
              const pct = ml / maxBar
              const isToday = ds === today
              const reached = ml >= goalMl
              return (
                <div key={ds} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                  {/* Bar */}
                  <div style={{ width: '100%', position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                    {/* Goal line */}
                    <div style={{ position: 'absolute', bottom: `${(goalMl / maxBar) * 100}%`, left: 0, right: 0, borderTop: `1px dashed ${COLOR}33`, zIndex: 1 }} />
                    <div style={{ width: '100%', height: `${Math.max(pct * 100, 3)}%`, background: reached ? '#4ade8044' : `${COLOR}30`, border: `1px solid ${reached ? '#4ade80' : COLOR}${isToday ? 'cc' : '55'}`, borderRadius: '5px 5px 3px 3px', transition: 'height 0.4s ease', boxShadow: isToday ? `0 0 10px ${COLOR}44` : 'none' }} />
                  </div>
                  {/* ml label */}
                  <div style={{ fontSize: '0.52rem', color: ml > 0 ? (reached ? '#4ade80' : COLOR) : 'rgba(255,255,255,0.2)', fontFamily: 'var(--fd)', fontWeight: 700 }}>
                    {ml > 0 ? (ml >= 1000 ? `${(ml/1000).toFixed(1)}L` : `${ml}`) : '—'}
                  </div>
                  {/* Day label */}
                  <div style={{ fontSize: '0.55rem', color: isToday ? '#f0f0f5' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontWeight: isToday ? 700 : 400 }}>
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ width: 20, borderTop: `1px dashed ${COLOR}66` }} /> Cilj ({(goalMl/1000).toFixed(1)}L)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ width: 10, height: 10, background: '#4ade8044', border: '1px solid #4ade80', borderRadius: 2 }} /> Cilj postignut
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HUB TOOLS ──────────────────────────────────────────────────
const HUB_TOOLS = [
  { id:'rpe',        label:'RPE Kalkulator',     sub:'Izračun 1RM i preporučene težine', color:'#f59e0b', badge:'CALC',  group:'calc'  },
  { id:'gl',         label:'GL Points',           sub:'IPF Goodlift formula',             color:'#6b8cff', badge:'CALC',  group:'calc'  },
  { id:'watercut',   label:'Water Cut',           sub:'Plan hidratacije i rezanja',       color:'#22c55e', badge:'CALC',  group:'calc'  },
  { id:'barloader',  label:'Bar Loader',          sub:'Vizualni prikaz utega na šipci',   color:'#60a5fa', badge:'CALC',  group:'calc'  },
  { id:'guide-wc',   label:'Water Cut Guide',     sub:'Protokol dehidracije',             color:'#34d399', badge:'GUIDE', group:'guide', upcoming: true },
  { id:'guide-rpe',  label:'RPE Guide',           sub:'Kako koristiti RPE',               color:'#fbbf24', badge:'GUIDE', group:'guide', upcoming: true },
  { id:'guide-peak', label:'Peaking Guide',       sub:'Priprema za natjecanje',           color:'#a78bfa', badge:'GUIDE', group:'guide', upcoming: true },
  { id:'progress',   label:'Graf napretka',       sub:'Kilaze kroz blokove po liftu',     color:'#22d3ee', badge:'GRAF',  group:'log'   },
  { id:'weight',     label:'Tjelesna kilaza',     sub:'Unos i praćenje kilaze kroz dane', color:'#f472b6', badge:'LOG',   group:'log'   },
  { id:'hydration',  label:'Log Vode',            sub:'Dnevni unos i cilj hidratacije',   color:'#38bdf8', badge:'LOG',   group:'log'   },
  { id:'nutrition',  label:'Prehrana & Kalorije', sub:'TDEE, makrosi i dnevni log',       color:'#f97316', badge:'LOG',   group:'log'   },
]

const HUB_GROUPS = [
  { key: 'calc',  title: 'Kalkulatori', color: '#60a5fa', icon: <Calculator size={13} strokeWidth={2.2} /> },
  { key: 'guide', title: 'Vodiči',      color: '#34d399', icon: <BookOpen   size={13} strokeWidth={2.2} /> },
  { key: 'log',   title: 'Logiranje',   color: '#a78bfa', icon: <BarChart2  size={13} strokeWidth={2.2} /> },
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
  actual_reps: string | null
  exercise_name: string
  block_name: string
  week_number: number
  priority: 'primary' | 'secondary' | 'other'
}

const REP_RANGES = [
  { label: 'Sve', min: 0, max: 999 },
  { label: '1', min: 1, max: 1 },
  { label: '2-3', min: 2, max: 3 },
  { label: '4-6', min: 4, max: 6 },
  { label: '7-10', min: 7, max: 10 },
  { label: '10+', min: 11, max: 999 },
]

function parseReps(s: string | null): number {
  if (!s) return 0
  const m = s.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

const GRAPH_COLORS = ['#22d3ee', '#f59e0b', '#f472b6', '#a78bfa', '#22c55e', '#f87171']

function ProgressGraph({ userId }: { userId: string }) {
  const [rows, setRows]           = useState<ProgressRow[]>([])
  const [exercises, setExercises] = useState<string[]>([])
  const [primaryLift, setPrimary] = useState('')
  const [secondaryLift, setSecondary] = useState('')
  const [repRange, setRepRange]   = useState(0) // index into REP_RANGES
  const [loading, setLoading]     = useState(true)
  const [hovered, setHovered]     = useState<{lift:string;idx:number}|null>(null)

  const COLOR = '#22d3ee'

  useEffect(() => {
    const load = async () => {
      // Get all blocks → weeks → workouts → workout_exercises with exercise name and dates
      const [blocksRes, allExRes] = await Promise.all([
        supabase
          .from('blocks')
          .select('id, name, weeks(week_number, workouts(workout_date, workout_exercises(actual_weight_kg, actual_rpe, actual_reps, exercise:exercises(name))))')
          .eq('athlete_id', userId)
          .order('created_at', { ascending: true }),
        supabase.from('exercises').select('name').order('name'),
      ])

      const allRows: ProgressRow[] = []
      const loggedExSet = new Set<string>()

      for (const block of ((blocksRes.data ?? []) as any[])) {
        for (const week of (block.weeks ?? []) as any[]) {
          for (const workout of (week.workouts ?? []) as any[]) {
            for (const we of (workout.workout_exercises ?? []) as any[]) {
              if (!we.actual_weight_kg || !we.exercise?.name) continue
              loggedExSet.add(we.exercise.name)
              allRows.push({
                date: workout.workout_date,
                weight_kg: we.actual_weight_kg,
                actual_rpe: we.actual_rpe,
                actual_reps: we.actual_reps,
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
      // All exercises from DB, with logged ones listed first
      const allEx = (allExRes.data ?? []).map((e: any) => e.name as string)
      const seen = new Set<string>()
      const loggedFirst = [...Array.from(loggedExSet).sort(), ...allEx.filter(e => !loggedExSet.has(e))].filter(e => { if (seen.has(e)) return false; seen.add(e); return true })
      setExercises(loggedFirst)
      const logged = Array.from(loggedExSet).sort()
      if (logged.length > 0) setPrimary(logged[0])
      if (logged.length > 1) setSecondary(logged[1])
      setLoading(false)
    }
    load()
  }, [userId])

  function filterRows(lift: string) {
    const range = REP_RANGES[repRange]
    return rows.filter(r =>
      r.exercise_name === lift &&
      (range.min === 0 || (r.actual_reps !== null && parseReps(r.actual_reps) >= range.min && parseReps(r.actual_reps) <= range.max))
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
            <g key={i}>
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
                    {p.actual_reps && <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>×{p.actual_reps} rep</div>}
                    <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>{p.block_name} · W{p.week_number} · {p.date}</div>
                  </div>
                </foreignObject>
              )}
            </g>
          ))}
          {/* Block name labels on x-axis */}
          {blockLabels.map((bl, i) => (
            <text key={i} x={bl.x + 4} y={H - 3} fontSize="7" fill="rgba(255,255,255,0.18)" fontFamily="var(--fm)">{bl.name.slice(0, 14)}</text>
          ))}
        </svg>
      </div>
    )
  }

  // Custom exercise dropdown
  function ExSelect({ value, onChange, color, label }: { value: string; onChange: (v: string) => void; color: string; label: string }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const filtered = query ? exercises.filter(e => e.toLowerCase().includes(query.toLowerCase())) : exercises
    useEffect(() => {
      if (!open) return
      const handler = (e: MouseEvent) => {
        const t = e.target as Element
        if (!t.closest('.exsel-wrap')) setOpen(false)
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [open])
    return (
      <div>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color, fontFamily: 'var(--fm)', marginBottom: '6px', fontWeight: 700 }}>{label}</div>
        <div className="exsel-wrap" style={{ position: 'relative' }}>
          <button onClick={() => { setOpen(o => !o); setQuery('') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 12px', background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${open ? color : color + '44'}`, borderRadius: '9px', color: value ? '#f0f0f5' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s', boxShadow: open ? `0 0 0 3px ${color}14` : 'none' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{value || '— bez odabira —'}</span>
            <ChevronDown size={13} color={color} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
          </button>
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, background: '#0d0d17', border: `1px solid ${color}33`, borderRadius: '10px', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', zIndex: 400, overflow: 'hidden', animation: 'dropDown 0.15s ease' }}>
              <div style={{ padding: '8px' }}>
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Pretraži..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}22`, borderRadius: '7px', color: '#e0e0e0', padding: '7px 10px', fontFamily: 'var(--fm)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto' as const }}>
                <button onClick={() => { onChange(''); setOpen(false) }}
                  style={{ width: '100%', padding: '8px 14px', background: !value ? `${color}10` : 'transparent', border: 'none', color: !value ? color : 'rgba(255,255,255,0.35)', cursor: 'pointer', textAlign: 'left' as const, fontSize: '0.8rem', fontFamily: 'var(--fm)', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent' }}>
                  — bez odabira —
                </button>
                {filtered.map(ex => (
                  <button key={ex} onClick={() => { onChange(ex); setOpen(false) }}
                    style={{ width: '100%', padding: '8px 14px', background: ex === value ? `${color}10` : 'transparent', border: 'none', color: ex === value ? color : 'rgba(255,255,255,0.7)', cursor: 'pointer', textAlign: 'left' as const, fontSize: '0.82rem', fontFamily: 'var(--fm)', transition: 'background 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onMouseEnter={e => { if (ex !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (ex !== value) e.currentTarget.style.background = 'transparent' }}>
                    {ex}
                    {ex === value && <Check size={11} color={color} />}
                  </button>
                ))}
                {filtered.length === 0 && <div style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nema rezultata</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '20px 0', textAlign: 'center' as const }}>UČITAVANJE...</div>
  if (exercises.length === 0) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '20px 0', textAlign: 'center' as const }}>Nema ulogiranih kilaža u treninzima.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <ExSelect value={primaryLift} onChange={setPrimary} color={COLOR} label="PRVI LIFT" />
        <ExSelect value={secondaryLift} onChange={setSecondary} color="#f59e0b" label="DRUGI LIFT" />
      </div>

      {/* Reps filter */}
      <div>
        <div style={{ fontSize: '0.52rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--fm)', marginBottom: '6px' }}>FILTER PO PONAVLJANJIMA</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
          {REP_RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRepRange(i)}
              style={{ padding: '5px 12px', background: repRange === i ? `${COLOR}18` : 'transparent', border: `1px solid ${repRange === i ? COLOR : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: repRange === i ? COLOR : '#555', cursor: 'pointer', fontSize: '0.62rem', fontFamily: 'var(--fm)', transition: 'all 0.15s' }}>
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

// ─── NUTRITION TRACKER ──────────────────────────────────────────
type NutritionSettings = {
  weight_kg: number; height_cm: number; age: number
  sex: 'male'|'female'; activity_level: string; refeed_kcal: number | null
}
type NutritionLog = {
  id: string; date: string; day_type: 'heavy'|'light'|'rest'|'refeed'
  calories: number|null; protein_g: number|null; carbs_g: number|null
  fat_g: number|null; body_weight: number|null; steps: number|null; notes: string|null
}

const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label: 'Sjedilački',        mult: 1.2   },
  { id: 'light',       label: 'Lagano aktivan',    mult: 1.375 },
  { id: 'moderate',    label: 'Umjereno aktivan',  mult: 1.55  },
  { id: 'active',      label: 'Aktivan',            mult: 1.725 },
  { id: 'very_active', label: 'Vrlo aktivan',       mult: 1.9   },
]

const DAY_TYPES: { id: 'heavy'|'light'|'rest'|'refeed'; label: string; color: string; kcalMult: number; stepsMin: number; stepsMax: number }[] = [
  { id: 'heavy',  label: 'Težak dan',  color: '#f59e0b', kcalMult: 1.12, stepsMin: 6000,  stepsMax: 8000  },
  { id: 'light',  label: 'Lagan dan',  color: '#6b8cff', kcalMult: 1.00, stepsMin: 8000,  stepsMax: 10000 },
  { id: 'rest',   label: 'Dan odmora', color: '#22c55e', kcalMult: 0.85, stepsMin: 8000,  stepsMax: 10000 },
  { id: 'refeed', label: 'Refeed dan', color: '#a78bfa', kcalMult: 1.25, stepsMin: 6000,  stepsMax: 8000  },
]

function calcBMR(s: NutritionSettings) {
  // Mifflin-St Jeor
  const base = 10 * s.weight_kg + 6.25 * s.height_cm - 5 * s.age
  return s.sex === 'male' ? base + 5 : base - 161
}

function calcTDEE(s: NutritionSettings) {
  const mult = ACTIVITY_LEVELS.find(a => a.id === s.activity_level)?.mult ?? 1.55
  return Math.round(calcBMR(s) * mult)
}

function calcMacros(kcal: number, weightKg: number) {
  const protein = Math.round(weightKg * 2.2)
  const fat     = Math.round((kcal * 0.25) / 9)
  const carbs   = Math.round((kcal - protein * 4 - fat * 9) / 4)
  return { protein, fat, carbs }
}

// ─── WEIGHT CHART ─────────────────────────────────────────────────
const CHART_W = 320
const CHART_H = 140

function smoothPath(svgPts: [number, number][]) {
  if (svgPts.length === 1) return `M ${svgPts[0][0]},${svgPts[0][1]}`
  let d = `M ${svgPts[0][0]},${svgPts[0][1]}`
  for (let i = 1; i < svgPts.length; i++) {
    const cpx = (svgPts[i - 1][0] + svgPts[i][0]) / 2
    d += ` C ${cpx},${svgPts[i - 1][1]} ${cpx},${svgPts[i][1]} ${svgPts[i][0]},${svgPts[i][1]}`
  }
  return d
}

function WeightChart({ pts, toSvgX, toSvgY, minW, maxW, baselineKg }: {
  pts: { id: string; date: string; weight_kg: number }[]
  toSvgX: (i: number) => number
  toSvgY: (w: number) => number
  minW: number; maxW: number
  baselineKg?: number | null
}) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  if (pts.length < 1) return null

  const W = CHART_W; const H = CHART_H
  const last   = pts[pts.length - 1].weight_kg
  const base   = baselineKg ?? pts[0].weight_kg
  const diff   = +(last - base).toFixed(1)
  const isDown = diff <= 0

  const svgPts: [number, number][] = pts.map((p, i) => [toSvgX(i), toSvgY(p.weight_kg)])
  const pathD = smoothPath(svgPts)
  const areaD = `${pathD} L ${svgPts[svgPts.length - 1][0]},${H} L ${svgPts[0][0]},${H} Z`

  // Round 10kg ticks, clamped to visible chart range
  const yTicks: { y: number; val: number }[] = []
  const tickStep = 10
  const tickMin = Math.ceil(minW / tickStep) * tickStep
  const tickMax = Math.floor(maxW / tickStep) * tickStep
  for (let v = tickMin; v <= tickMax; v += tickStep) {
    const sy = toSvgY(v)
    if (sy >= 2 && sy <= H - 2) yTicks.push({ y: sy, val: v })
  }

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return
    const touch = e.touches[0]
    const rect = svgRef.current.getBoundingClientRect()
    const relX = ((touch.clientX - rect.left) / rect.width) * W
    let closest = 0; let minDist = Infinity
    svgPts.forEach(([x], i) => { const d = Math.abs(x - relX); if (d < minDist) { minDist = d; closest = i } })
    setHovered(closest)
  }

  const hov  = hovered !== null ? pts[hovered] : null
  const hovX = hovered !== null ? toSvgX(hovered) : 0
  const hovY = hovered !== null ? toSvgY(pts[hovered].weight_kg) : 0

  return (
    <div style={{ animation: mounted ? 'wChartIn 0.5s cubic-bezier(0.16,1,0.3,1) both' : 'none', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', background: 'linear-gradient(160deg, rgba(20,10,28,0.98) 0%, rgba(8,8,14,0.98) 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

      {/* Stats bar — row 1 */}
      <div className="wstats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="wstats-cell" style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
          <div className="wstats-label" style={{ fontSize: '0.38rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' as const, textAlign: 'center' as const }}>Trenutna kilaza</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textAlign: 'center' as const }}>
            {last}<span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)', marginLeft: '3px', fontFamily: 'var(--fm)', fontWeight: 400 }}>kg</span>
          </div>
        </div>
        <div className="wstats-div" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="wstats-cell" style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
          <div className="wstats-label" style={{ fontSize: '0.38rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' as const, textAlign: 'center' as const }}>Broj unosa</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: '#f472b6', textAlign: 'center' as const }}>
            {pts.length}
          </div>
        </div>
      </div>

      {/* Stats bar — row 2: Promjena */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: diff === 0 ? 'transparent' : isDown ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)' }}>
        <div style={{ fontSize: '0.38rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--fm)', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase' as const }}>Promjena</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: diff === 0 ? 'rgba(255,255,255,0.25)' : isDown ? '#4ade80' : '#f87171' }}>
          {diff > 0 ? '+' : ''}{diff}<span style={{ fontSize: '0.65rem', marginLeft: '3px', fontFamily: 'var(--fm)', fontWeight: 400, opacity: 0.6 }}>kg</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '20px 0 0', position: 'relative' as const }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H + 4}`} style={{ display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={handleTouch} onTouchMove={handleTouch}
          onTouchEnd={() => setTimeout(() => setHovered(null), 1500)}>
          <defs>
            <linearGradient id="wAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#f472b6" stopOpacity="0.22" />
              <stop offset="65%" stopColor="#f472b6" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
            </linearGradient>
            <filter id="wGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <clipPath id="wClip">
              <rect x="0" y="0" width={W} height={H + 4}
                style={{ animation: mounted ? 'wClipIn 1.3s cubic-bezier(0.16,1,0.3,1) both' : 'none' }} />
            </clipPath>
          </defs>

          {yTicks.map(t => (
            <g key={t.val}>
              <line x1="0" y1={t.y} x2={W} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,6" />
              <text x={W - 4} y={t.y - 3} textAnchor="end"
                fill="rgba(255,255,255,0.2)" fontSize="8" fontWeight="600"
                style={{ fontFamily: 'var(--fm)', pointerEvents: 'none' }}>
                {t.val}
              </text>
            </g>
          ))}

          <g clipPath="url(#wClip)">
            <path d={areaD} fill="url(#wAreaGrad)" />
            <path d={pathD} fill="none" stroke="#f472b6" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.12" filter="url(#wGlow)" />
            <path d={pathD} fill="none" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
          </g>

          {pts.map((_, i) => {
            const x0 = i === 0 ? 0 : (toSvgX(i - 1) + toSvgX(i)) / 2
            const x1 = i === pts.length - 1 ? W : (toSvgX(i) + toSvgX(i + 1)) / 2
            return (
              <rect key={i} x={x0} y={0} width={x1 - x0} height={H}
                fill="transparent" onMouseEnter={() => setHovered(i)} style={{ cursor: 'crosshair' }} />
            )
          })}

          {hovered !== null && (
            <g style={{ animation: 'wDotIn 0.12s ease both' }}>
              <line x1={hovX} y1={0} x2={hovX} y2={H} stroke="rgba(244,114,182,0.18)" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={hovX} cy={hovY} r="8" fill="rgba(244,114,182,0.1)" />
              <circle cx={hovX} cy={hovY} r="4.5" fill="#140a1c" stroke="#f472b6" strokeWidth="2" />
              <circle cx={hovX} cy={hovY} r="2" fill="#f472b6" />
            </g>
          )}

          {pts.length >= 1 && hovered === null && (
            <g style={{ animation: mounted ? 'wDotIn 0.4s 1.2s ease both' : 'none', opacity: mounted ? 1 : 0 }}>
              <circle cx={toSvgX(pts.length - 1)} cy={toSvgY(last)} r="6" fill="rgba(244,114,182,0.15)" />
              <circle cx={toSvgX(pts.length - 1)} cy={toSvgY(last)} r="4" fill="#140a1c" stroke="#f472b6" strokeWidth="2" />
              <circle cx={toSvgX(pts.length - 1)} cy={toSvgY(last)} r="1.5" fill="#f472b6" />
            </g>
          )}
        </svg>

        {hov && (
          <div style={{
            position: 'absolute' as const,
            top: '6px',
            left: `clamp(55px, calc(${(hovX / W) * 100}%), calc(100% - 65px))`,
            transform: 'translateX(-50%)',
            background: 'rgba(20,10,28,0.97)',
            border: '1px solid rgba(244,114,182,0.3)',
            borderRadius: '10px',
            padding: '8px 13px',
            pointerEvents: 'none' as const,
            animation: 'wDotIn 0.1s ease both',
            zIndex: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f472b6', fontFamily: 'var(--fd)', whiteSpace: 'nowrap' as const }}>
              {hov.weight_kg} <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>kg</span>
            </div>
            <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--fm)', marginTop: '3px', whiteSpace: 'nowrap' as const }}>
              {new Date(hov.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: '2-digit' })}
            </div>
          </div>
        )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '6px' }}>
        <span style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--fm)', letterSpacing: '0.08em' }}>
          {new Date(pts[0].date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span style={{ fontSize: '0.44rem', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--fm)', letterSpacing: '0.08em' }}>
          {new Date(pts[pts.length - 1].date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <style>{`
        @keyframes wChartIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes wClipIn  { from { width:0 } to { width:${W}px } }
        @keyframes wDotIn   { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
        @media (max-width: 420px) {
          .wstats-grid { grid-template-columns: 1fr 1px 1fr !important; grid-template-rows: auto auto; }
          .wstats-grid > .wstats-cell:nth-child(5) { grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.06); }
          .wstats-grid > .wstats-div:nth-child(4) { display: none; }
          .wstats-label { font-size: 0.42rem !important; letter-spacing: 0.1em !important; }
        }
      `}</style>
    </div>
  )
}

// ─── WEIGHT TRACKER ──────────────────────────────────────────────
type WeightEntry = { id: string; date: string; weight_kg: number; is_weight_baseline?: boolean }

function WeightTracker({ userId }: { userId: string }) {
  const COLOR = '#f472b6'
  const [entries, setEntries]         = useState<WeightEntry[]>([])
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [kg, setKg]                   = useState('')
  const [saving, setSaving]           = useState(false)
  const [loading, setLoading]         = useState(true)
  const [confirmId, setConfirmId]     = useState<string | null>(null)  // entry pending baseline confirm

  useEffect(() => {
    supabase.from('pr_logs')
      .select('id, date, weight_kg, is_weight_baseline')
      .eq('athlete_id', userId)
      .eq('lift', 'other').eq('notes', 'Tjelesna težina')
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data }) => { setEntries((data ?? []) as WeightEntry[]); setLoading(false) })
  }, [userId])

  const baselineEntry = entries.find(e => e.is_weight_baseline)
  const baselineKg    = baselineEntry?.weight_kg ?? null

  const confirmSetBaseline = async () => {
    if (!confirmId) return
    // Clear old baseline, set new one
    await supabase.from('pr_logs')
      .update({ is_weight_baseline: false })
      .eq('athlete_id', userId).eq('is_weight_baseline', true)
    await supabase.from('pr_logs')
      .update({ is_weight_baseline: true })
      .eq('id', confirmId)
    setEntries(prev => prev.map(e => ({ ...e, is_weight_baseline: e.id === confirmId })))
    setConfirmId(null)
  }

  const save = async () => {
    if (!kg || !date) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const authId = user?.id
    if (!authId) { setSaving(false); return }
    const { data, error } = await supabase.from('pr_logs').insert({
      athlete_id: authId, lift: 'other', reps: 0,
      weight_kg: parseFloat(kg), date, source: 'manual', notes: 'Tjelesna težina',
    }).select('id, date, weight_kg, is_weight_baseline').single()
    if (error) console.error('pr_logs insert error:', error.message)
    if (data) setEntries(prev => [data as WeightEntry, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    setKg(''); setSaving(false)
  }

  const remove = async (id: string) => {
    await supabase.from('pr_logs').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const pts  = [...entries].reverse()
  const minW = pts.length ? Math.min(...pts.map(p => p.weight_kg)) - 0.5 : 0
  const maxW = pts.length ? Math.max(...pts.map(p => p.weight_kg)) + 0.5 : 100
  const toSvgX = (i: number) => pts.length < 2 ? CHART_W / 2 : Math.round((i / (pts.length - 1)) * CHART_W)
  const toSvgY = (w: number) => {
    const range = maxW - minW || 1
    return Math.round(CHART_H - 10 - ((w - minW) / range) * (CHART_H - 20))
  }

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '24px 0', textAlign: 'center' as const }}>Učitavanje...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>

      {/* Confirm dialog */}
      {confirmId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#13131e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '28px 28px 24px', maxWidth: '340px', width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f0f0f5', fontFamily: 'var(--fm)', marginBottom: '10px' }}>Promijeni baznu kilažu?</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--fm)', lineHeight: 1.6, marginBottom: '22px' }}>
              Promjena se računata od ovog unosa. Stari referentni unos briše se.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmId(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.74rem', fontFamily: 'var(--fm)', fontWeight: 600 }}>
                Odustani
              </button>
              <button onClick={confirmSetBaseline}
                style={{ flex: 1, padding: '10px', background: COLOR, border: 'none', borderRadius: '9px', color: '#000', cursor: 'pointer', fontSize: '0.74rem', fontFamily: 'var(--fm)', fontWeight: 700 }}>
                Da, postavi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {pts.length >= 1 && <WeightChart pts={pts} toSvgX={toSvgX} toSvgY={toSvgY} minW={minW} maxW={maxW} baselineKg={baselineKg} />}

      {/* Input form */}
      <SectionTitle>Novi unos</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <CalcInput label="Datum" color={COLOR} type="date" value={date} onChange={setDate} max="2100-01-01" />
        <CalcInput label="Kilaza (kg)" color={COLOR} step="0.1" value={kg} onChange={setKg} placeholder="npr. 82.5" />
      </div>
      <button onClick={save} disabled={saving || !kg}
        style={{ padding: '11px 28px', background: `${COLOR}18`, border: `1.5px solid ${COLOR}44`, borderRadius: '10px', cursor: kg ? 'pointer' : 'not-allowed', color: kg ? COLOR : 'rgba(255,255,255,0.2)', fontSize: '0.78rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.05em', width: 'fit-content', transition: 'all 0.2s', opacity: kg ? 1 : 0.5 }}>
        {saving ? 'Sprema...' : '+ Dodaj unos'}
      </button>

      {/* History */}
      {entries.length > 0 && (
        <>
          <SectionTitle>Povijest ({entries.length} unosa)</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
            {entries.map(e => {
              const isBase = !!e.is_weight_baseline
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: isBase ? `${COLOR}0a` : 'rgba(255,255,255,0.02)', border: `1px solid ${isBase ? COLOR + '33' : 'rgba(255,255,255,0.06)'}`, borderRadius: '9px', transition: 'all 0.2s' }}>
                  {/* Baseline toggle */}
                  <button
                    title={isBase ? 'Ovo je referentna kilaza' : 'Postavi kao referentnu kilazu'}
                    onClick={() => !isBase && setConfirmId(e.id)}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', border: `1.5px solid ${isBase ? COLOR : 'rgba(255,255,255,0.18)'}`, background: isBase ? COLOR : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isBase ? 'default' : 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                    onMouseEnter={e2 => { if (!isBase) e2.currentTarget.style.borderColor = COLOR }}
                    onMouseLeave={e2 => { if (!isBase) e2.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}>
                    {isBase && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--fm)', minWidth: '84px' }}>{e.date}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: COLOR, fontFamily: 'var(--fd)', flex: 1 }}>
                    {e.weight_kg} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: `${COLOR}88` }}>kg</span>
                  </span>
                  {isBase && <span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', color: COLOR, fontFamily: 'var(--fm)', fontWeight: 700 }}>REFERENCA</span>}
                  <button onClick={() => remove(e.id)}
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,80,80,0.35)', cursor: 'pointer', fontSize: '0.7rem', padding: '4px 6px', borderRadius: '5px', transition: 'all 0.15s', fontFamily: 'var(--fm)' }}
                    onMouseEnter={e2 => (e2.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e2 => (e2.currentTarget.style.color = 'rgba(255,80,80,0.35)')}>
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function NutritionTracker({ userId }: { userId: string }) {
  const COLOR = '#f97316'
  const [tab, setTab] = useState<'settings'|'plan'|'log'>('settings')
  const [settings, setSettings] = useState<NutritionSettings>({
    weight_kg: 80, height_cm: 178, age: 25, sex: 'male', activity_level: 'moderate', refeed_kcal: null
  })
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logDraft, setLogDraft] = useState<Partial<NutritionLog>>({ day_type: 'heavy' })
  const [saving, setSaving] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [refeedInput, setRefeedInput] = useState('')

  // Load settings + logs
  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('nutrition_settings').select('*').eq('user_id', userId).maybeSingle()
      if (s) {
        setSettings({ weight_kg: s.weight_kg, height_cm: s.height_cm, age: s.age, sex: s.sex, activity_level: s.activity_level, refeed_kcal: s.refeed_kcal })
        setRefeedInput(s.refeed_kcal ? String(s.refeed_kcal) : '')
      }
      const { data: l } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30)
      setLogs((l ?? []) as NutritionLog[])
      setLoadingSettings(false)
    }
    load()
  }, [userId])

  // When date changes, preload existing log
  useEffect(() => {
    const existing = logs.find(l => l.date === logDate)
    if (existing) setLogDraft(existing)
    else setLogDraft({ day_type: 'heavy' })
  }, [logDate, logs])

  const saveSettings = async () => {
    setSaving(true)
    const data = { ...settings, refeed_kcal: refeedInput ? parseInt(refeedInput) : null, user_id: userId }
    await supabase.from('nutrition_settings').upsert(data, { onConflict: 'user_id' })
    setSettings(prev => ({ ...prev, refeed_kcal: data.refeed_kcal }))
    setSaving(false); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000)
  }

  const saveLog = async () => {
    if (!logDate) return; setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, user_id: _uid, date: _d, ...rest } = logDraft as Partial<NutritionLog> & { user_id?: string }
    const data = { user_id: userId, date: logDate, ...rest }
    const { data: upserted } = await supabase
      .from('nutrition_logs')
      .upsert(data, { onConflict: 'user_id,date' })
      .select('*').single()
    if (upserted) {
      setLogs(prev => {
        const exists = prev.some(l => l.date === logDate)
        return exists
          ? prev.map(l => l.date === logDate ? upserted as NutritionLog : l)
          : [upserted as NutritionLog, ...prev]
      })
    }
    setSaving(false)
  }

  const tdee = calcTDEE(settings)
  const bmr  = Math.round(calcBMR(settings))

  const inp = (label: string, key: keyof NutritionSettings, max: string, step = '1') => (
    <CalcInput label={label} color={COLOR} step={step} max={max}
      value={String(settings[key] ?? '')}
      onChange={v => setSettings(s => ({ ...s, [key]: parseFloat(v) || 0 }))} />
  )

  if (loadingSettings) return <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '24px 0', textAlign: 'center' as const }}>Učitavanje...</div>

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', padding: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
        {(['settings','plan','log'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', background: tab === t ? `${COLOR}18` : 'transparent', border: tab === t ? `1px solid ${COLOR}40` : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: tab === t ? 700 : 400, color: tab === t ? COLOR : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
            {t === 'settings' ? 'Podešavanja' : t === 'plan' ? 'Plan kalorija' : 'Dnevni log'}
          </button>
        ))}
      </div>

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px' }}>
          <SectionTitle>Osobni podaci</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '12px' }}>
            {inp('Tjelesna masa (kg)', 'weight_kg', '300', '0.5')}
            {inp('Visina (cm)', 'height_cm', '250')}
            {inp('Godine', 'age', '100')}
          </div>

          {/* Sex */}
          <div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '8px', fontWeight: 600 }}>SPOL</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['male','female'] as const).map(s => (
                <button key={s} onClick={() => setSettings(prev => ({ ...prev, sex: s }))}
                  style={{ padding: '8px 20px', background: settings.sex === s ? `${COLOR}18` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${settings.sex === s ? COLOR+'55' : 'rgba(255,255,255,0.1)'}`, borderRadius: '9px', cursor: 'pointer', color: settings.sex === s ? COLOR : 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontFamily: 'var(--fm)', fontWeight: settings.sex === s ? 700 : 400, transition: 'all 0.2s' }}>
                  {s === 'male' ? 'Muški' : 'Ženski'}
                </button>
              ))}
            </div>
          </div>

          {/* Activity level */}
          <div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '8px', fontWeight: 600 }}>RAZINA AKTIVNOSTI</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.id} onClick={() => setSettings(prev => ({ ...prev, activity_level: a.id }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: settings.activity_level === a.id ? `${COLOR}10` : 'rgba(255,255,255,0.02)', border: `1.5px solid ${settings.activity_level === a.id ? COLOR+'40' : 'rgba(255,255,255,0.07)'}`, borderRadius: '9px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
                  <span style={{ fontSize: '0.82rem', color: settings.activity_level === a.id ? COLOR : 'rgba(255,255,255,0.6)', fontFamily: 'var(--fm)', fontWeight: settings.activity_level === a.id ? 600 : 400 }}>{a.label}</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--fm)' }}>×{a.mult}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Refeed kcal — coach sets */}
          <div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '8px', fontWeight: 600 }}>REFEED KALORIJE (postavlja trener)</div>
            <CalcInput label="kcal za refeed dan" color='#a78bfa' value={refeedInput} onChange={setRefeedInput} placeholder="npr. 3200" />
          </div>

          <button onClick={saveSettings} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 28px', background: settingsSaved ? 'rgba(34,197,94,0.15)' : `${COLOR}18`, border: `1.5px solid ${settingsSaved ? '#22c55e66' : COLOR+'44'}`, borderRadius: '10px', cursor: 'pointer', color: settingsSaved ? '#22c55e' : COLOR, fontSize: '0.78rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.05em', transition: 'all 0.2s', width: 'fit-content' }}>
            {saving ? 'Sprema...' : settingsSaved ? '✓ Spremljeno' : 'Spremi podešavanja'}
          </button>
        </div>
      )}

      {/* ── PLAN TAB ── */}
      {tab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
          {/* TDEE summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '10px' }}>
            <ResultCard label="BMR" value={bmr} unit="kcal" color="#888" sub="Bazalni metabolizam" />
            <ResultCard label="Održavanje (TDEE)" value={tdee} unit="kcal" color={COLOR} sub={`Faktor: ×${ACTIVITY_LEVELS.find(a => a.id === settings.activity_level)?.mult}`} />
          </div>

          {/* Day schemes */}
          <SectionTitle>Shema po tipu dana</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
            {DAY_TYPES.map(dt => {
              const kcal = dt.id === 'refeed'
                ? (settings.refeed_kcal ?? Math.round(tdee * dt.kcalMult))
                : Math.round(tdee * dt.kcalMult)
              const { protein, fat, carbs } = calcMacros(kcal, settings.weight_kg)
              const isRefeed = dt.id === 'refeed'
              return (
                <div key={dt.id} style={{ padding: '16px 20px', background: `${dt.color}08`, border: `1.5px solid ${dt.color}28`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap' as const, gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dt.color, boxShadow: `0 0 6px ${dt.color}` }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: dt.color, fontFamily: 'var(--fm)' }}>{dt.label}</span>
                      {isRefeed && !settings.refeed_kcal && <span style={{ fontSize: '0.55rem', color: '#a78bfa88', fontFamily: 'var(--fm)', background: '#a78bfa14', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a78bfa25' }}>procjena — trener može upisati</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', fontWeight: 800, color: dt.color, lineHeight: 1 }}>{kcal} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: `${dt.color}88` }}>kcal</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                    {[
                      { label: 'Protein', val: protein, unit: 'g', color: '#f59e0b' },
                      { label: 'Ugljikohidrati', val: carbs,   unit: 'g', color: '#6b8cff' },
                      { label: 'Masti',   val: fat,     unit: 'g', color: '#f472b6' },
                      { label: 'Koraci',  val: `${dt.stepsMin/1000}k–${dt.stepsMax/1000}k`, unit: '', color: '#22c55e' },
                    ].map(m => (
                      <div key={m.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontFamily: 'var(--fm)', marginBottom: '4px' }}>{m.label.toUpperCase()}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: m.color, fontFamily: 'var(--fd)', lineHeight: 1 }}>{m.val}<span style={{ fontSize: '0.6rem', color: `${m.color}88`, marginLeft: '2px' }}>{m.unit}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--fm)', lineHeight: 1.7, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            Protein: 2.2g/kg • Masti: 25% kalorija • Ugljikohidrati: ostatak kalorija<br/>
            Preporuke koraka su okvirne — prilagodi prema uputama trenera.
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>
          {/* Date + day type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
            <CalcInput label="Datum" color={COLOR} type="date" value={logDate} onChange={setLogDate} max="2100-01-01" />
            <div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '8px', fontWeight: 600 }}>TIP DANA</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                {DAY_TYPES.map(dt => (
                  <button key={dt.id} onClick={() => setLogDraft(d => ({ ...d, day_type: dt.id }))}
                    style={{ padding: '7px 12px', background: logDraft.day_type === dt.id ? `${dt.color}18` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${logDraft.day_type === dt.id ? dt.color+'50' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', color: logDraft.day_type === dt.id ? dt.color : 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontFamily: 'var(--fm)', fontWeight: logDraft.day_type === dt.id ? 700 : 400, transition: 'all 0.15s' }}>
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Macro inputs */}
          <SectionTitle>Makrosi i metrike</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '10px' }}>
            {[
              { label: 'Kalorije (kcal)', key: 'calories' as keyof NutritionLog, color: COLOR },
              { label: 'Protein (g)',      key: 'protein_g' as keyof NutritionLog, color: '#f59e0b' },
              { label: 'Ugljikohidrati (g)', key: 'carbs_g' as keyof NutritionLog, color: '#6b8cff' },
              { label: 'Masti (g)',        key: 'fat_g' as keyof NutritionLog, color: '#f472b6' },
              { label: 'Koraci',           key: 'steps' as keyof NutritionLog, color: '#34d399' },
            ].map(f => (
              <CalcInput key={f.key} label={f.label} color={f.color} step={(f as any).step ?? '1'}
                value={logDraft[f.key] != null ? String(logDraft[f.key]) : ''}
                onChange={v => setLogDraft(d => ({ ...d, [f.key]: parseFloat(v) || null }))} />
            ))}
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', fontFamily: 'var(--fm)', marginBottom: '6px', fontWeight: 600 }}>BILJEŠKA</div>
            <textarea value={logDraft.notes ?? ''} onChange={e => setLogDraft(d => ({ ...d, notes: e.target.value || null }))} rows={2} placeholder="Kako si se osjećao/la, što si jeo/la..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#f0f0f5', padding: '10px 14px', borderRadius: '10px', outline: 'none', resize: 'vertical', fontFamily: 'var(--fm)', fontSize: '0.85rem', lineHeight: 1.6, boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = COLOR}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>

          <button onClick={saveLog} disabled={saving}
            style={{ padding: '11px 28px', background: `${COLOR}18`, border: `1.5px solid ${COLOR}44`, borderRadius: '10px', cursor: 'pointer', color: COLOR, fontSize: '0.78rem', fontFamily: 'var(--fm)', fontWeight: 700, letterSpacing: '0.05em', width: 'fit-content', transition: 'all 0.2s' }}>
            {saving ? 'Sprema...' : 'Spremi unos'}
          </button>

          {/* Log history */}
          {logs.length > 0 && (
            <>
              <SectionTitle>Povijest ({logs.length} unosa)</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                {logs.map(l => {
                  const dt = DAY_TYPES.find(d => d.id === l.day_type)
                  return (
                    <div key={l.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--fm)', minWidth: '80px' }}>{l.date}</div>
                      {dt && <span style={{ fontSize: '0.58rem', fontWeight: 700, color: dt.color, background: `${dt.color}14`, padding: '2px 8px', borderRadius: '5px', border: `1px solid ${dt.color}25`, fontFamily: 'var(--fm)' }}>{dt.label}</span>}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const, flex: 1 }}>
                        {l.calories   && <span style={{ fontSize: '0.75rem', color: COLOR, fontFamily: 'var(--fm)', fontWeight: 600 }}>{l.calories} kcal</span>}
                        {l.protein_g  && <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--fm)' }}>P: {l.protein_g}g</span>}
                        {l.carbs_g    && <span style={{ fontSize: '0.75rem', color: '#6b8cff', fontFamily: 'var(--fm)' }}>U: {l.carbs_g}g</span>}
                        {l.fat_g      && <span style={{ fontSize: '0.75rem', color: '#f472b6', fontFamily: 'var(--fm)' }}>M: {l.fat_g}g</span>}
                        {l.steps      && <span style={{ fontSize: '0.75rem', color: '#34d399', fontFamily: 'var(--fm)' }}>{l.steps.toLocaleString()} koraka</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function HubTab({ athleteName, userId }: { athleteName: string; userId?: string }) {
  const [active, setActive] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const activeTool = HUB_TOOLS.find(t => t.id === active)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [active])

  const q = search.trim().toLowerCase()
  const filtered = q ? HUB_TOOLS.filter(t => t.label.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q)) : null

  const renderToolCard = (tool: typeof HUB_TOOLS[0], groupColor?: string) => {
    const isActive = active === tool.id
    const c = groupColor ?? tool.color
    const isUpcoming = (tool as any).upcoming === true
    return (
      <button key={tool.id}
        onClick={() => { if (!isUpcoming) setActive(isActive ? null : tool.id) }}
        style={{
          position: 'relative' as const,
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textAlign: 'left' as const,
          background: isUpcoming ? 'rgba(255,255,255,0.03)' : isActive ? `${c}18` : 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${isUpcoming ? c + '18' : isActive ? c + '55' : c + '22'}`,
          borderRadius: '12px', cursor: isUpcoming ? 'default' : 'pointer', transition: 'all 0.2s',
          boxShadow: isActive ? `0 4px 20px ${c}20` : '0 2px 8px rgba(0,0,0,0.3)',
          opacity: isUpcoming ? 0.75 : 1,
        }}
        onMouseEnter={e => { if (!isActive && !isUpcoming) { e.currentTarget.style.background = `${c}10`; e.currentTarget.style.borderColor = `${c}44` } }}
        onMouseLeave={e => { if (!isActive && !isUpcoming) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = `${c}22` } }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${c}18`, border: `1px solid ${c}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, boxShadow: isActive ? `0 0 8px ${c}` : `0 0 4px ${c}88`, transition: 'box-shadow 0.2s' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isActive ? c : '#f0f0f8', fontFamily: 'var(--fm)', transition: 'color 0.2s' }}>{tool.label}</div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px', fontFamily: 'var(--fm)' }}>{tool.sub}</div>
        </div>
        {isUpcoming ? (
          <span style={{ fontSize: '0.48rem', fontWeight: 700, color: c, background: `${c}14`, padding: '3px 7px', borderRadius: '5px', border: `1px solid ${c}30`, letterSpacing: '0.08em', fontFamily: 'var(--fm)', flexShrink: 0, animation: 'uskoro-pulse 2.5s ease-in-out infinite' }}>
            USKORO
          </span>
        ) : (
          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: c, background: `${c}18`, padding: '3px 8px', borderRadius: '5px', border: `1px solid ${c}35`, letterSpacing: '0.06em', fontFamily: 'var(--fm)', flexShrink: 0 }}>
            {tool.badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pretraži alate..."
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#f0f0f5', padding: '10px 14px 10px 36px', fontFamily: 'var(--fm)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tools — filtered or grouped */}
      {filtered ? (
        filtered.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center' as const, color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', fontFamily: 'var(--fm)' }}>Nema rezultata za "{search}"</div>
          : <div className="hub-tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(160px,26vw,260px),1fr))', gap: '8px', marginBottom: '20px' }}>
              {filtered.map(t => renderToolCard(t))}
            </div>
      ) : (
        HUB_GROUPS.map(g => {
          const tools = HUB_TOOLS.filter(t => t.group === g.key)
          return (
            <div key={g.key} style={{ marginBottom: '4px' }}>
              <SectionTitle icon={g.icon} color={g.color}>{g.title}</SectionTitle>
              <div className="hub-tools-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(160px,26vw,260px),1fr))', gap: '8px', marginBottom: '20px' }}>
                {tools.map(t => renderToolCard(t, g.color))}
              </div>
            </div>
          )
        })
      )}

      {/* Modal overlay */}
      {active && activeTool && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setActive(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.18s ease' }}>
          <div style={{ width: '100%', maxWidth: '680px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' as const, border: `1.5px solid ${activeTool.color}44`, borderRadius: '18px', overflow: 'hidden', boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${activeTool.color}18, 0 0 60px ${activeTool.color}10`, animation: 'panelIn 0.25s cubic-bezier(0.16,1,0.3,1)', background: '#0d0d16' }}>

            {/* Modal header */}
            <div style={{ padding: '16px 20px', background: `${activeTool.color}14`, borderBottom: `1px solid ${activeTool.color}2a`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${activeTool.color}22`, border: `1px solid ${activeTool.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeTool.color, boxShadow: `0 0 10px ${activeTool.color}` }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.5rem', color: `${activeTool.color}99`, letterSpacing: '0.18em', fontFamily: 'var(--fm)', fontWeight: 700 }}>{activeTool.badge}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f0f5', fontFamily: 'var(--fm)', lineHeight: 1.1 }}>{activeTool.label}</div>
                </div>
              </div>
              <button onClick={() => setActive(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Modal content — scrollable */}
            <div style={{ padding: 'clamp(20px,4vw,28px)', overflowY: 'auto' as const, flex: 1 }}>
              {active === 'rpe'       && <RpeCalc />}
              {active === 'gl'        && <GlCalc />}
              {active === 'watercut'  && <WaterCutCalc />}
              {active === 'barloader' && <BarLoader />}
              {active === 'progress'  && userId  && <ProgressGraph userId={userId} />}
              {active === 'progress'  && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za prikaz grafa.</div>}
              {active === 'weight'    && userId  && <WeightTracker userId={userId} />}
              {active === 'weight'    && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za praćenje kilaze.</div>}
              {active === 'hydration' && userId  && <WaterLog userId={userId} />}
              {active === 'hydration' && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za log vode.</div>}
              {active === 'nutrition' && userId  && <NutritionTracker userId={userId} />}
              {active === 'nutrition' && !userId && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' as const }}>Prijavi se za praćenje prehrane.</div>}
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
        </div>
      )}
    </div>
  )
}