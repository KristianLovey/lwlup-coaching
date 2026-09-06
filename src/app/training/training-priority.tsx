'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronDown } from 'lucide-react'

const supabase = createClient()

type Priority = 'none' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'
type LiftKey = 'squat' | 'bench' | 'deadlift'
type CellConfig = { priority: Priority; exercise: string }
type PriorityConfig = Record<LiftKey, Record<string, CellConfig>>

const PRIORITY_ORDER: Priority[] = ['none', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary']

const PRIORITY_META: Record<Priority, { label: string; roman: string; color: string; bg: string; border: string }> = {
  none:       { label: '—',           roman: '—',   color: 'rgba(255,255,255,0.3)',  bg: 'rgba(255,255,255,0.04)',    border: 'var(--t-border)' },
  primary:    { label: 'PRIMARNI',    roman: 'I',   color: '#ef3535',               bg: 'rgba(239,53,53,0.22)',     border: 'rgba(239,53,53,0.5)' },
  secondary:  { label: 'SEKUNDARNI', roman: 'II',  color: '#f97316',               bg: 'rgba(249,115,22,0.22)',    border: 'rgba(249,115,22,0.45)' },
  tertiary:   { label: 'TERCIJARNI', roman: 'III', color: '#f59e0b',               bg: 'rgba(245,158,11,0.22)',    border: 'rgba(245,158,11,0.45)' },
  quaternary: { label: 'KVARTARNI',  roman: 'IV',  color: '#6b8cff',               bg: 'rgba(107,140,255,0.22)',  border: 'rgba(107,140,255,0.45)' },
  quinary:    { label: 'KVINTARNI',  roman: 'V',   color: '#a78bfa',               bg: 'rgba(167,139,250,0.22)', border: 'rgba(167,139,250,0.45)' },
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
    squat:    Object.fromEntries(DAYS.map(d => [d.key, { priority: 'none' as Priority, exercise: '' }])),
    bench:    Object.fromEntries(DAYS.map(d => [d.key, { priority: 'none' as Priority, exercise: '' }])),
    deadlift: Object.fromEntries(DAYS.map(d => [d.key, { priority: 'none' as Priority, exercise: '' }])),
  }
}

function parseRawConfig(raw: unknown): PriorityConfig {
  const base = emptyConfig()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  for (const lift of ['squat', 'bench', 'deadlift'] as LiftKey[]) {
    const liftData = r[lift]
    if (!liftData || typeof liftData !== 'object') continue
    const ld = liftData as Record<string, unknown>
    for (const day of DAYS) {
      const cell = ld[day.key]
      if (!cell) continue
      if (typeof cell === 'object' && cell !== null && 'priority' in cell) {
        const c = cell as { priority: unknown; exercise?: unknown }
        if (PRIORITY_ORDER.includes(c.priority as Priority)) {
          base[lift][day.key] = { priority: c.priority as Priority, exercise: String(c.exercise ?? '') }
        }
      } else if (typeof cell === 'string' && PRIORITY_ORDER.includes(cell as Priority)) {
        // backwards compat with old string-only format
        base[lift][day.key] = { priority: cell as Priority, exercise: '' }
      }
    }
  }
  return base
}

async function loadConfig(athleteId: string, blockId: string): Promise<PriorityConfig> {
  const { data } = await supabase
    .from('lift_priority_config')
    .select('config')
    .eq('athlete_id', athleteId)
    .eq('block_id', blockId)
    .single()
  return parseRawConfig(data?.config)
}

async function saveConfig(athleteId: string, blockId: string, config: PriorityConfig) {
  await supabase.from('lift_priority_config').upsert({
    athlete_id: athleteId,
    block_id:   blockId,
    config,
    updated_at: new Date().toISOString(),
  })
}

type BlockOption = { id: string; name: string; status: string; start_date: string }

