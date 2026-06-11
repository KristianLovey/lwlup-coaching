'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const supabase = createClient()

type Priority = 'none' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'
type LiftKey = 'squat' | 'bench' | 'deadlift'
type PriorityConfig = Record<LiftKey, Record<string, Priority>>

const PRIORITY_ORDER: Priority[] = ['none', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary']

const PRIORITY_META: Record<Priority, { label: string; roman: string; color: string; bg: string; border: string }> = {
  none:       { label: '—',           roman: '—',   color: 'rgba(255,255,255,0.2)',  bg: 'transparent',             border: 'rgba(255,255,255,0.07)' },
  primary:    { label: 'PRIMARNI',    roman: 'I',   color: '#ef3535',               bg: 'rgba(239,53,53,0.12)',    border: 'rgba(239,53,53,0.35)' },
  secondary:  { label: 'SEKUNDARNI', roman: 'II',  color: '#f97316',               bg: 'rgba(249,115,22,0.12)',   border: 'rgba(249,115,22,0.3)' },
  tertiary:   { label: 'TERCIJARNI', roman: 'III', color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)' },
  quaternary: { label: 'KVARTARNI',  roman: 'IV',  color: '#6b8cff',               bg: 'rgba(107,140,255,0.12)', border: 'rgba(107,140,255,0.3)' },
  quinary:    { label: 'KVINTARNI',  roman: 'V',   color: '#a78bfa',               bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

const DAYS = [
  { key: '1', label: 'PON' },
  { key: '2', label: 'UTO' },
  { key: '3', label: 'SRI' },
  { key: '4', label: 'ČET' },
  { key: '5', label: 'PET' },
  { key: '6', label: 'SUB' },
  { key: '7', label: 'NED' },
]

const LIFTS: { key: LiftKey; label: string; abbr: string; color: string }[] = [
  { key: 'squat',    label: 'SQUAT',    abbr: 'S', color: '#ef3535' },
  { key: 'bench',    label: 'BENCH',    abbr: 'B', color: '#f59e0b' },
  { key: 'deadlift', label: 'DEADLIFT', abbr: 'D', color: '#a78bfa' },
]

const FM = 'var(--fm)'

function emptyConfig(): PriorityConfig {
  return {
    squat:    Object.fromEntries(DAYS.map(d => [d.key, 'none' as Priority])),
    bench:    Object.fromEntries(DAYS.map(d => [d.key, 'none' as Priority])),
    deadlift: Object.fromEntries(DAYS.map(d => [d.key, 'none' as Priority])),
  }
}

async function loadConfig(athleteId: string): Promise<PriorityConfig> {
  const { data } = await supabase
    .from('lift_priority_config')
    .select('config')
    .eq('athlete_id', athleteId)
    .single()
  if (!data) return emptyConfig()
  const raw = data.config as Partial<PriorityConfig>
  const base = emptyConfig()
  for (const lift of ['squat', 'bench', 'deadlift'] as LiftKey[]) {
    if (raw[lift]) {
      for (const day of DAYS) {
        const val = (raw[lift] as Record<string, string>)[day.key] as Priority
        if (val && PRIORITY_ORDER.includes(val)) base[lift][day.key] = val
      }
    }
  }
  return base
}

async function saveConfig(athleteId: string, config: PriorityConfig) {
  await supabase
    .from('lift_priority_config')
    .upsert({ athlete_id: athleteId, config, updated_at: new Date().toISOString() })
}

// ── ADMIN / TRENER EDIT ────────────────────────────────────────────────
export function LiftPriorityAdmin({ athleteId }: { athleteId: string }) {
  const [config, setConfig] = useState<PriorityConfig | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadConfig(athleteId).then(setConfig) }, [athleteId])

  const cycle = useCallback(async (lift: LiftKey, day: string) => {
    if (!config) return
    const cur = config[lift][day]
    const next = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(cur) + 1) % PRIORITY_ORDER.length]
    const next_config: PriorityConfig = { ...config, [lift]: { ...config[lift], [day]: next } }
    setConfig(next_config)
    setSaving(true)
    await saveConfig(athleteId, next_config)
    setSaving(false)
  }, [config, athleteId])

  if (!config) return (
    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)' }}>
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div style={{ animation: 'panelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '0.46rem', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginBottom: '3px' }}>PRIORITETNA TABLICA</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: FM, lineHeight: 1.4 }}>
            Klikni ćeliju za promjenu prioriteta (ciklira I → II → III → ...)
          </div>
        </div>
        {saving && <Loader2 size={13} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginBottom: '14px' }}>
        {PRIORITY_ORDER.filter(p => p !== 'none').map(p => {
          const m = PRIORITY_META[p]
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: '6px' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: m.color, fontFamily: FM }}>{m.roman}</span>
              <span style={{ fontSize: '0.42rem', letterSpacing: '0.1em', color: m.color, fontFamily: FM, opacity: 0.9 }}>{m.label}</span>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' as const }}>
        <table className="pa-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '320px' }}>
          <thead>
            <tr>
              <th style={{ width: '32px', padding: '4px 0' }} />
              {DAYS.map(d => (
                <th key={d.key} className="pa-day-th" style={{ padding: '4px 2px', fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.28)', fontFamily: FM, fontWeight: 700, textAlign: 'center' as const }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIFTS.map(lift => (
              <tr key={lift.key}>
                <td style={{ padding: '2px 8px 2px 0', verticalAlign: 'middle' as const }}>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1px' }}>
                    <span className="pa-lift-abbr" style={{ fontSize: '0.85rem', fontWeight: 900, color: lift.color, fontFamily: FM, lineHeight: 1 }}>{lift.abbr}</span>
                    <span className="pa-lift-name" style={{ fontSize: '0.36rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', fontFamily: FM }}>{lift.label}</span>
                  </div>
                </td>
                {DAYS.map(day => {
                  const pri = config[lift.key][day.key]
                  const m = PRIORITY_META[pri]
                  return (
                    <td key={day.key} style={{ padding: '2px' }}>
                      <button
                        onClick={() => cycle(lift.key, day.key)}
                        title={m.label}
                        className="pa-cell"
                        style={{
                          width: '100%', minWidth: '34px', height: '38px',
                          background: m.bg,
                          border: `1px solid ${m.border}`,
                          borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '2px',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}>
                        <span className="pa-roman" style={{ fontSize: pri === 'none' ? '0.65rem' : '0.6rem', fontWeight: 900, color: m.color, fontFamily: FM, lineHeight: 1 }}>
                          {m.roman}
                        </span>
                        {pri !== 'none' && (
                          <span className="pa-sublabel" style={{ fontSize: '0.3rem', letterSpacing: '0.06em', color: m.color, opacity: 0.65, fontFamily: FM }}>
                            {m.label.slice(0, 4)}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes panelSlideIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @media (min-width: 768px) {
          .pa-table      { border-spacing: 6px !important; }
          .pa-day-th     { font-size: 0.58rem !important; padding: 6px 4px !important; }
          .pa-cell       { height: 60px !important; min-width: 56px !important; border-radius: 10px !important; }
          .pa-roman      { font-size: 0.88rem !important; }
          .pa-sublabel   { font-size: 0.44rem !important; }
          .pa-lift-abbr  { font-size: 1.2rem !important; }
          .pa-lift-name  { font-size: 0.46rem !important; }
        }
      `}</style>
    </div>
  )
}

// ── LIFTER READ-ONLY VIEW ──────────────────────────────────────────────
export function LiftPriorityView({ athleteId }: { athleteId: string }) {
  const [config, setConfig] = useState<PriorityConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [holding, setHolding] = useState(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadConfig(athleteId).then(setConfig) }, [athleteId])
  useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current) }, [])

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setHolding(true)
    holdTimerRef.current = setTimeout(() => {
      setHolding(false)
      setDismissed(true)
    }, 700)
  }, [])

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    setHolding(false)
  }, [])

  if (!config) return null
  const hasAny = LIFTS.some(l => DAYS.some(d => config[l.key][d.key] !== 'none'))
  if (!hasAny || dismissed) return null

  const usedPriorities = PRIORITY_ORDER.filter(p => p !== 'none' && LIFTS.some(l => DAYS.some(d => config[l.key][d.key] === p)))

  return (
    <div
      className="priority-view-card"
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      style={{
        background: '#111111',
        border: holding ? '1px solid rgba(239,53,53,0.45)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '22px 24px',
        marginBottom: '12px',
        cursor: 'default',
        transition: 'border-color 0.2s',
        position: 'relative' as const,
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
        overflow: 'hidden',
      }}>

      {/* Hold progress overlay */}
      {holding && (
        <div style={{
          position: 'absolute' as const, inset: 0, borderRadius: '20px',
          background: 'rgba(239,53,53,0.07)',
          pointerEvents: 'none',
          animation: 'pvHoldFill 0.7s linear forwards',
          zIndex: 0,
        }} />
      )}

      {/* "Releasing" label when holding */}
      {holding && (
        <div style={{
          position: 'absolute' as const, top: '12px', right: '16px',
          fontSize: '0.46rem', letterSpacing: '0.18em', color: 'rgba(239,53,53,0.75)',
          fontFamily: FM, fontWeight: 700, zIndex: 2,
          animation: 'pvFadeIn 0.15s ease',
        }}>
          UKLONI...
        </div>
      )}

      <div style={{ position: 'relative' as const, zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.44rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', fontFamily: FM, marginBottom: '4px' }}>RASPORED PRIORITETA</div>
            <div className="pv-title" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e0e0e0', fontFamily: FM, letterSpacing: '-0.01em' }}>Tjedni plan liftova</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {DAYS.filter(d => LIFTS.some(l => config[l.key][d.key] !== 'none')).map(d => (
              <div key={d.key} className="pv-day-badge" style={{ padding: '3px 7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM, letterSpacing: '0.1em' }}>
                {d.label}
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' as const }}>
          <table className="pv-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '300px' }}>
            <thead>
              <tr>
                <th style={{ width: '42px', padding: '4px 0' }} />
                {DAYS.map(d => (
                  <th key={d.key} className="pv-day-th" style={{ padding: '4px 2px', fontSize: '0.43rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, fontWeight: 700, textAlign: 'center' as const }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIFTS.map(lift => (
                <tr key={lift.key}>
                  <td style={{ padding: '2px 8px 2px 0', verticalAlign: 'middle' as const }}>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1px' }}>
                      <span className="pv-lift-abbr" style={{ fontSize: '0.95rem', fontWeight: 900, color: lift.color, fontFamily: FM, lineHeight: 1 }}>{lift.abbr}</span>
                      <span className="pv-lift-name" style={{ fontSize: '0.36rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', fontFamily: FM }}>{lift.label}</span>
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const pri = config[lift.key][day.key]
                    const m = PRIORITY_META[pri]
                    return (
                      <td key={day.key} style={{ padding: '2px' }}>
                        <div className="pv-cell" style={{
                          minWidth: '34px', height: '42px',
                          background: m.bg, border: `1px solid ${m.border}`, borderRadius: '8px',
                          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '2px',
                        }}>
                          <span className="pv-roman" style={{ fontSize: pri === 'none' ? '0.6rem' : '0.6rem', fontWeight: 900, color: m.color, fontFamily: FM, lineHeight: 1 }}>
                            {m.roman}
                          </span>
                          {pri !== 'none' && (
                            <span className="pv-sublabel" style={{ fontSize: '0.3rem', letterSpacing: '0.06em', color: m.color, opacity: 0.65, fontFamily: FM, textTransform: 'uppercase' as const }}>
                              {m.label.slice(0, 4)}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {usedPriorities.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {usedPriorities.map(p => {
              const m = PRIORITY_META[p]
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: '5px' }}>
                  <span style={{ fontSize: '0.52rem', fontWeight: 900, color: m.color, fontFamily: FM }}>{m.roman}</span>
                  <span style={{ fontSize: '0.4rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontFamily: FM }}>{m.label}</span>
                </div>
              )
            })}
            <div style={{ marginLeft: 'auto', fontSize: '0.38rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.1)', fontFamily: FM, alignSelf: 'center' }}>
              DRŽI ZA UKLANJANJE
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pvHoldFill {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes pvFadeIn {
          from { opacity: 0; transform: translateY(-4px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @media (min-width: 768px) {
          .priority-view-card { padding: 28px 32px !important; }
          .pv-title            { font-size: 1.05rem !important; }
          .pv-day-badge        { font-size: 0.5rem !important; padding: 4px 10px !important; }
          .pv-table            { border-spacing: 5px !important; }
          .pv-day-th           { font-size: 0.56rem !important; padding: 6px 4px !important; }
          .pv-cell             { height: 58px !important; min-width: 54px !important; border-radius: 10px !important; gap: 3px !important; }
          .pv-roman            { font-size: 0.85rem !important; }
          .pv-sublabel         { font-size: 0.42rem !important; }
          .pv-lift-abbr        { font-size: 1.25rem !important; }
          .pv-lift-name        { font-size: 0.46rem !important; }
        }
      `}</style>
    </div>
  )
}
