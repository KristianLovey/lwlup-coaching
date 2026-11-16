'use client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronDown, Check } from 'lucide-react'

const supabase = createClient()

type Priority = 'none' | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'
type LiftKey = 'squat' | 'bench' | 'deadlift'
type CellConfig = { priority: Priority; exercise: string }
type PriorityConfig = Record<LiftKey, Record<string, CellConfig>>

const PRIORITY_ORDER: Priority[] = ['none', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary']

// Prioritet je redoslijed, pa se kodira jačinom (level 1 = najjače), ne bojom: I puna crvena,
// II crveni ton, III–V sive sve tamnije. Izgled je u PR_CSS ([data-p]).
const PRIORITY_META: Record<Priority, { label: string; roman: string; level: number }> = {
  none:       { label: 'Bez prioriteta', roman: '—',   level: 0 },
  primary:    { label: 'Primarni',       roman: 'I',   level: 1 },
  secondary:  { label: 'Sekundarni',     roman: 'II',  level: 2 },
  tertiary:   { label: 'Tercijarni',     roman: 'III', level: 3 },
  quaternary: { label: 'Kvartarni',      roman: 'IV',  level: 4 },
  quinary:    { label: 'Kvintarni',      roman: 'V',   level: 5 },
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

const LIFTS: { key: LiftKey; label: string }[] = [
  { key: 'squat',    label: 'Squat' },
  { key: 'bench',    label: 'Bench' },
  { key: 'deadlift', label: 'Deadlift' },
]

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

  const scheduleSave = useCallback((next: PriorityConfig, blockId: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await saveConfig(athleteId, blockId, next)
      setSaving(false)
    }, 500)
  }, [athleteId])

  const setPriority = useCallback((lift: LiftKey, day: string, next: Priority) => {
    if (!config || !selectedBlockId) return
    if (config[lift][day].priority === next) return
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
    <div className="pr"><div className="pr-empty">Lifter nema blokova. Prioriteti se postavljaju po bloku.</div><style>{PR_CSS}</style></div>
  )

  return (
    <div className="pr pr-in">
      <div className="pr-card">
        {/* ── zaglavlje: naslov + blok ── */}
        <div className="pr-head">
          <div>
            <div className="pr-eyebrow">Prioritetna tablica</div>
            <div className="pr-title">Prioriteti liftova</div>
          </div>
          <div className="pr-tools">
            {saving && <span className="pr-saving"><Loader2 size={12} className="pr-spin" /> Spremam…</span>}
            <DropdownMenu.Root open={blockOpen} onOpenChange={setBlockOpen} modal={false}>
              <DropdownMenu.Trigger asChild>
                <button className="pr-block" aria-label="Odaberi blok">
                  <span className={'dot' + (selectedBlock?.status === 'active' ? ' on' : '')} />
                  <span className="nm">{selectedBlock?.name ?? '—'}</span>
                  <ChevronDown size={13} className="cr" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="ui-menu pr-menu" side="bottom" align="end" sideOffset={6} collisionPadding={12}>
                {blocks.map(b => (
                  <DropdownMenu.Item key={b.id} className="ui-item pr-item" onSelect={() => setSelectedBlockId(b.id)}>
                    <span className={'dot' + (b.status === 'active' ? ' on' : '')} />
                    <span className="txt"><b>{b.name}</b><small>{b.start_date}{b.status === 'active' ? ' · aktivni' : ''}</small></span>
                    {b.id === selectedBlockId && <Check size={13} className="ck" />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>

        <PriorityLegend />

        {!config ? (
          <div className="pr-loading"><Loader2 size={16} className="pr-spin" /></div>
        ) : (
          <div className="pr-scroll">
            <div className="pr-grid" role="grid" aria-label="Prioriteti po danima">
              <span />
              {DAYS.map((d, i) => <span key={d.key} className={'pr-dh' + (i >= 5 ? ' we' : '')}>{d.label}</span>)}
              {LIFTS.map(lift => (
                <PriorityRow key={lift.key} label={lift.label}>
                  {DAYS.map(day => {
                    const cell = config[lift.key][day.key]
                    const m = PRIORITY_META[cell.priority]
                    const empty = cell.priority === 'none'
                    return (
                      <div key={day.key} className="pr-tile" data-p={m.level || undefined}>
                        <DropdownMenu.Root modal={false}>
                          <DropdownMenu.Trigger asChild>
                            <button className="pr-pick" aria-label={`${lift.label}, ${day.label}: ${m.label}`}>
                              {empty ? <span className="pr-plus" aria-hidden>+</span> : <><span className="r">{m.roman}</span><span className="l">{m.label}</span></>}
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content className="ui-menu pr-menu" side="bottom" align="center" sideOffset={4} collisionPadding={12}>
                            {PRIORITY_ORDER.filter(p => p !== 'none').map(p => {
                              const pm = PRIORITY_META[p]
                              return (
                                <DropdownMenu.Item key={p} className="ui-item pr-item" onSelect={() => setPriority(lift.key, day.key, p)}>
                                  <span className="sw" data-p={pm.level}>{pm.roman}</span>
                                  <span className="txt"><b>{pm.label}</b></span>
                                  {cell.priority === p && <Check size={13} className="ck" />}
                                </DropdownMenu.Item>
                              )
                            })}
                            {!empty && <DropdownMenu.Separator className="pr-sep" />}
                            {!empty && (
                              <DropdownMenu.Item className="ui-item pr-item danger" onSelect={() => setPriority(lift.key, day.key, 'none')}>
                                <span className="txt"><b>Ukloni prioritet</b></span>
                              </DropdownMenu.Item>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                        {/* naziv vježbe: samo kad dan ima prioritet; pločica je iste visine u oba slučaja */}
                        {!empty && (
                          <input className="pr-ex" value={cell.exercise} placeholder="vježba…" aria-label={`Vježba: ${lift.label}, ${day.label}`}
                            onChange={e => setExercise(lift.key, day.key, e.target.value)} />
                        )}
                      </div>
                    )
                  })}
                </PriorityRow>
              ))}
            </div>
          </div>
        )}
        <div className="pr-hint">Klikni polje i odaberi prioritet. Naziv vježbe upiši ispod rimskog broja.</div>
      </div>
      <style>{PR_CSS}</style>
    </div>
  )
}

// Red liftova u mreži: naziv lijevo, pa 7 pločica (dijete)
function PriorityRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="pr-lift">{label}</span>
      {children}
    </>
  )
}

// Ljestvica I–V kao legenda (ista boja/jačina kao pločice)
function PriorityLegend({ only }: { only?: Priority[] }) {
  return (
    <div className="pr-legend">
      {PRIORITY_ORDER.filter(p => p !== 'none' && (!only || only.includes(p))).map(p => {
        const m = PRIORITY_META[p]
        return <span key={p} className="pr-lg"><span className="sw" data-p={m.level}>{m.roman}</span>{m.label}</span>
      })}
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
    <div className={'pr pr-view' + (holding ? ' holding' : '')}
      onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
      onTouchStart={startHold} onTouchEnd={cancelHold} onTouchCancel={cancelHold}>
      <div className="pr-card">
        {holding && <div className="pr-hold-fill" aria-hidden />}
        <div className="pr-head">
          <div>
            <div className="pr-eyebrow">Raspored prioriteta</div>
            <div className="pr-title">Tjedni plan liftova</div>
          </div>
          {holding && <span className="pr-hold-txt">Ukloni…</span>}
        </div>

        <div className="pr-scroll">
          <div className="pr-grid view" role="grid" aria-label="Prioriteti po danima">
            <span />
            {DAYS.map((d, i) => <span key={d.key} className={'pr-dh' + (i >= 5 ? ' we' : '')}>{d.label}</span>)}
            {LIFTS.map(lift => (
              <PriorityRow key={lift.key} label={lift.label}>
                {DAYS.map(day => {
                  const cell = config[lift.key][day.key]
                  const m = PRIORITY_META[cell.priority]
                  const empty = cell.priority === 'none'
                  return (
                    <div key={day.key} className="pr-tile" data-p={m.level || undefined} title={empty ? undefined : `${m.label}${cell.exercise ? ` · ${cell.exercise}` : ''}`}>
                      {empty ? <span className="pr-dash" aria-hidden /> : (
                        <>
                          <div className="pr-pick as-text"><span className="r">{m.roman}</span><span className="l">{m.label}</span></div>
                          {cell.exercise && <div className="pr-ex as-text">{cell.exercise}</div>}
                        </>
                      )}
                    </div>
                  )
                })}
              </PriorityRow>
            ))}
          </div>
        </div>

        <div className="pr-foot">
          <PriorityLegend only={usedPriorities} />
          <span className="pr-hold-hint">Drži za uklanjanje</span>
        </div>
      </div>
      <style>{PR_CSS}</style>
    </div>
  )
}

// ── izgled (isti za admin i liftera; samo tokeni panela, pa radi u oba i u svijetloj temi admina) ──
const PR_CSS = `
.pr { --acc: var(--accent, #ef3535); --pr-text: var(--text, #f0f0f0); --pr-dim: var(--text-dim, rgba(255,255,255,0.7)); --pr-muted: var(--text-muted, rgba(255,255,255,0.5));
  --pr-mono: var(--font-jb), ui-monospace, monospace; font-family: var(--fm); color: var(--pr-text); }
.pr-in { animation: prIn 0.3s cubic-bezier(0.16,1,0.3,1); }
@keyframes prIn { from { opacity: 0; transform: translateY(10px); } }
.pr-card { position: relative; overflow: hidden; padding: 20px 22px; border: 1px solid var(--t-border); border-radius: var(--t-r);
  background: var(--card-bg, linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 46%), var(--t-s1));
  box-shadow: var(--card-shadow, inset 0 1px 0 rgba(255,255,255,0.07), 0 14px 32px -16px rgba(0,0,0,0.95)); }
.pr-view { margin-bottom: 12px; user-select: none; -webkit-user-select: none; }
.pr-view.holding .pr-card { border-color: color-mix(in srgb, var(--acc) 55%, transparent); }

.pr-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.pr-eyebrow { font-family: var(--pr-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pr-muted); }
.pr-title { font-family: var(--fd); font-weight: 700; font-size: 24px; line-height: 1; letter-spacing: -0.01em; margin-top: 6px; color: var(--pr-text); }
.pr-tools { display: flex; align-items: center; gap: 10px; }
.pr-saving { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pr-mono); font-size: 10px; letter-spacing: 0.08em; color: var(--pr-muted); }
.pr-spin { animation: spin 1s linear infinite; }

.pr-block { display: inline-flex; align-items: center; gap: 9px; height: 36px; padding: 0 12px; border-radius: var(--t-r-sm); cursor: pointer;
  background: var(--t-s2); border: 1px solid var(--t-border-hi); color: var(--pr-text); font-family: var(--fm); font-size: 13px; font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); transition: border-color 0.15s; }
.pr-block:hover, .pr-block[data-state="open"] { border-color: var(--pr-muted); }
.pr-block .cr { color: var(--pr-muted); transition: transform 0.2s; }
.pr-block[data-state="open"] .cr { transform: rotate(180deg); }
.pr .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--t-border-hi); }
.pr .dot.on { background: var(--acc); }

.pr-menu { min-width: 210px; padding: 5px; }
.pr-item { gap: 10px; padding: 8px 10px; border-radius: var(--t-r-sm); letter-spacing: 0; font-size: 13px; }
.pr-item .txt { display: flex; flex-direction: column; min-width: 0; }
.pr-item .txt b { font-weight: 600; color: var(--pr-text); }
.pr-item .txt small { font-family: var(--pr-mono); font-size: 10px; color: var(--pr-muted); margin-top: 2px; letter-spacing: 0.04em; }
.pr-item .ck { margin-left: auto; color: var(--pr-text); flex-shrink: 0; }
.pr-item.danger .txt b { color: var(--acc); }
.pr-sep { height: 1px; margin: 5px 4px; background: var(--t-border); }

/* ljestvica I–V: jačina, ne boja */
.pr .sw { display: inline-grid; place-items: center; min-width: 22px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 3px;
  font-family: var(--fd); font-weight: 700; font-size: 11px; line-height: 1; border: 1px solid transparent; }
.pr [data-p="1"] { --pr-bg: var(--acc); --pr-fg: #fff; --pr-bd: transparent; }
.pr [data-p="2"] { --pr-bg: color-mix(in srgb, var(--acc) 18%, var(--t-s2)); --pr-fg: color-mix(in srgb, var(--acc) 55%, var(--pr-text)); --pr-bd: color-mix(in srgb, var(--acc) 50%, transparent); }
.pr [data-p="3"] { --pr-bg: var(--t-hi); --pr-fg: var(--pr-text); --pr-bd: var(--t-border-hi); }
.pr [data-p="4"] { --pr-bg: var(--t-s3); --pr-fg: var(--pr-dim); --pr-bd: var(--t-border); }
.pr [data-p="5"] { --pr-bg: var(--t-s2); --pr-fg: var(--pr-muted); --pr-bd: var(--t-border); }
.pr .sw[data-p] { background: var(--pr-bg); color: var(--pr-fg); border-color: var(--pr-bd); }

.pr-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 16px; }
.pr-lg { display: inline-flex; align-items: center; gap: 7px; font-family: var(--pr-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pr-muted); }

/* mreža: fiksni stupci i visina — svaka pločica jednake veličine u svakom stanju.
   Bez transform/filter na pločici: izbornik prioriteta se otvara unutar nje (bez portala) i bio bi odrezan. */
/* bez position/z-index: izbornik prioriteta je unutar mreže i mora moći iznad svega što slijedi */
.pr-scroll { overflow-x: auto; margin: 0 -4px; padding: 0 4px 2px; }
.pr-grid { display: grid; grid-template-columns: 92px repeat(7, minmax(0, 1fr)); grid-auto-rows: auto; gap: 6px; min-width: 640px; align-items: center; }
.pr-dh { text-align: center; font-family: var(--pr-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; color: var(--pr-muted); padding-bottom: 2px; }
.pr-dh.we { color: color-mix(in srgb, var(--pr-muted) 60%, transparent); }
.pr-lift { font-family: var(--fd); font-weight: 700; font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--pr-text); }

.pr-tile { position: relative; height: 88px; min-width: 0; display: flex; flex-direction: column; overflow: hidden; border-radius: var(--t-r-sm);
  background: var(--well-bg, rgba(0,0,0,0.3)); box-shadow: var(--well-shadow, inset 0 1px 3px rgba(0,0,0,0.6)); transition: box-shadow 0.15s; }
.pr-tile[data-p] { background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 55%), var(--pr-bg); color: var(--pr-fg);
  box-shadow: inset 0 0 0 1px var(--pr-bd), inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 14px -8px rgba(0,0,0,0.9); }
.pr-pick { flex: 1; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 4px;
  padding: 10px 10px 6px; background: none; border: 0; color: inherit; cursor: pointer; text-align: left; font: inherit; }
.pr-pick.as-text { cursor: default; }
.pr-pick .r { font-family: var(--fd); font-weight: 700; font-size: 24px; line-height: 0.9; letter-spacing: 0.01em; }
.pr-pick .l { font-family: var(--pr-mono); font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.pr-plus { margin: auto; font-family: var(--fd); font-size: 20px; color: var(--pr-muted); opacity: 0; transition: opacity 0.15s; }
.pr-tile:not([data-p]):hover .pr-plus, .pr-pick:focus-visible .pr-plus { opacity: 1; }
.pr-tile:not([data-p]):hover { box-shadow: var(--well-shadow, inset 0 1px 3px rgba(0,0,0,0.6)), inset 0 0 0 1px var(--t-border-hi); }
.pr-pick:focus-visible { outline: 2px solid var(--pr-text); outline-offset: -2px; border-radius: var(--t-r-sm); }
.pr-ex { width: 100%; box-sizing: border-box; flex-shrink: 0; height: 26px; padding: 0 10px; border: 0; border-top: 1px solid color-mix(in srgb, var(--pr-fg) 22%, transparent);
  background: rgba(0,0,0,0.22); color: inherit; font-family: var(--fm); font-size: 12px; font-weight: 600; outline: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; }
.pr-ex::placeholder { color: inherit; opacity: 0.55; font-weight: 500; }
.pr-ex:focus { background: rgba(0,0,0,0.38); }
.pr-dash { margin: auto; width: 10px; height: 2px; border-radius: 1px; background: var(--t-border-hi); }

.pr-hint { margin-top: 14px; font-family: var(--pr-mono); font-size: 10px; letter-spacing: 0.04em; color: var(--pr-muted); }
.pr-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--t-border); }
.pr-foot .pr-legend { margin-bottom: 0; }
.pr-hold-hint { font-family: var(--pr-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--pr-muted) 50%, transparent); }
/* lifterova kartica (bez izbornika) ima vlastiti sloj, pa podloga za "drži" ide iza sadržaja */
.pr-view .pr-card { isolation: isolate; }
.pr-hold-fill { position: absolute; inset: 0; z-index: -1; background: color-mix(in srgb, var(--acc) 8%, transparent); animation: prFill 0.7s linear forwards; pointer-events: none; }
.pr-hold-txt { font-family: var(--pr-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--acc); }
@keyframes prFill { from { opacity: 0; } to { opacity: 1; } }
.pr-empty, .pr-loading { padding: 40px 16px; text-align: center; font-family: var(--pr-mono); font-size: 12px; color: var(--pr-muted); }

@media (max-width: 640px) {
  .pr-card { padding: 16px 14px; }
  .pr-title { font-size: 20px; }
  .pr-grid { grid-template-columns: 70px repeat(7, minmax(0, 1fr)); gap: 4px; min-width: 520px; }
  .pr-lift { font-size: 14px; }
  .pr-tile { height: 70px; }
  .pr-pick { padding: 8px 7px 4px; }
  .pr-pick .r { font-size: 19px; }
  .pr-pick .l { display: none; }
  .pr-ex { height: 22px; padding: 0 6px; font-size: 10.5px; }
}
@media (prefers-reduced-motion: reduce) { .pr-in, .pr-hold-fill { animation: none; } .pr-tile { transition: none; } }
`
