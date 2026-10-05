'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Check, ChevronDown, Loader2, Minus, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LIFTS, one, type Top } from './PrevBlockLifts'
import { RPE_ROWS, weightFromRpe } from './training-setplan'
import { COMP_CATEGORIES, LIFT_OF_CATEGORY, pctForExercise, type LiftK } from './lift-variations'
import {
  MAIN, MAX_TOPS, autoExtra1rm, backoffBaseIndex, backoffFromJson, emptyPlan, extra1rm, extrasFromJson, extrasToJson,
  moveTop, newExtra, newTop, planReady, planWeeks, topOrder, topsFromJson, topsToJson,
  type BackoffFrom, type ExtraLift, type ExtraTop, type LiftPlan,
} from './block-planner-calc'
import {
  BLOCK_SHAPE_SELECT, blockShapeFrom, planApply, targetSummary,
  type BlockShape, type PlanEntry, type TopSetPlan,
} from '@/lib/block-plan-apply'

/**
 * Planer bloka (trener/admin) + prikaz napretka (lifter).
 *
 * Trener upiše po liftu: 1RM, top setove (glavni + do tri dodatna, svaki od
 * kilaže na početku do kilaže na kraju bloka), broj backoff serija i postotak,
 * pa dodatne varijacije s RPE-om od početnog do završnog. Iz toga se izračuna
 * svaki tjedan; glavni top set smije se pregaziti ručnim upisom.
 *
 * "UPIŠI U BLOK" postavlja trenutni blok prema projekciji — broj serija, ★ i
 * backoff — a pregled iznad gumba unaprijed pokazuje što će se promijeniti.
 *
 * Lifter vidi cilj (KRAJ BLOKA) i svoj napredak po tjednima — najteži ODRAĐENI
 * set natjecateljske varijante, kao i prije.
 *
 * Ciljevi i plan žive u block_projections; target_min/max je i dalje cilj koji
 * čita block-suggestions.tsx, pa prijedlozi kilaža rade nepromijenjeno.
 */

const supabase = createClient()

type LiftKey = LiftK
const LIFT_KEY: Record<string, LiftKey> = { SQUAT: 'squat', BENCH: 'bench', DEADLIFT: 'deadlift' }
const COMP_CATEGORY: Record<LiftKey, string> = { squat: 'Squat', bench: 'Bench', deadlift: 'Deadlift' }

type Projection = { min: number; max: number | null }
type WeekTop = { week: number; top: Top }
type LiftData = { weeks: WeekTop[]; projection: Projection | null; plan: LiftPlan }
type ExRow = { id: string; name: string; category: string }
type Loaded = {
  totalWeeks: number
  lifts: Record<LiftKey, LiftData>
  /** comp vježba koja je već u bloku (ili zadana iz baze) — u nju planer upisuje */
  compExercise: Partial<Record<LiftKey, ExRow>>
  variations: ExRow[]
}

const fmtKg = (n: number) => String(Math.round(n * 100) / 100)
const fmtProj = (p: Projection) => (p.max == null ? fmtKg(p.min) : `${fmtKg(p.min)}–${fmtKg(p.max)}`)
const half = (n: number) => Math.round(n * 2) / 2
const repsNum = (r: string) => parseFloat(r) || 0
const plate = (n: number) => Math.round(n / 2.5) * 2.5
const rng = (a: number, b: number) => (a === b ? fmtKg(a) : `${fmtKg(Math.min(a, b))}–${fmtKg(Math.max(a, b))}`)
const numOrNull = (v: string) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null }

function plannedWeeks(anchorWeek: number, anchorKg: number, target: number, lastWeek: number): Map<number, number> {
  const out = new Map<number, number>()
  if (lastWeek <= anchorWeek) return out
  const span = lastWeek - anchorWeek
  for (let w = anchorWeek + 1; w <= lastWeek; w++) {
    out.set(w, w === lastWeek ? target : plate(anchorKg + (target - anchorKg) * (w - anchorWeek) / span))
  }
  return out
}


// ── učitavanje ────────────────────────────────────────────────────
async function loadProjections(athleteId: string, blockId: string): Promise<Loaded> {
  const [projRes, weeksRes, wesRes, exRes] = await Promise.all([
    supabase.from('block_projections').select('*').eq('block_id', blockId),
    supabase.from('weeks').select('week_number').eq('block_id', blockId),
    // Pripadnost bloku isključivo relacijom workout → week → block (datumi blokova su nepouzdani)
    supabase.from('workout_exercises')
      // setovi dolaze u istom upitu — prije je to bio drugi, uzastopni round-trip
      .select('id, planned_reps, exercises(id, name, category), workouts!inner(athlete_id, weeks!inner(week_number, block_id)), set_logs(weight_kg, reps, rpe, completed)')
      .eq('workouts.athlete_id', athleteId)
      .eq('workouts.weeks.block_id', blockId)
      .eq('set_logs.completed', true)
      .not('set_logs.weight_kg', 'is', null),
    supabase.from('exercises').select('id, name, category')
      .in('category', ['Squat', 'Bench', 'Deadlift', 'Squat Variation', 'Bench Variation', 'Deadlift Variation']),
  ])
  if (projRes.error) throw projRes.error
  if (weeksRes.error) throw weeksRes.error
  if (wesRes.error) throw wesRes.error
  if (exRes.error) throw exRes.error

  const weekNums = (weeksRes.data ?? []).map((w: any) => Number(w.week_number)).filter(Boolean)
  const totalWeeks = weekNums.length ? Math.max(...weekNums) : 0

  const lifts: Record<LiftKey, LiftData> = {
    squat: { weeks: [], projection: null, plan: emptyPlan(totalWeeks) },
    bench: { weeks: [], projection: null, plan: emptyPlan(totalWeeks) },
    deadlift: { weeks: [], projection: null, plan: emptyPlan(totalWeeks) },
  }

  const allEx = (exRes.data ?? []) as ExRow[]
  const exById = new Map(allEx.map(e => [e.id, e]))

  for (const p of (projRes.data ?? []) as any[]) {
    const k = p.lift as LiftKey
    if (!lifts[k]) continue
    // numeric kolone stižu kao stringovi
    const n = (v: unknown) => (v == null ? null : Number(v))
    lifts[k].projection = { min: Number(p.target_min), max: p.target_max != null ? Number(p.target_max) : null }
    lifts[k].plan = {
      weeks: totalWeeks,
      primary1rm: n(p.primary_1rm),
      startKg: n(p.start_kg),
      endKg: Number(p.target_min),
      primaryReps: p.primary_reps ?? 3,
      primaryBackoffSets: p.primary_backoff_sets ?? 0,
      primaryBackoffPct: n(p.primary_backoff_pct) ?? 92.5,
      // stupac se zove po starom "drugom top setu", a sad nosi listu dodatnih
      primaryTops: topsFromJson(p.primary_top2),
      primaryBackoffFrom: backoffFromJson(p.primary_top2?.backoffFrom),
      extras: extrasFromJson(p.extra_lifts, id => exById.get(id)?.name ?? null),
      weekOverrides: (p.week_overrides ?? {}) as Record<string, number>,
    }
  }

  // comp vježbe koje su stvarno u bloku + najteži odrađeni set po tjednu
  const compInBlock: Partial<Record<LiftKey, ExRow>> = {}
  const meta = new Map<string, { key: LiftKey; week: number; plannedReps: string | null }>()
  const sets: any[] = []
  for (const r of (wesRes.data ?? []) as any[]) {
    const ex = one<any>(r.exercises)
    const wk = one<any>(one<any>(r.workouts)?.weeks)
    if (!ex || !wk) continue
    const key = LIFT_OF_CATEGORY[ex.category]
    if (!key) continue
    if (COMP_CATEGORIES.has(ex.category) && !compInBlock[key]) compInBlock[key] = { id: ex.id, name: ex.name, category: ex.category }
    if (!COMP_CATEGORIES.has(ex.category)) continue
    meta.set(r.id, { key, week: wk.week_number, plannedReps: r.planned_reps })
    for (const sl of (r.set_logs ?? []) as any[]) sets.push({ ...sl, workout_exercise_id: r.id })
  }
  // blok još nema taj lift → zadana comp vježba iz baze
  for (const k of Object.keys(lifts) as LiftKey[]) {
    if (!compInBlock[k]) {
      const cand = allEx.filter(e => e.category === COMP_CATEGORY[k])
      compInBlock[k] = cand.find(e => /comp/i.test(e.name)) ?? cand[0]
    }
  }

  if (sets.length > 0) {
    const best = new Map<string, WeekTop & { key: LiftKey }>()
    for (const s of sets) {
      const m = meta.get(s.workout_exercise_id)
      if (!m) continue
      const kg = Number(s.weight_kg)
      if (!kg) continue
      const logged = s.reps != null && String(s.reps).trim() !== ''
      const reps = logged ? String(s.reps).trim() : (m.plannedReps ?? '')
      const rpe = s.rpe != null && s.rpe !== '' ? Number(s.rpe) : null
      const top: Top = { kg, reps, fromPlan: !logged && !!reps, rpe, e1rm: null }
      const id = `${m.key}:${m.week}`
      const cur = best.get(id)
      if (!cur || kg > cur.top.kg || (kg === cur.top.kg && repsNum(reps) > repsNum(cur.top.reps))) {
        best.set(id, { key: m.key, week: m.week, top })
      }
    }
    for (const wt of best.values()) lifts[wt.key].weeks.push({ week: wt.week, top: wt.top })
    for (const k of Object.keys(lifts) as LiftKey[]) lifts[k].weeks.sort((a, b) => a.week - b.week)
  }

  return {
    totalWeeks,
    lifts,
    compExercise: compInBlock,
    variations: allEx.filter(e => e.category.endsWith('Variation')),
  }
}

