'use client'
import { useState, useEffect, useCallback } from 'react'
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
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '320px' }}>
          <thead>
            <tr>
              <th style={{ width: '32px', padding: '4px 0' }} />
              {DAYS.map(d => (
                <th key={d.key} style={{ padding: '4px 2px', fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.28)', fontFamily: FM, fontWeight: 700, textAlign: 'center' as const }}>
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: lift.color, fontFamily: FM, lineHeight: 1 }}>{lift.abbr}</span>
                    <span style={{ fontSize: '0.36rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', fontFamily: FM }}>{lift.label}</span>
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
                        <span style={{ fontSize: pri === 'none' ? '0.65rem' : '0.6rem', fontWeight: 900, color: m.color, fontFamily: FM, lineHeight: 1 }}>
                          {m.roman}
                        </span>
                        {pri !== 'none' && (
                          <span style={{ fontSize: '0.3rem', letterSpacing: '0.06em', color: m.color, opacity: 0.65, fontFamily: FM }}>
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

      <style>{`@keyframes panelSlideIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── LIFTER READ-ONLY VIEW ──────────────────────────────────────────────
export function LiftPriorityView({ athleteId }: { athleteId: string }) {
  const [config, setConfig] = useState<PriorityConfig | null>(null)

  useEffect(() => { loadConfig(athleteId).then(setConfig) }, [athleteId])

  if (!config) return null

  const hasAny = LIFTS.some(l => DAYS.some(d => config[l.key][d.key] !== 'none'))
  if (!hasAny) return null

  const usedPriorities = PRIORITY_ORDER.filter(p => p !== 'none' && LIFTS.some(l => DAYS.some(d => config[l.key][d.key] === p)))

  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '22px 24px', marginBottom: '12px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.44rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', fontFamily: FM, marginBottom: '4px' }}>RASPORED PRIORITETA</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e0e0e0', fontFamily: FM, letterSpacing: '-0.01em' }}>Tjedni plan liftova</div>
        </div>
        {/* Active days badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {(() => {
            const activeDays = DAYS.filter(d => LIFTS.some(l => config[l.key][d.key] !== 'none'))
            return activeDays.map(d => (
              <div key={d.key} style={{ padding: '3px 7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM, letterSpacing: '0.1em' }}>
                {d.label}
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' as const }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px', minWidth: '300px' }}>
          <thead>
            <tr>
              <th style={{ width: '42px', padding: '4px 0' }} />
              {DAYS.map(d => (
                <th key={d.key} style={{ padding: '4px 2px', fontSize: '0.43rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, fontWeight: 700, textAlign: 'center' as const }}>
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
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: lift.color, fontFamily: FM, lineHeight: 1 }}>{lift.abbr}</span>
                    <span style={{ fontSize: '0.36rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.18)', fontFamily: FM }}>{lift.label}</span>
                  </div>
                </td>
                {DAYS.map(day => {
                  const pri = config[lift.key][day.key]
                  const m = PRIORITY_META[pri]
                  return (
                    <td key={day.key} style={{ padding: '2px' }}>
                      <div style={{
                        minWidth: '34px', height: '42px',
                        background: m.bg,
                        border: `1px solid ${m.border}`,
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '2px',
                      }}>
                        <span style={{ fontSize: pri === 'none' ? '0.6rem' : '0.58rem', fontWeight: 900, color: m.color, fontFamily: FM, lineHeight: 1 }}>
                          {m.roman}
                        </span>
                        {pri !== 'none' && (
                          <span style={{ fontSize: '0.3rem', letterSpacing: '0.06em', color: m.color, opacity: 0.65, fontFamily: FM, textTransform: 'uppercase' as const }}>
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

      {/* Legend — only show priorities that are actually used */}
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
        </div>
      )}
    </div>
  )
}