// ── ADMIN / TRENER EDIT ────────────────────────────────────────────────
export function LiftPriorityAdmin({ athleteId }: { athleteId: string }) {
  const [blocks, setBlocks]             = useState<BlockOption[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [config, setConfig]             = useState<PriorityConfig | null>(null)
  const [saving, setSaving]             = useState(false)
  const [blockOpen, setBlockOpen]       = useState(false)
  const saveTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blockDropRef                    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('blocks')
      .select('id, name, status, start_date')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const b = (data ?? []) as BlockOption[]
        setBlocks(b)
        const active = b.find(x => x.status === 'active') ?? b[0]
        if (active) setSelectedBlockId(active.id)
      })
  }, [athleteId])

  useEffect(() => {
    if (!selectedBlockId) return
    setConfig(null)
    loadConfig(athleteId, selectedBlockId).then(setConfig)
  }, [athleteId, selectedBlockId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (blockDropRef.current && !blockDropRef.current.contains(e.target as Node))
        setBlockOpen(false)
    }
    if (blockOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [blockOpen])

  const scheduleSave = useCallback((next: PriorityConfig, blockId: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await saveConfig(athleteId, blockId, next)
      setSaving(false)
    }, 500)
  }, [athleteId])

  const cyclePriority = useCallback((lift: LiftKey, day: string) => {
    if (!config || !selectedBlockId) return
    const cur = config[lift][day].priority
    const next = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(cur) + 1) % PRIORITY_ORDER.length]
    const nc: PriorityConfig = { ...config, [lift]: { ...config[lift], [day]: { ...config[lift][day], priority: next } } }
    setConfig(nc)
    scheduleSave(nc, selectedBlockId)
  }, [config, selectedBlockId, scheduleSave])

  const setExercise = useCallback((lift: LiftKey, day: string, exercise: string) => {
    if (!config || !selectedBlockId) return
    const nc: PriorityConfig = { ...config, [lift]: { ...config[lift], [day]: { ...config[lift][day], exercise } } }
    setConfig(nc)
    scheduleSave(nc, selectedBlockId)
  }, [config, selectedBlockId, scheduleSave])

  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  if (blocks.length === 0 && !selectedBlockId) return (
    <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: FM }}>
      Nema blokova za ovog atletičara.
    </div>
  )

  return (
    <div style={{ animation: 'panelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* ── Blok selector ── */}
      <div ref={blockDropRef} style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
        <button
          onClick={() => setBlockOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', borderRadius: '9px', cursor: 'pointer', color: '#f0f0f0', transition: 'all 0.15s' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedBlock?.status === 'active' ? '#ef3535' : 'var(--t-border-hi)', flexShrink: 0, boxShadow: selectedBlock?.status === 'active' ? '0 0 6px rgba(239,53,53,0.5)' : 'none' }} />
          <span style={{ fontSize: '0.72rem', fontFamily: FM, fontWeight: 600, letterSpacing: '-0.01em' }}>{selectedBlock?.name ?? '—'}</span>
          <ChevronDown size={12} color="rgba(255,255,255,0.4)" style={{ transform: blockOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {blockOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 60, background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '11px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', minWidth: '220px', animation: 'dropDown 0.15s ease' }}>
            {blocks.map((b, i) => (
              <button key={b.id} onClick={() => { setSelectedBlockId(b.id); setBlockOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: b.id === selectedBlockId ? 'var(--t-s3)' : 'transparent', border: 'none', borderBottom: i < blocks.length - 1 ? '1px solid var(--t-border)' : 'none', cursor: 'pointer', textAlign: 'left' as const, transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = b.id === selectedBlockId ? 'rgba(255,255,255,0.06)' : 'transparent'}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: b.status === 'active' ? '#ef3535' : 'var(--t-border-hi)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#e0e0e0', fontFamily: FM, fontWeight: 500 }}>{b.name}</div>
                  <div style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginTop: '1px' }}>{b.start_date}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '0.46rem', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.25)', fontFamily: FM, marginBottom: '3px' }}>PRIORITETNA TABLICA</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM }}>
            Klikni rimski broj za promjenu · upiši naziv vježbe ispod
          </div>
        </div>
        {saving && <Loader2 size={13} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginBottom: '18px' }}>
        {PRIORITY_ORDER.filter(p => p !== 'none').map(p => {
          const m = PRIORITY_META[p]
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: '6px' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 900, color: m.color, fontFamily: FM }}>{m.roman}</span>
              <span style={{ fontSize: '0.44rem', letterSpacing: '0.1em', color: m.color, fontFamily: FM, opacity: 0.9 }}>{m.label}</span>
            </div>
          )
        })}
      </div>

      {/* ── Table ── */}
      {!config ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
        </div>
      ) : (
        <div style={{ overflowX: 'auto' as const }}>
          <table className="pa-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px', minWidth: '400px' }}>
            <thead>
              <tr>
                <th style={{ width: '52px', padding: '4px 0' }} />
                {DAYS.map(d => (
                  <th key={d.key} className="pa-day-th" style={{ padding: '4px 4px', fontSize: '0.46rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', fontFamily: FM, fontWeight: 700, textAlign: 'center' as const }}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIFTS.map(lift => (
                <tr key={lift.key}>
                  <td style={{ padding: '3px 10px 3px 0', verticalAlign: 'top' as const, paddingTop: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
                      <span className="pa-lift-abbr" style={{ fontSize: '1rem', fontWeight: 900, color: lift.color, fontFamily: FM, lineHeight: 1 }}>{lift.abbr}</span>
                      <span className="pa-lift-name" style={{ fontSize: '0.38rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)', fontFamily: FM }}>{lift.label}</span>
                    </div>
                  </td>
                  {DAYS.map(day => {
                    const cell = config[lift.key][day.key]
                    const pri  = cell.priority
                    const m    = PRIORITY_META[pri]
                    const empty = pri === 'none'
                    return (
                      <td key={day.key} style={{ padding: '3px', verticalAlign: 'stretch' as const }}>
                        <div className="pa-cell-wrap" style={{
                          background: empty ? 'rgba(255,255,255,0.02)' : `linear-gradient(155deg, ${m.bg}, rgba(0,0,0,0.18))`,
                          border: empty ? '1px dashed var(--t-border)' : `1px solid ${m.border}`,
                          boxShadow: empty ? 'none' : `0 6px 18px -10px ${m.color}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                          borderRadius: '12px',
                          display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
                          minHeight: '56px', height: '100%',
                          transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
                        }}>
                          {/* Priority cycle button */}
                          <button
                            onClick={() => cyclePriority(lift.key, day.key)}
                            title={m.label}
                            style={{
                              width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: empty ? '0' : '9px 4px 6px',
                              flex: empty ? 1 : 'unset',
                              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '3px',
                              transition: 'opacity 0.12s',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.65'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
                            <span className="pa-roman" style={{ fontSize: '0.95rem', fontWeight: 900, color: empty ? 'rgba(255,255,255,0.16)' : m.color, fontFamily: FM, lineHeight: 1, textShadow: empty ? 'none' : `0 0 14px ${m.color}66` }}>
                              {empty ? '+' : m.roman}
                            </span>
                            {!empty && (
                              <span className="pa-sublabel" style={{ fontSize: '0.34rem', color: m.color, opacity: 0.7, fontFamily: FM, letterSpacing: '0.12em', fontWeight: 700 }}>
                                {m.label.slice(0, 4)}
                              </span>
                            )}
                          </button>
                          {/* Exercise name input — only for non-none days */}
                          {!empty && (
                            <input
                              value={cell.exercise}
                              onChange={e => setExercise(lift.key, day.key, e.target.value)}
                              placeholder="vježba…"
                              className="pa-ex-input"
                              onMouseDown={e => e.stopPropagation()}
                              style={{
                                width: '100%', background: 'rgba(0,0,0,0.32)',
                                border: 'none', borderTop: `1px solid ${m.border}`,
                                color: m.color, fontFamily: FM, fontSize: '0.46rem', fontWeight: 600,
                                padding: '6px 6px', outline: 'none',
                                textAlign: 'center' as const, letterSpacing: '0.03em',
                                boxSizing: 'border-box' as const,
                              }}
                            />
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
      )}

      <style>{`
        @keyframes panelSlideIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dropDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        .pa-ex-input::placeholder { color: rgba(255,255,255,0.18) !important; }
        @media (min-width: 768px) {
          .pa-table       { border-spacing: 7px !important; }
          .pa-day-th      { font-size: 0.62rem !important; padding: 6px 6px !important; }
          .pa-cell-wrap   { min-height: 74px !important; border-radius: 14px !important; }
          .pa-roman       { font-size: 1.25rem !important; }
          .pa-sublabel    { font-size: 0.42rem !important; }
          .pa-lift-abbr   { font-size: 1.3rem !important; }
          .pa-lift-name   { font-size: 0.48rem !important; }
          .pa-ex-input    { font-size: 0.56rem !important; padding: 7px 8px !important; }
        }
      `}</style>
    </div>
  )
}

// ── LIFTER READ-ONLY VIEW ──────────────────────────────────────────────
export function LiftPriorityView({ athleteId, blockId }: { athleteId: string; blockId: string }) {
  const [config, setConfig]   = useState<PriorityConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [holding, setHolding] = useState(false)
  const holdTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setConfig(null)
    loadConfig(athleteId, blockId).then(setConfig)
  }, [athleteId, blockId])

  useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current) }, [])

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setHolding(true)
    holdTimerRef.current = setTimeout(() => { setHolding(false); setDismissed(true) }, 700)
  }, [])

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    setHolding(false)
  }, [])

  if (!config) return null
  const hasAny = LIFTS.some(l => DAYS.some(d => config[l.key][d.key].priority !== 'none'))
  if (!hasAny || dismissed) return null

  const usedPriorities = PRIORITY_ORDER.filter(p =>
    p !== 'none' && LIFTS.some(l => DAYS.some(d => config[l.key][d.key].priority === p))
  )

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
        background: 'var(--t-s1)',
        border: holding ? '1px solid rgba(239,53,53,0.45)' : '1px solid var(--t-border)',
        borderRadius: '20px', padding: '22px 24px', marginBottom: '12px',
        cursor: 'default', transition: 'border-color 0.2s',
        position: 'relative' as const,
        userSelect: 'none' as const, WebkitUserSelect: 'none' as const,
        overflow: 'hidden',
      }}>

      {holding && (
        <div style={{ position: 'absolute' as const, inset: 0, borderRadius: '20px', background: 'rgba(239,53,53,0.07)', pointerEvents: 'none', animation: 'pvHoldFill 0.7s linear forwards', zIndex: 0 }} />
      )}
      {holding && (
        <div style={{ position: 'absolute' as const, top: '12px', right: '16px', fontSize: '0.46rem', letterSpacing: '0.18em', color: 'rgba(239,53,53,0.75)', fontFamily: FM, fontWeight: 700, zIndex: 2, animation: 'pvFadeIn 0.15s ease' }}>
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
            {DAYS.filter(d => LIFTS.some(l => config[l.key][d.key].priority !== 'none')).map(d => (
              <div key={d.key} className="pv-day-badge" style={{ padding: '3px 7px', background: 'var(--t-s3)', border: '1px solid var(--t-border)', borderRadius: '5px', fontSize: '0.42rem', color: 'rgba(255,255,255,0.4)', fontFamily: FM, letterSpacing: '0.1em' }}>
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
                <th style={{ width: '44px', padding: '4px 0' }} />
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
                    const cell = config[lift.key][day.key]
                    const pri  = cell.priority
                    const m    = PRIORITY_META[pri]
                    const empty = pri === 'none'
                    return (
                      <td key={day.key} style={{ padding: '3px', verticalAlign: 'stretch' as const }}>
                        <div className="pv-cell" style={{
                          minWidth: '34px', minHeight: '54px', height: '100%',
                          background: empty ? 'rgba(255,255,255,0.018)' : `linear-gradient(155deg, ${m.bg}, rgba(0,0,0,0.18))`,
                          border: empty ? '1px dashed var(--t-border)' : `1px solid ${m.border}`,
                          boxShadow: empty ? 'none' : `0 6px 18px -10px ${m.color}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                          borderRadius: '11px', overflow: 'hidden',
                          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                        }}>
                          {empty ? (
                            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.7rem', fontFamily: FM, lineHeight: 1 }}>·</span>
                          ) : (
                            <>
                              <div className="pv-cell-top" style={{ flex: 1, padding: '8px 4px 6px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '2px', width: '100%', justifyContent: 'center' }}>
                                <span className="pv-roman" style={{ fontSize: '0.82rem', fontWeight: 900, color: m.color, fontFamily: FM, lineHeight: 1, textShadow: `0 0 12px ${m.color}55` }}>
                                  {m.roman}
                                </span>
                              </div>
                              {cell.exercise && (
                                <div className="pv-ex" style={{
                                  width: '100%', padding: '4px 5px',
                                  borderTop: `1px solid ${m.border}`,
                                  background: 'rgba(0,0,0,0.28)',
                                  fontSize: '0.4rem', color: m.color, opacity: 0.92,
                                  fontFamily: FM, fontWeight: 600, textAlign: 'center' as const,
                                  letterSpacing: '0.02em', lineHeight: 1.25,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                                }}>
                                  {cell.exercise}
                                </div>
                              )}
                            </>
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
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--t-border)', alignItems: 'center' }}>
            {usedPriorities.map(p => {
              const m = PRIORITY_META[p]
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: '5px' }}>
                  <span style={{ fontSize: '0.52rem', fontWeight: 900, color: m.color, fontFamily: FM }}>{m.roman}</span>
                  <span style={{ fontSize: '0.4rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontFamily: FM }}>{m.label}</span>
                </div>
              )
            })}
            <div style={{ marginLeft: 'auto', fontSize: '0.38rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.1)', fontFamily: FM }}>
              DRŽI ZA UKLANJANJE
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pvHoldFill { from { opacity:0 } to { opacity:1 } }
        @keyframes pvFadeIn   { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        @media (min-width: 768px) {
          .priority-view-card { padding: 28px 32px !important; }
          .pv-title            { font-size: 1.05rem !important; }
          .pv-day-badge        { font-size: 0.5rem !important; padding: 4px 10px !important; }
          .pv-table            { border-spacing: 7px !important; }
          .pv-day-th           { font-size: 0.58rem !important; padding: 6px 4px !important; }
          .pv-cell             { border-radius: 13px !important; min-height: 72px !important; }
          .pv-cell-top         { padding: 11px 4px 8px !important; }
          .pv-roman            { font-size: 1.15rem !important; }
          .pv-ex               { font-size: 0.5rem !important; padding: 6px 7px !important; }
          .pv-lift-abbr        { font-size: 1.3rem !important; }
          .pv-lift-name        { font-size: 0.48rem !important; }
        }
      `}</style>
    </div>
  )
}