/** Oblik bloka (treninzi, serije, ★) za pregled promjena — isti koji čita ruta. */
async function loadBlockShape(athleteId: string, blockId: string): Promise<BlockShape> {
  const { data, error } = await supabase.from('workouts')
    .select(BLOCK_SHAPE_SELECT)
    .eq('athlete_id', athleteId)
    .eq('weeks.block_id', blockId)
  if (error) throw error
  return blockShapeFrom(data ?? [])
}

// ── stilovi ───────────────────────────────────────────────────────
const eyebrow: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.22em', color: '#777', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }
const inputBase: CSSProperties = { background: 'var(--t-s2)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '7px 9px', color: '#f0f0f0', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9rem', outline: 'none', minWidth: 0, width: '100%', boxSizing: 'border-box' }
const th: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.16em', color: '#777', fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'center' }
const td: CSSProperties = { padding: '7px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem', color: '#e8e8e8', fontVariantNumeric: 'tabular-nums' }
const tdLabel: CSSProperties = { ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, fontSize: '0.5rem', letterSpacing: '0.12em', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }
const REPS_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const GOLD = '#facc15'
const CYAN = '#22d3ee'
const GREEN = '#4ade80'
/** Walter ih zove po redu: primarni, sekundarni, tercijarni, kvartarni… */
const ORDINAL = ['SEKUNDARNI', 'TERCIJARNI', 'KVARTARNI', 'KVINTARNI']
const extraLabel = (i: number) => ORDINAL[i] ?? `${i + 2}. LIFT`

function RowStat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', color: '#666', whiteSpace: 'normal', lineHeight: 1.3 }}>{label}</span>
      <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.1, color: tone ?? '#e8e8e8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

/** Broj koji se ugodno tipka: lokalni tekst, promjena gore ide na blur. */
function NumInput({ value, onCommit, placeholder, unit, ariaLabel, tone }: {
  value: number | null; onCommit: (v: number | null) => void
  placeholder?: string; unit?: string; ariaLabel: string; tone?: string
}) {
  const [text, setText] = useState(value == null ? '' : fmtKg(value))
  useEffect(() => { setText(value == null ? '' : fmtKg(value)) }, [value])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
      <input value={text} inputMode="decimal" placeholder={placeholder} aria-label={ariaLabel}
        onChange={e => setText(e.target.value)}
        onBlur={() => onCommit(numOrNull(text))}
        onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
        style={{ ...inputBase, padding: '6px 7px', fontSize: '0.84rem', color: tone ?? inputBase.color }} />
      {unit && <span style={{ fontSize: '0.5rem', color: '#666', flexShrink: 0, letterSpacing: '0.06em' }}>{unit}</span>}
    </div>
  )
}

/** Polje s oznakom iznad — za 1RM, postotak i sl. */
function NumField({ label, value, onCommit, placeholder, suffix }: {
  label: string; value: number | null; onCommit: (v: number | null) => void
  placeholder?: string; suffix?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', whiteSpace: 'normal', lineHeight: 1.3 }}>{label}</span>
      <NumInput value={value} onCommit={onCommit} placeholder={placeholder} unit={suffix} ariaLabel={label} />
    </label>
  )
}

/**
 * Smjer backoff serija: dolje (pad, npr. 92.5 % prethodne) ili gore (skok, npr.
 * 107.5 %). Postotak je uvijek udio PRETHODNE serije, pa strelica samo zrcali
 * vrijednost oko 100 i ostaje jedan broj u bazi.
 */
function DirToggle({ pct, onChange }: { pct: number; onChange: (v: number) => void }) {
  const up = pct > 100
  const delta = Math.abs(100 - pct) || 7.5
  const btn = (on: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
    padding: '6px 9px', borderRadius: '7px', cursor: 'pointer', flex: 1, minWidth: 0,
    background: on ? 'var(--t-s3)' : 'transparent',
    border: `1px solid ${on ? GOLD : 'var(--t-border)'}`,
    color: on ? GOLD : '#888',
    fontFamily: 'var(--fm)', fontSize: '0.52rem', letterSpacing: '0.12em', fontWeight: 700,
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', whiteSpace: 'normal', lineHeight: 1.3 }}>Smjer</span>
      <div style={{ display: 'flex', gap: '5px' }}>
        <button type="button" style={btn(!up)} onClick={() => onChange(100 - delta)} aria-pressed={!up}>
          <ArrowDown size={11} /> PAD
        </button>
        <button type="button" style={btn(up)} onClick={() => onChange(100 + delta)} aria-pressed={up}>
          <ArrowUp size={11} /> SKOK
        </button>
      </div>
    </div>
  )
}

/** Broj serija — plus/minus, jer se u Excelu to klikalo strelicama. */
function Stepper({ label, value, onChange, min = 0, max = 10 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  const btn: CSSProperties = { width: '26px', height: '30px', display: 'grid', placeItems: 'center', background: 'var(--t-s3)', border: '1px solid var(--t-border)', borderRadius: '7px', color: '#ccc', cursor: 'pointer', flexShrink: 0 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', whiteSpace: 'normal', lineHeight: 1.3 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button type="button" aria-label="Manje" onClick={() => onChange(Math.max(min, value - 1))} style={btn}><Minus size={12} /></button>
        <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '1rem', color: '#f0f0f0', minWidth: '20px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <button type="button" aria-label="Više" onClick={() => onChange(Math.min(max, value + 1))} style={btn}><Plus size={12} /></button>
      </div>
    </div>
  )
}

/**
 * Top setovi jednog lifta kao kompaktna tablica, redoslijedom kojim stoje u
 * bloku (S1, S2…). Glavni (★) nosi plan lifta — kilažu (primarni) ili RPE
 * (varijacije) — a dodatni idu od kilaže na početku do kilaže na kraju bloka.
 * Strelice pomiču dodatni top set kroz redoslijed, i preko glavnog.
 */
type MainTop = {
  reps: number; start: number | null; end: number | null
  unit: 'kg' | 'RPE'
  onChange: (patch: { reps?: number; start?: number | null; end?: number | null }) => void
}

function TopSetsEditor({ main, tops, onTops }: { main: MainTop; tops: ExtraTop[]; onTops: (t: ExtraTop[]) => void }) {
  const order = topOrder(tops)
  const cols = '50px 54px minmax(0,1fr) minmax(0,1fr) 72px'
  const iconBtn = (disabled = false): CSSProperties => ({
    width: '22px', height: '26px', display: 'grid', placeItems: 'center', background: 'transparent',
    border: '1px solid var(--t-border)', borderRadius: '6px', color: disabled ? '#3a3a3a' : '#999',
    cursor: disabled ? 'default' : 'pointer', padding: 0, flexShrink: 0,
  })
  const patchTop = (i: number, patch: Partial<ExtraTop>) => onTops(tops.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const full = tops.length + 1 >= MAX_TOPS

  return (
    <div style={{ border: '1px solid var(--t-border)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '7px 9px', background: 'var(--t-s2)', alignItems: 'center' }}>
        {['SERIJA', 'PON.', 'POČETAK', 'KRAJ', ''].map((h, i) => (
          <span key={i} style={{ ...eyebrow, fontSize: '0.44rem', letterSpacing: '0.14em' }}>{h}</span>
        ))}
      </div>

      {order.map((idx, pos) => {
        const isMain = idx === -1
        const t = isMain ? null : tops[idx]
        return (
          <div key={isMain ? 'main' : t!.id}
            style={{ display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '7px 9px', alignItems: 'center', borderTop: '1px solid var(--t-border)', background: isMain ? 'rgba(250,204,21,0.04)' : 'transparent' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem', color: isMain ? GOLD : CYAN }}>
              S{pos + 1}{isMain && <span title="Glavni top set — od njega kreće backoff" style={{ fontSize: '0.7rem' }}>★</span>}
            </span>
            {isMain ? (
              <>
                <NumInput ariaLabel="Ponavljanja glavnog top seta" value={main.reps} onCommit={v => main.onChange({ reps: Math.max(1, Math.round(v ?? 1)) })} />
                <NumInput ariaLabel={`Početak bloka (${main.unit})`} value={main.start} unit={main.unit} placeholder={main.unit === 'kg' ? '160' : '7'} onCommit={v => main.onChange({ start: v })} />
                <NumInput ariaLabel={`Kraj bloka (${main.unit})`} value={main.end} unit={main.unit} placeholder={main.unit === 'kg' ? '185' : '9'} onCommit={v => main.onChange({ end: v })} />
                <span style={{ fontSize: '0.44rem', letterSpacing: '0.14em', color: '#777', fontWeight: 700, textAlign: 'right' }}>GLAVNI</span>
              </>
            ) : (
              <>
                <NumInput ariaLabel={`Ponavljanja, serija ${pos + 1}`} value={t!.reps} onCommit={v => patchTop(idx, { reps: Math.max(1, Math.round(v ?? 1)) })} />
                <NumInput ariaLabel={`Početak bloka, serija ${pos + 1}`} value={t!.startKg} unit="kg" tone={CYAN} onCommit={v => patchTop(idx, { startKg: v })} />
                <NumInput ariaLabel={`Kraj bloka, serija ${pos + 1}`} value={t!.endKg} unit="kg" tone={CYAN} onCommit={v => patchTop(idx, { endKg: v })} />
                <div style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end' }}>
                  <button type="button" aria-label="Pomakni ranije" disabled={pos === 0} onClick={() => onTops(moveTop(tops, idx, -1))} style={iconBtn(pos === 0)}><ArrowUp size={11} /></button>
                  <button type="button" aria-label="Pomakni kasnije" disabled={pos === order.length - 1} onClick={() => onTops(moveTop(tops, idx, 1))} style={iconBtn(pos === order.length - 1)}><ArrowDown size={11} /></button>
                  <button type="button" aria-label="Ukloni top set" onClick={() => onTops(tops.filter((_, j) => j !== idx))} style={iconBtn()}><Trash2 size={11} /></button>
                </div>
              </>
            )}
          </div>
        )
      })}

      <button type="button" disabled={full} onClick={() => onTops([...tops, newTop()])}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px', borderTop: '1px solid var(--t-border)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', background: 'transparent', color: full ? '#555' : '#aaa', cursor: full ? 'default' : 'pointer', fontFamily: 'var(--fm)', fontSize: '0.52rem', letterSpacing: '0.16em', fontWeight: 700 }}>
        <Plus size={12} /> {full ? `NAJVIŠE ${MAX_TOPS} TOP SETA` : 'DODAJ TOP SET'}
        <span style={{ color: '#666', marginLeft: '4px' }}>{tops.length + 1}/{MAX_TOPS}</span>
      </button>
    </div>
  )
}

/**
 * Backoff: broj serija, postotak prethodne, smjer i od kojeg top seta kreće.
 * "OD" se pokazuje tek kad ima više top setova — s jednim nema izbora.
 */
function BackoffRow({ sets, pct, onSets, onPct, tops, from, onFrom }: {
  sets: number; pct: number; onSets: (v: number) => void; onPct: (v: number) => void
  tops: ExtraTop[]; from: BackoffFrom; onFrom: (v: BackoffFrom) => void
}) {
  const order = topOrder(tops)
  const active = backoffBaseIndex(tops, from)
  const chip = (on: boolean): CSSProperties => ({
    minWidth: '30px', height: '30px', padding: '0 6px', borderRadius: '7px', cursor: 'pointer',
    background: on ? 'rgba(107,140,255,0.16)' : 'transparent',
    border: `1px solid ${on ? '#6b8cff' : 'var(--t-border)'}`, color: on ? '#9db0ff' : '#888',
    fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem',
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '9px', marginTop: '10px' }}>
      <Stepper label="Backoff serija" value={sets} onChange={onSets} />
      <NumField label="% prethodne serije" value={pct} suffix="%" onCommit={v => onPct(v ?? 92.5)} />
      <DirToggle pct={pct} onChange={onPct} />
      {order.length > 1 && sets > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', whiteSpace: 'normal', lineHeight: 1.3 }}>Backoff od</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {order.map((idx, pos) => (
              <button key={idx === -1 ? 'main' : tops[idx].id} type="button" aria-pressed={pos === active}
                title={`Prvi backoff = ${fmtKg(pct)} % serije S${pos + 1}, s njenim ponavljanjima`}
                onClick={() => onFrom(idx === -1 ? MAIN : tops[idx].id)} style={chip(pos === active)}>
                S{pos + 1}{idx === -1 ? '★' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Top setovi jednog lifta za upis, redoslijedom u bloku. */
function entryFor(exerciseId: string, label: string, mainTop: TopSetPlan, extra: ExtraTop[], extraKgs: (number | null)[],
  backoffSets: number, backoffPct: number, backoffFrom: BackoffFrom, rpe: number | null): PlanEntry {
  const order = topOrder(extra)
  return {
    exerciseId, label,
    tops: order.map(i => (i === -1 ? mainTop : { kg: extraKgs[i] ?? null, reps: extra[i].reps })),
    mainIndex: order.indexOf(-1),
    backoffFrom: backoffBaseIndex(extra, backoffFrom),
    backoffSets, backoffPct, rpe,
  }
}

// ── planer (trener/admin) ─────────────────────────────────────────
function LiftPlanner({ lift, label, data, compEx, variations, blockId, onPlan, onProjection, onApplied, shape, shapeError, reloadShape }: {
  lift: LiftKey; label: string; data: LiftData; compEx: ExRow | undefined; variations: ExRow[]
  shape: BlockShape | null; shapeError: string | null; reloadShape: () => Promise<void>
  blockId: string; onPlan: (p: LiftPlan) => void; onProjection: (p: Projection | null) => void
  onApplied?: () => void
}) {
  const plan = data.plan
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [apply, setApply] = useState<'idle' | 'busy' | 'done'>('idle')
  const [applyMsg, setApplyMsg] = useState('')
  const [applySkipped, setApplySkipped] = useState<string[]>([])
  const [showTable, setShowTable] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const set = (patch: Partial<LiftPlan>) => onPlan({ ...plan, ...patch })
  const rows = useMemo(() => planWeeks(plan), [plan])
  const varOptions = variations.filter(v => LIFT_OF_CATEGORY[v.category] === lift)

  const setExtra = (id: string, patch: Partial<ExtraLift>) =>
    set({ extras: plan.extras.map(e => (e.id === id ? { ...e, ...patch } : e)) })
  const addExtra = () => set({ extras: [...plan.extras, newExtra()] })
  const removeExtra = (id: string) => set({ extras: plan.extras.filter(e => e.id !== id) })

  const save = async (): Promise<boolean> => {
    if (plan.endKg == null) { setStatus('error'); setErr('Upiši kilažu na kraju bloka — bez nje se plan ne može spremiti.'); return false }
    setStatus('saving'); setErr('')
    const { error } = await supabase.from('block_projections').upsert({
      block_id: blockId, lift,
      target_min: plan.endKg,
      target_max: data.projection?.max ?? null,
      start_kg: plan.startKg,
      primary_1rm: plan.primary1rm,
      primary_reps: plan.primaryReps,
      primary_backoff_sets: plan.primaryBackoffSets,
      primary_backoff_pct: plan.primaryBackoffPct,
      // objekt, ne goli niz — stupac je nastao za jedan "drugi top set"
      primary_top2: { tops: topsToJson(plan.primaryTops), backoffFrom: plan.primaryBackoffFrom },
      extra_lifts: extrasToJson(plan.extras),
      week_overrides: plan.weekOverrides,
    }, { onConflict: 'block_id,lift' })
    if (error) { setStatus('error'); setErr('Greška pri spremanju: ' + error.message); return false }
    onProjection({ min: plan.endKg, max: data.projection?.max ?? null })
    setStatus('saved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1500)
    return true
  }

  // Što projekcija traži od bloka, tjedan po tjedan
  const weekEntries = useMemo(() => rows.map(r => {
    const entries: PlanEntry[] = []
    if (compEx) {
      entries.push(entryFor(compEx.id, compEx.name, { kg: r.primaryKg, reps: plan.primaryReps },
        plan.primaryTops, r.primaryTopKgs, plan.primaryBackoffSets, plan.primaryBackoffPct, plan.primaryBackoffFrom, null))
    }
    plan.extras.forEach((e, i) => {
      if (!e.exerciseId) return
      const w = r.extras[i]
      entries.push(entryFor(e.exerciseId, e.exerciseName ?? extraLabel(i), { kg: w?.kg ?? null, reps: e.reps },
        e.tops, w?.topKgs ?? [], e.backoffSets, e.backoffPct, e.backoffFrom, w?.rpe ?? null))
    })
    return { week: r.week, entries }
  }), [rows, plan, compEx])

  const preview = useMemo(() => (shape ? planApply(weekEntries, shape) : null), [weekEntries, shape])
  const ready = planReady(plan)
  const canApply = !!preview && preview.targets.length > 0 && ready.ok && !!compEx
  const changes = (preview?.targets ?? []).filter(t => targetSummary(t) != null)

  // stanje po tjednu za red PROMJENA: + dodaje, Δ preslaguje, – preskače, ✓ samo kilaže
  const weekMark = (week: number): { sym: string; color: string; title: string } => {
    const ts = (preview?.targets ?? []).filter(t => t.week === week)
    const sk = (preview?.skips ?? []).filter(s => s.week === week)
    const notes = [
      ...ts.map(t => { const s = targetSummary(t); return s ? `${t.entry.label}: ${s}` : null }).filter(Boolean),
      ...sk.map(s => `${s.label}: ${s.reason}`),
    ].join('\n')
    if (ts.some(t => t.kind === 'insert')) return { sym: '+', color: CYAN, title: notes }
    if (ts.some(t => t.kind === 'update' && t.change)) return { sym: 'Δ', color: GOLD, title: notes }
    if (sk.length > 0) return { sym: '–', color: '#777', title: notes }
    return { sym: '✓', color: GREEN, title: 'Struktura odgovara — upis mijenja samo kilaže' }
  }

  // što je trenutno u bloku na top setovima primarnog lifta — za usporedbu u tablici
  const inBlock = new Map<number, (number | null)[]>((preview?.targets ?? [])
    .filter(t => t.kind === 'update' && t.entry.exerciseId === compEx?.id)
    .map((t): [number, (number | null)[]] => {
      const r = (t as Extract<typeof t, { kind: 'update' }>).row
      return [t.week, r.topSets.map(n => r.weights[n] ?? null)]
    }))

  const applyToBlock = async () => {
    if (!canApply) return
    setApply('busy'); setApplyMsg(''); setApplySkipped([])
    if (!(await save())) { setApply('idle'); return }

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/apply-block-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ blockId, weeks: weekEntries }),
    }).then(r => r.json()).catch(() => ({ error: 'Mreža nije dostupna' }))

    const d = res?.data ?? {}
    if (Array.isArray(d.skipped)) setApplySkipped(d.skipped)
    if (res?.error) {
      setApply('idle')
      setApplyMsg('Greška: ' + res.error)
      reloadShape()
      if (d.updated || d.created) onApplied?.() // dio je upisan — blok u panelu je zastario
      return
    }
    setApply('done')
    const parts = [`${(d.updated ?? 0) + (d.created ?? 0)} vježbi`]
    if (d.restructured) parts.push(`${d.restructured} preslagano`)
    if (d.created) parts.push(`${d.created} dodano`)
    setApplyMsg('Upisano: ' + parts.join(' · '))
    reloadShape()
    onApplied?.() // blok u panelu je sad zastario — bez ovoga ostaju stare kilaže na ekranu
  }

  const done = new Map(data.weeks.map(w => [w.week, w.top]))
  const primaryOrder = topOrder(plan.primaryTops)

  return (
    <div style={{ padding: '14px 16px 18px' }}>
      {/* PRIMARNI */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem', paddingBottom: '8px' }}>PRIMARNI · {compEx?.name ?? label}</div>
        <div style={{ width: '130px' }}>
          <NumField label="1RM" value={plan.primary1rm} suffix="kg" placeholder="200" onCommit={v => set({ primary1rm: v })} />
        </div>
      </div>
      <TopSetsEditor
        main={{
          reps: plan.primaryReps, start: plan.startKg, end: plan.endKg, unit: 'kg',
          onChange: p => set({
            ...(p.reps !== undefined ? { primaryReps: p.reps } : {}),
            ...(p.start !== undefined ? { startKg: p.start } : {}),
            ...(p.end !== undefined ? { endKg: p.end } : {}),
          }),
        }}
        tops={plan.primaryTops} onTops={t => set({ primaryTops: t })} />
      <BackoffRow sets={plan.primaryBackoffSets} pct={plan.primaryBackoffPct}
        onSets={v => set({ primaryBackoffSets: v })} onPct={v => set({ primaryBackoffPct: v })}
        tops={plan.primaryTops} from={plan.primaryBackoffFrom} onFrom={v => set({ primaryBackoffFrom: v })} />

      {/* DODATNI LIFTOVI — koliko god ih treba (npr. četiri bencha tjedno) */}
      {plan.extras.map((e, i) => {
        const auto = autoExtra1rm(plan.primary1rm, e.exerciseName)
        const oneRm = e.oneRm ?? auto
        const varPct = pctForExercise(e.exerciseName)
        return (
          <div key={e.id} style={{ border: '1px solid var(--t-border)', borderRadius: '12px', padding: '12px', marginTop: '16px', background: 'rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
              <span style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem' }}>{extraLabel(i)} · {label}</span>
              <button type="button" onClick={() => removeExtra(e.id)} aria-label="Ukloni lift"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', borderRadius: '7px', background: 'transparent', border: '1px solid var(--t-border)', color: '#888', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: '0.5rem', letterSpacing: '0.14em', fontWeight: 700 }}>
                <Trash2 size={11} /> UKLONI
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(110px, 1fr)', gap: '9px', marginBottom: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em' }}>Varijacija</span>
                <select value={e.exerciseId ?? ''}
                  onChange={ev => {
                    const id = ev.target.value || null
                    const ex = varOptions.find(v => v.id === id) ?? null
                    setExtra(e.id, { exerciseId: id, exerciseName: ex?.name ?? null, oneRm: null })
                  }}
                  style={{ ...inputBase, fontFamily: 'var(--fm)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
                  <option value="">— odaberi vježbu —</option>
                  {varOptions.map(v => (
                    <option key={v.id} value={v.id}>{v.name}{pctForExercise(v.name) ? ' · ' + pctForExercise(v.name) + '%' : ''}</option>
                  ))}
                </select>
              </label>
              <NumField label={auto != null && e.oneRm == null ? '1RM (auto ' + (varPct ?? '—') + '%)' : '1RM varijacije'}
                value={oneRm} suffix="kg" onCommit={v => setExtra(e.id, { oneRm: v })} />
            </div>
            <TopSetsEditor
              main={{
                reps: e.reps, start: e.startRpe, end: e.endRpe, unit: 'RPE',
                onChange: p => setExtra(e.id, {
                  ...(p.reps !== undefined ? { reps: p.reps } : {}),
                  ...(p.start !== undefined ? { startRpe: p.start } : {}),
                  ...(p.end !== undefined ? { endRpe: p.end } : {}),
                }),
              }}
              tops={e.tops} onTops={t => setExtra(e.id, { tops: t })} />
            <BackoffRow sets={e.backoffSets} pct={e.backoffPct}
              onSets={v => setExtra(e.id, { backoffSets: v })} onPct={v => setExtra(e.id, { backoffPct: v })}
              tops={e.tops} from={e.backoffFrom} onFrom={v => setExtra(e.id, { backoffFrom: v })} />
          </div>
        )
      })}
      <button type="button" onClick={addExtra}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', width: '100%', marginTop: '14px', padding: '11px', borderRadius: '10px', background: 'transparent', border: '1px dashed var(--t-border-hi)', color: '#aaa', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: '0.58rem', letterSpacing: '0.18em', fontWeight: 700 }}>
        <Plus size={13} /> DODAJ {extraLabel(plan.extras.length)} LIFT
      </button>

      {/* RASPORED PO TJEDNIMA */}
      <div style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem', margin: '20px 0 9px' }}>RASPORED PO TJEDNIMA</div>
      {plan.weeks === 0 ? (
        <div style={{ fontSize: '0.66rem', color: '#666' }}>Blok još nema tjedana.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--t-border)', borderRadius: '10px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--t-s2)' }}>
                <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s2)', zIndex: 1 }}>TJEDAN</th>
                {rows.map(r => <th key={r.week} style={th}>{r.week}.</th>)}
              </tr>
            </thead>
            <tbody>
              <GroupRow label={compEx?.name ?? label} span={rows.length} />
              {primaryOrder.map((idx, pos) => {
                const isMain = idx === -1
                const reps = isMain ? plan.primaryReps : plan.primaryTops[idx].reps
                return (
                  <tr key={isMain ? 'p-main' : plan.primaryTops[idx].id} style={{ borderTop: '1px solid var(--t-border)' }}>
                    <td style={{ ...tdLabel, color: isMain ? GOLD : CYAN }}>S{pos + 1}{isMain ? ' ★' : ''} · {reps}×</td>
                    {rows.map(r => {
                      const kg = isMain ? r.primaryKg : r.primaryTopKgs[idx]
                      const color = kg == null ? '#555' : isMain ? (r.primaryManual ? GOLD : '#e8e8e8') : CYAN
                      return <td key={r.week} style={{ ...td, color }}>{kg != null ? fmtKg(kg) : '—'}</td>
                    })}
                  </tr>
                )
              })}
              <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                <td style={{ ...tdLabel, color: '#666' }}>RUČNO ★</td>
                {rows.map(r => (
                  <td key={r.week} style={{ padding: '4px 5px' }}>
                    <input value={plan.weekOverrides[String(r.week)] ?? ''} inputMode="decimal" placeholder="—" aria-label={`Ručna kilaža glavnog top seta, ${r.week}. tjedan`}
                      onChange={e => {
                        const next = { ...plan.weekOverrides }
                        const v = numOrNull(e.target.value)
                        if (v == null) delete next[String(r.week)]; else next[String(r.week)] = v
                        set({ weekOverrides: next })
                      }}
                      style={{ ...inputBase, padding: '5px 4px', fontSize: '0.72rem', textAlign: 'center', width: '58px' }} />
                  </td>
                ))}
              </tr>

              {plan.extras.map((e, i) => (
                <ExtraRows key={e.id} name={e.exerciseName ?? extraLabel(i)} extra={e} weeks={rows.map(r => ({ week: r.week, ...r.extras[i] }))} span={rows.length} />
              ))}

              <tr style={{ borderTop: '1px solid var(--t-border-hi)' }}>
                <td style={{ ...tdLabel, color: '#666' }}>ODRAĐENO</td>
                {rows.map(r => {
                  const d = done.get(r.week)
                  return <td key={r.week} style={{ ...td, fontSize: '0.7rem', color: d ? '#f0f0f0' : '#444' }}>{d ? fmtKg(d.kg) : '—'}</td>
                })}
              </tr>
              {preview && (
                <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                  <td style={{ ...tdLabel, color: '#666' }}>SAD U BLOKU ★</td>
                  {rows.map(r => {
                    const kgs = inBlock.get(r.week)
                    return (
                      <td key={r.week} style={{ ...td, fontSize: '0.7rem', color: kgs?.length ? '#d4d4d4' : '#444' }}>
                        {kgs?.length ? kgs.map(k => (k != null ? fmtKg(k) : '—')).join(' · ') : '—'}
                      </td>
                    )
                  })}
                </tr>
              )}
              {preview && (
                <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                  <td style={{ ...tdLabel, color: '#666' }}>UPIS</td>
                  {rows.map(r => {
                    const m = weekMark(r.week)
                    return <td key={r.week} title={m.title} style={{ ...td, fontSize: '0.82rem', color: m.color }}>{m.sym}</td>
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PREGLED UPISA — uživo; projekcija ima prednost pred onim što je u bloku */}
      <div style={{ marginTop: '14px', padding: '11px 12px', borderRadius: '10px', border: `1px solid ${canApply ? '#4ade8044' : 'var(--t-border)'}`, background: canApply ? 'rgba(74,222,128,0.04)' : 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <span style={{ ...eyebrow, fontSize: '0.5rem', color: shapeError ? '#f87171' : !ready.ok ? GOLD : canApply ? GREEN : '#888', whiteSpace: 'normal' }}>
            {shapeError ? 'BLOK SE NE MOŽE UČITATI'
              : !preview ? 'UČITAVAM BLOK…'
              : !ready.ok ? 'PLAN NIJE POTPUN'
              : changes.length > 0 ? `UPIS ĆE PRESLOŽITI ${changes.length} ${changes.length === 1 ? 'VJEŽBU' : changes.length < 5 ? 'VJEŽBE' : 'VJEŽBI'}`
              : preview.targets.length > 0 ? 'STRUKTURA ODGOVARA · UPIS MIJENJA SAMO KILAŽE'
              : 'NEMA ŠTO UPISATI'}
          </span>
          <button type="button" onClick={() => reloadShape()}
            style={{ background: 'transparent', border: '1px solid var(--t-border)', borderRadius: '7px', color: '#aaa', cursor: 'pointer', padding: '4px 9px', fontFamily: 'var(--fm)', fontSize: '0.48rem', letterSpacing: '0.14em', fontWeight: 700, flexShrink: 0 }}>
            OSVJEŽI
          </button>
        </div>
        {shapeError && <div style={{ fontSize: '0.62rem', color: '#f87171', marginTop: '6px' }}>{shapeError}</div>}
        {preview && !ready.ok && <div style={{ fontSize: '0.62rem', color: GOLD, marginTop: '6px' }}>{ready.reason}</div>}
        {preview && changes.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: '16px', fontSize: '0.62rem', color: '#d4d4d4', lineHeight: 1.7 }}>
            {changes.slice(0, 10).map((t, i) => (
              <li key={i}>
                <b style={{ color: '#f0f0f0' }}>{t.week}. tj.</b> · {t.entry.label}
                {t.kind === 'update' && t.row.dayName ? ` · ${t.row.dayName}` : ''}:{' '}
                <span style={{ color: t.kind === 'insert' ? CYAN : GOLD }}>{targetSummary(t)}</span>
              </li>
            ))}
            {changes.length > 10 && <li>… i još {changes.length - 10}</li>}
          </ul>
        )}
        {preview && preview.skips.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: '0.6rem', color: '#888', lineHeight: 1.7 }}>
            {preview.skips.slice(0, 6).map((s, i) => <li key={i}>{s.week}. tj. · {s.label}: {s.reason} — ne dira se</li>)}
            {preview.skips.length > 6 && <li>… i još {preview.skips.length - 6}</li>}
          </ul>
        )}
        <div style={{ fontSize: '0.6rem', color: '#8a8a8a', marginTop: '8px', lineHeight: 1.6 }}>
          Projekcija ima prednost: upis postavlja broj serija, ★ top setove, ponavljanja, kilaže i backoff točno prema planu,
          a vježbu koja u tjednu fali dodaje u isti dan kao u ostalim tjednima. Započeti treninzi se ne diraju.
        </div>
      </div>

      {/* akcije */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
        <button type="button" onClick={() => { save() }} disabled={status === 'saving'}
          style={{ padding: '10px 16px', borderRadius: '9px', background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', color: '#e8e8e8', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700, cursor: 'pointer' }}>
          {status === 'saving' ? 'SPREMAM…' : 'SPREMI PLAN'}
        </button>
        <button type="button" onClick={applyToBlock} disabled={!canApply || apply === 'busy'}
          title={!canApply ? (ready.reason ?? 'Pričekaj da se blok učita') : undefined}
          style={{ padding: '10px 16px', borderRadius: '9px', background: canApply ? '#1a3a26' : 'transparent', border: `1px solid ${canApply ? GREEN : 'var(--t-border)'}`, color: canApply ? GREEN : '#555', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700, cursor: canApply ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '7px' }}>
          {apply === 'busy' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          UPIŠI U BLOK
        </button>
        {status === 'saved' && <span style={{ fontSize: '0.62rem', color: GREEN, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> spremljeno</span>}
      </div>
      {status === 'error' && <div style={{ fontSize: '0.64rem', color: '#f87171', marginTop: '8px' }}>{err}</div>}
      {applyMsg && <div style={{ fontSize: '0.64rem', color: apply === 'done' ? GREEN : '#f87171', marginTop: '8px', lineHeight: 1.6 }}>{applyMsg}</div>}
      {applySkipped.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: '0.6rem', color: '#888', lineHeight: 1.7 }}>
          {applySkipped.map((s, i) => <li key={i}>preskočeno · {s}</li>)}
        </ul>
      )}
      <div style={{ fontSize: '0.58rem', color: '#666', marginTop: '10px', lineHeight: 1.6 }}>
        Kilaže idu linearno od početka do kraja bloka, zaokruženo na 2.5 kg. Ručni upis nadjačava glavni top set (žuto),
        dodatni top setovi su plavi. Prva backoff serija je postotak top seta odabranog pod „Backoff od" (zadano glavni ★),
        s njegovim ponavljanjima; svaka sljedeća je postotak prethodne.
      </div>

      {/* DETALJNE TABLICE ZA SEKUNDARNE LIFTOVE */}
      <button type="button" onClick={() => setShowTable(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontFamily: 'var(--fm)', fontSize: '0.56rem', letterSpacing: '0.18em', fontWeight: 700, padding: 0 }}>
        <ChevronDown size={13} style={{ transform: showTable ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        DETALJNE TABLICE ZA SEKUNDARNE LIFTOVE
      </button>
      {showTable && (
        plan.extras.some(e => extra1rm(plan, e) != null) ? (
          <>
            {plan.extras.map(e => {
              const oneRm = extra1rm(plan, e)
              if (oneRm == null) return null
              return (
                <div key={e.id}>
                  <div style={{ ...eyebrow, margin: '10px 0 7px' }}>
                    {e.exerciseName ?? 'varijacija'} · 1RM {fmtKg(oneRm)} kg
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--t-border)', borderRadius: '10px' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr style={{ background: 'var(--t-s2)' }}>
                          <th style={{ ...th, position: 'sticky', left: 0, background: 'var(--t-s2)', zIndex: 1 }}>@</th>
                          {REPS_COLS.map(r => <th key={r} style={th}>x{r}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {RPE_ROWS.map(rpe => (
                          <tr key={rpe} style={{ borderTop: '1px solid var(--t-border)' }}>
                            <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--t-s1)', color: GOLD, fontSize: '0.7rem', zIndex: 1 }}>{rpe}</td>
                            {REPS_COLS.map(r => {
                              const kg = weightFromRpe(oneRm, r, rpe)
                              return <td key={r} style={td}>{kg != null ? fmtKg(kg) : '—'}</td>
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: '0.56rem', color: '#666', lineHeight: 1.6, marginTop: '8px' }}>
              Kilaže su zaokružene na 2.5 kg. Postotak varijacije množi natjecateljski 1RM, a RPE tablica je ista koju
              aplikacija koristi za procjenu 1RM.
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '10px' }}>Odaberi varijaciju i upiši 1RM za tablicu.</div>
        )
      )}
    </div>
  )
}

/** Naslov skupine u tablici rasporeda (jedan lift). */
function GroupRow({ label, span }: { label: string; span: number }) {
  return (
    <tr style={{ borderTop: '1px solid var(--t-border-hi)', background: 'rgba(255,255,255,0.02)' }}>
      <td style={{ ...tdLabel, background: 'var(--t-s2)', color: '#bbb', fontSize: '0.48rem', letterSpacing: '0.16em', padding: '5px 8px' }}>{label}</td>
      <td colSpan={span} style={{ background: 'var(--t-s2)' }} />
    </tr>
  )
}

/** Retci jednog dodatnog lifta: top setovi redoslijedom u bloku, glavni s RPE-om. */
function ExtraRows({ name, extra, weeks, span }: {
  name: string; extra: ExtraLift; span: number
  weeks: { week: number; kg: number | null; rpe: number | null; topKgs: (number | null)[] }[]
}) {
  const order = topOrder(extra.tops)
  return (
    <>
      <GroupRow label={name} span={span} />
      {order.map((idx, pos) => {
        const isMain = idx === -1
        const reps = isMain ? extra.reps : extra.tops[idx].reps
        return (
          <tr key={isMain ? 'main' : extra.tops[idx].id} style={{ borderTop: '1px solid var(--t-border)' }}>
            <td style={{ ...tdLabel, color: isMain ? GREEN : CYAN }}>S{pos + 1}{isMain ? ' ★' : ''} · {reps}×</td>
            {weeks.map(w => {
              const kg = isMain ? w.kg : w.topKgs?.[idx] ?? null
              return (
                <td key={w.week} style={{ ...td, color: kg == null ? '#555' : isMain ? GREEN : CYAN }}>
                  {kg != null ? fmtKg(kg) : '—'}
                  {isMain && kg != null && w.rpe != null && (
                    <div style={{ fontSize: '0.48rem', color: GOLD, fontWeight: 600, marginTop: '2px' }}>@{w.rpe}</div>
                  )}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}

// ── prikaz za liftera (nepromijenjen) ─────────────────────────────
function LiftCard({ label, data, totalWeeks }: { label: string; data: LiftData; totalWeeks: number }) {
  const { weeks, projection: p } = data
  const first = weeks.length ? weeks[0].top.kg : null
  const lastW = weeks.length ? weeks[weeks.length - 1] : null
  const last = lastW ? lastW.top.kg : null

  const lo = p ? p.min : null
  const hi = p ? (p.max ?? p.min) : null
  const remLo = lo != null && last != null ? Math.max(0, lo - last) : null
  const remHi = hi != null && last != null ? hi - last : null
  const reached = remHi != null && remHi <= 0
  const weeksLeft = lastW ? Math.max(0, totalWeeks - lastW.week) : totalWeeks
  const perLo = remLo != null && weeksLeft > 0 ? half(remLo / weeksLeft) : null
  const perHi = remHi != null && remHi > 0 && weeksLeft > 0 ? half(remHi / weeksLeft) : null
  const pct = lo != null && first != null && last != null
    ? (lo > first ? Math.max(0, Math.min(1, (last - first) / (lo - first))) : 1)
    : 0

  const lastWeek = Math.max(totalWeeks, ...weeks.map(w => w.week), 0)
  const weekNums = lastWeek > 0 ? Array.from({ length: lastWeek }, (_, i) => i + 1) : []
  const actual = new Map(weeks.map(w => [w.week, w.top]))
  const plannedLo = lo != null && !reached && lastW && last != null
    ? plannedWeeks(lastW.week, last, Math.max(lo, last), lastWeek) : new Map<number, number>()
  const plannedHi = hi != null && !reached && lastW && last != null
    ? plannedWeeks(lastW.week, last, hi, lastWeek) : new Map<number, number>()
  const isRange = p?.max != null

  return (
    <section style={{ padding: '14px 18px 16px', borderTop: '1px solid var(--t-border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.66rem', letterSpacing: '0.3em', fontWeight: 800, color: '#f0f0f0' }}>{label}</span>
        <span style={{ fontSize: '0.64rem', color: p ? '#4ade80' : '#666', letterSpacing: '0.06em' }}>
          {p ? <>CILJ <strong style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: '#4ade80' }}>{fmtProj(p)}</strong> kg</> : 'cilj nije upisan'}
        </span>
      </div>

      {p && first != null && (
        <div style={{ height: '4px', background: 'var(--t-s3)', borderRadius: '99px', overflow: 'hidden', marginTop: '10px' }}>
          <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: reached ? '#4ade80' : 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: '99px', transition: 'width 0.4s' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', alignItems: 'end', gap: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--t-border)', borderRadius: '9px', padding: '8px 11px', marginTop: '12px' }}>
        <RowStat label="1. tj" value={first != null ? fmtKg(first) : '—'} />
        <RowStat label={lastW ? `Zadnje · tj ${lastW.week}` : 'Zadnje'} value={last != null ? fmtKg(last) : '—'} />
        <RowStat label="Preostalo" tone={reached ? '#4ade80' : undefined}
          value={reached ? 'dosegnut' : remLo != null && remHi != null ? rng(remLo, remHi) : '—'} />
        <RowStat label={weeksLeft > 0 ? `Po tjednu · ${weeksLeft} tj` : 'Po tjednu'}
          value={perHi != null ? `≈${rng(perLo ?? 0, perHi)}` : '—'} />
      </div>

      {weekNums.length > 0 ? (
        <>
          <div style={{ ...eyebrow, marginTop: '14px', marginBottom: '7px' }}>Kilaže po tjednima</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isRange ? 118 : 88}px, 1fr))`, gap: '7px' }}>
            {weekNums.map(w => {
              const doneW = actual.get(w)
              const pLo = plannedLo.get(w)
              const pHi = plannedHi.get(w)
              const planTxt = pLo != null && pHi != null ? rng(pLo, pHi) : null
              const kg = doneW ? fmtKg(doneW.kg) : planTxt
              return (
                <div key={w} style={{ background: 'var(--t-s2)', border: '1px solid var(--t-border)', borderRadius: '10px', padding: '9px 10px', minWidth: 0 }}>
                  <div style={{ ...eyebrow, fontSize: '0.45rem' }}>TJ {w}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '3px' }}>
                    <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: !doneW && pLo !== pHi ? '0.9rem' : '1.05rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: kg == null ? '#555' : doneW ? '#f0f0f0' : '#4ade80' }}>
                      {kg ?? '—'}
                    </span>
                    {kg != null && <span style={{ fontSize: '0.5rem', color: '#666' }}>kg</span>}
                  </div>
                  <div style={{ fontSize: '0.5rem', letterSpacing: '0.14em', color: doneW ? '#777' : '#4a7a5c', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doneW
                      ? `${doneW.reps ? `×${doneW.reps}${doneW.fromPlan ? '*' : ''}` : 'odrađeno'}${doneW.rpe != null ? ` @${doneW.rpe}` : ''}`
                      : planTxt != null ? 'PLAN' : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '0.66rem', color: '#666', marginTop: '10px' }}>Još nema odrađenih setova za ovaj lift u bloku.</div>
      )}
    </section>
  )
}

type State = { status: 'loading' } | { status: 'error'; msg: string } | { status: 'done'; data: Loaded }

export function BlockProjectionsModal({ athleteId, blockId, blockName, canEdit, onClose, onApplied }: {
  athleteId: string; blockId: string; blockName: string; canEdit: boolean; onClose: () => void
  onApplied?: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tab, setTab] = useState<LiftKey>('squat')
  const [shape, setShape] = useState<BlockShape | null>(null)
  const [shapeErr, setShapeErr] = useState<string | null>(null)

  // Struktura bloka se čita uživo: pri otvaranju, kad se trener vrati u prozor
  // (npr. iz druge kartice gdje je slagao serije) i nakon svakog upisa.
  const reloadShape = useCallback(async () => {
    if (!canEdit) return
    try { setShape(await loadBlockShape(athleteId, blockId)); setShapeErr(null) }
    catch (e: any) { setShapeErr(e?.message ?? String(e)) }
  }, [athleteId, blockId, canEdit])

  useEffect(() => {
    reloadShape()
    const onFocus = () => { if (document.visibilityState === 'visible') reloadShape() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [reloadShape])

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    loadProjections(athleteId, blockId)
      .then(data => { if (alive) setState({ status: 'done', data }) })
      .catch(e => { if (alive) setState({ status: 'error', msg: e?.message ?? String(e) }) })
    return () => { alive = false }
  }, [athleteId, blockId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const patchLift = (key: LiftKey, patch: Partial<LiftData>) =>
    setState(s => s.status !== 'done' ? s : {
      ...s, data: { ...s.data, lifts: { ...s.data.lifts, [key]: { ...s.data.lifts[key], ...patch } } },
    })

  const data = state.status === 'done' ? state.data : null
  const anyProjection = !!data && Object.values(data.lifts).some(l => l.projection)
  const hasPlanReps = !!data && Object.values(data.lifts).some(l => l.weeks.some(w => w.top.fromPlan))

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.15s ease' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Planer kilaža bloka"
        style={{ width: '100%', maxWidth: canEdit ? '760px' : '620px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--t-s1)', border: '1px solid var(--t-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)', animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)', fontFamily: 'var(--fm)', color: '#e0e0e0' }}>

        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--t-border)', background: 'var(--t-s2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', color: '#888' }}>
              {canEdit ? 'PLANER KILAŽA · TRENUTNI BLOK' : 'PROJEKCIJE · KRAJ BLOKA'}
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', fontWeight: 700, color: '#f0f0f0', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {blockName}{data && data.totalWeeks > 0 ? ` · ${data.totalWeeks} tjedana` : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Zatvori"
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {canEdit && data && (
          <div style={{ display: 'flex', gap: '6px', padding: '12px 16px 0', flexWrap: 'wrap', flexShrink: 0 }}>
            {LIFTS.map(l => {
              const key = LIFT_KEY[l.label]
              const on = tab === key
              return (
                <button key={key} onClick={() => setTab(key)}
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700,
                    background: on ? '#f0f0f0' : 'var(--t-s2)', color: on ? '#0a0a0a' : '#aaa', border: `1px solid ${on ? '#f0f0f0' : 'var(--t-border)'}` }}>
                  {l.label}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ overflowY: 'auto', paddingBottom: '14px' }}>
          {state.status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0', color: '#666' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>UČITAVANJE…</span>
            </div>
          )}

          {state.status === 'error' && (
            <div style={{ padding: '32px 18px', color: '#f87171', fontSize: '0.75rem' }}>Greška pri učitavanju: {state.msg}</div>
          )}

          {data && canEdit && (
            <LiftPlanner
              key={tab}
              lift={tab}
              label={LIFTS.find(l => LIFT_KEY[l.label] === tab)?.label ?? tab.toUpperCase()}
              data={data.lifts[tab]}
              compEx={data.compExercise[tab]}
              variations={data.variations}
              blockId={blockId}
              onPlan={p => patchLift(tab, { plan: p })}
              onProjection={p => patchLift(tab, { projection: p })}
              onApplied={onApplied}
              shape={shape}
              shapeError={shapeErr}
              reloadShape={reloadShape}
            />
          )}

          {data && !canEdit && (
            <>
              <div style={{ padding: '12px 18px', fontSize: '0.66rem', color: '#888', lineHeight: 1.65 }}>
                {anyProjection
                  ? 'Trenerov cilj za kraj bloka i tvoj napredak: najteži odrađeni set po tjednu, skok od prošlog tjedna i koliko ti je ostalo.'
                  : 'Trener još nije upisao projekcije za ovaj blok. Napredak po tjednima vidiš i bez njih.'}
              </div>
              {LIFTS.map(l => {
                const key = LIFT_KEY[l.label]
                return <LiftCard key={key} label={l.label} data={data.lifts[key]} totalWeeks={data.totalWeeks} />
              })}
              <div style={{ padding: '10px 18px 0', fontSize: '0.6rem', color: '#666', lineHeight: 1.6 }}>
                Tjedna kilaža je najteži odrađeni set natjecateljske varijante (bez varijacija). Kockice: odrađeni tjedni
                pokazuju stvarni najteži set, a idući plan od zadnjeg odrađenog do cilja, zaokružen na 2.5 kg.
                {hasPlanReps && <><br />* ponavljanja nisu upisana — prikazana su planirana</>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
