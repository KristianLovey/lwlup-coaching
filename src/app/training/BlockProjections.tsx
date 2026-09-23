'use client'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, Minus, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LIFTS, one, type Top } from './PrevBlockLifts'
import { RPE_ROWS, weightFromRpe } from './training-setplan'
import { COMP_CATEGORIES, LIFT_OF_CATEGORY, pctForExercise, type LiftK } from './lift-variations'
import {
  autoSecondary1rm, backoffRows, emptyPlan, planReady, planWeeks,
  type LiftPlan,
} from './block-planner-calc'

/**
 * Planer bloka (trener/admin) + prikaz napretka (lifter).
 *
 * Trener upiše po liftu: 1RM, kilažu na početku i na kraju bloka, broj backoff
 * serija i postotak pada, pa sekundarnu varijaciju s RPE-om od početnog do
 * završnog. Iz toga se izračuna top set za svaki tjedan; bilo koji tjedan smije
 * pregaziti ručnim upisom. "UPIŠI U BLOK" te kilaže upiše u same vježbe.
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
      .select('id, planned_reps, exercises(id, name, category), workouts!inner(athlete_id, weeks!inner(week_number, block_id))')
      .eq('workouts.athlete_id', athleteId)
      .eq('workouts.weeks.block_id', blockId),
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
    const secEx = p.secondary_exercise_id ? exById.get(p.secondary_exercise_id) ?? null : null
    lifts[k].plan = {
      weeks: totalWeeks,
      primary1rm: n(p.primary_1rm),
      startKg: n(p.start_kg),
      endKg: Number(p.target_min),
      primaryReps: p.primary_reps ?? 3,
      primaryBackoffSets: p.primary_backoff_sets ?? 0,
      primaryBackoffPct: n(p.primary_backoff_pct) ?? 92.5,
      secondaryExerciseId: p.secondary_exercise_id ?? null,
      secondaryExerciseName: secEx?.name ?? null,
      secondary1rm: n(p.secondary_1rm),
      secondaryReps: p.secondary_reps ?? 3,
      secondaryStartRpe: n(p.secondary_start_rpe),
      secondaryEndRpe: n(p.secondary_end_rpe),
      secondaryBackoffSets: p.secondary_backoff_sets ?? 0,
      secondaryBackoffPct: n(p.secondary_backoff_pct) ?? 92.5,
      weekOverrides: (p.week_overrides ?? {}) as Record<string, number>,
    }
  }

  // comp vježbe koje su stvarno u bloku + najteži odrađeni set po tjednu
  const compInBlock: Partial<Record<LiftKey, ExRow>> = {}
  const meta = new Map<string, { key: LiftKey; week: number; plannedReps: string | null }>()
  for (const r of (wesRes.data ?? []) as any[]) {
    const ex = one<any>(r.exercises)
    const wk = one<any>(one<any>(r.workouts)?.weeks)
    if (!ex || !wk) continue
    const key = LIFT_OF_CATEGORY[ex.category]
    if (!key) continue
    if (COMP_CATEGORIES.has(ex.category) && !compInBlock[key]) compInBlock[key] = { id: ex.id, name: ex.name, category: ex.category }
    if (!COMP_CATEGORIES.has(ex.category)) continue
    meta.set(r.id, { key, week: wk.week_number, plannedReps: r.planned_reps })
  }
  // blok još nema taj lift → zadana comp vježba iz baze
  for (const k of Object.keys(lifts) as LiftKey[]) {
    if (!compInBlock[k]) {
      const cand = allEx.filter(e => e.category === COMP_CATEGORY[k])
      compInBlock[k] = cand.find(e => /comp/i.test(e.name)) ?? cand[0]
    }
  }

  if (meta.size > 0) {
    const { data: sets, error } = await supabase.from('set_logs')
      .select('workout_exercise_id, weight_kg, reps, rpe')
      .in('workout_exercise_id', [...meta.keys()])
      .eq('completed', true)
      .not('weight_kg', 'is', null)
      .limit(2000)
    if (error) throw error

    const best = new Map<string, WeekTop & { key: LiftKey }>()
    for (const s of (sets ?? []) as any[]) {
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

// ── stilovi ───────────────────────────────────────────────────────
const eyebrow: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.22em', color: '#777', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }
const inputBase: CSSProperties = { background: 'var(--t-s2)', border: '1px solid var(--t-border)', borderRadius: '8px', padding: '7px 9px', color: '#f0f0f0', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9rem', outline: 'none', minWidth: 0, width: '100%', boxSizing: 'border-box' }
const th: CSSProperties = { fontSize: '0.5rem', letterSpacing: '0.16em', color: '#777', fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'center' }
const td: CSSProperties = { padding: '7px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem', color: '#e8e8e8', fontVariantNumeric: 'tabular-nums' }
const REPS_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function RowStat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', color: '#666', whiteSpace: 'normal', lineHeight: 1.3 }}>{label}</span>
      <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.1, color: tone ?? '#e8e8e8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

/** Brojčano polje koje se ugodno tipka: lokalni tekst, promjena gore ide na blur. */
function NumField({ label, value, onCommit, placeholder, suffix, width }: {
  label: string; value: number | null; onCommit: (v: number | null) => void
  placeholder?: string; suffix?: string; width?: string
}) {
  const [text, setText] = useState(value == null ? '' : fmtKg(value))
  useEffect(() => { setText(value == null ? '' : fmtKg(value)) }, [value])
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, width: width ?? 'auto' }}>
      <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em', whiteSpace: 'normal', lineHeight: 1.3 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <input value={text} inputMode="decimal" placeholder={placeholder}
          onChange={e => setText(e.target.value)}
          onBlur={() => onCommit(numOrNull(text))}
          onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
          style={inputBase} />
        {suffix && <span style={{ fontSize: '0.55rem', color: '#666', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </label>
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

// ── planer (trener/admin) ─────────────────────────────────────────
function LiftPlanner({ lift, label, data, compEx, variations, blockId, onPlan, onProjection }: {
  lift: LiftKey; label: string; data: LiftData; compEx: ExRow | undefined; variations: ExRow[]
  blockId: string; onPlan: (p: LiftPlan) => void; onProjection: (p: Projection | null) => void
}) {
  const plan = data.plan
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [apply, setApply] = useState<'idle' | 'busy' | 'done'>('idle')
  const [applyMsg, setApplyMsg] = useState('')
  const [showTable, setShowTable] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const set = (patch: Partial<LiftPlan>) => onPlan({ ...plan, ...patch })
  const rows = useMemo(() => planWeeks(plan), [plan])
  const secAuto = autoSecondary1rm(plan.primary1rm, plan.secondaryExerciseName)
  const sec1rm = plan.secondary1rm ?? secAuto
  const varOptions = variations.filter(v => LIFT_OF_CATEGORY[v.category] === lift)
  const secPct = pctForExercise(plan.secondaryExerciseName)

  const save = async () => {
    if (plan.endKg == null) { setStatus('error'); setErr('Upiši kilažu na kraju bloka — bez nje se plan ne može spremiti.'); return }
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
      secondary_exercise_id: plan.secondaryExerciseId,
      secondary_1rm: plan.secondary1rm,
      secondary_reps: plan.secondaryReps,
      secondary_start_rpe: plan.secondaryStartRpe,
      secondary_end_rpe: plan.secondaryEndRpe,
      secondary_backoff_sets: plan.secondaryBackoffSets,
      secondary_backoff_pct: plan.secondaryBackoffPct,
      week_overrides: plan.weekOverrides,
    }, { onConflict: 'block_id,lift' })
    if (error) { setStatus('error'); setErr('Greška pri spremanju: ' + error.message); return }
    onProjection({ min: plan.endKg, max: data.projection?.max ?? null })
    setStatus('saved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1500)
  }

  const applyToBlock = async () => {
    const ready = planReady(plan)
    if (!ready.ok) { setApply('idle'); setApplyMsg(ready.reason ?? ''); return }
    if (!compEx) { setApplyMsg('Nema natjecateljske vježbe za ovaj lift u bazi.'); return }
    setApply('busy'); setApplyMsg('')
    await save()

    const payload = {
      blockId,
      weeks: rows.map(r => ({
        week: r.week,
        primary: r.primaryKg == null ? null : {
          exerciseId: compEx.id, kg: r.primaryKg, reps: plan.primaryReps,
          sets: 1 + plan.primaryBackoffSets, rpe: null,
          setPlan: backoffRows(plan.primaryBackoffSets, plan.primaryBackoffPct),
        },
        secondary: plan.secondaryExerciseId == null || r.secondaryKg == null ? null : {
          exerciseId: plan.secondaryExerciseId, kg: r.secondaryKg, reps: plan.secondaryReps,
          sets: 1 + plan.secondaryBackoffSets, rpe: r.secondaryRpe,
          setPlan: backoffRows(plan.secondaryBackoffSets, plan.secondaryBackoffPct),
        },
      })),
    }

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/apply-block-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    }).then(r => r.json()).catch(() => ({ error: 'Mreža nije dostupna' }))

    if (res?.error) { setApply('idle'); setApplyMsg('Greška: ' + res.error); return }
    const d = res.data ?? {}
    setApply('done')
    setApplyMsg(`Upisano: ${d.updated ?? 0} vježbi osvježeno, ${d.created ?? 0} dodano${d.skipped?.length ? ` · preskočeno: ${d.skipped.join(', ')}` : ''}`)
  }

  const done = new Map(data.weeks.map(w => [w.week, w.top]))

  return (
    <div style={{ padding: '14px 16px 18px' }}>
      {/* PRIMARNI */}
      <div style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem', marginBottom: '9px' }}>PRIMARNI · {label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '9px' }}>
        <NumField label="1RM" value={plan.primary1rm} suffix="kg" placeholder="npr. 200" onCommit={v => set({ primary1rm: v })} />
        <NumField label="Početak bloka" value={plan.startKg} suffix="kg" placeholder="npr. 160" onCommit={v => set({ startKg: v })} />
        <NumField label="Kraj bloka" value={plan.endKg} suffix="kg" placeholder="npr. 185" onCommit={v => set({ endKg: v })} />
        <NumField label="Ponavljanja" value={plan.primaryReps} onCommit={v => set({ primaryReps: Math.max(1, Math.round(v ?? 1)) })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '9px', marginTop: '9px' }}>
        <Stepper label="Broj backoff serija" value={plan.primaryBackoffSets} onChange={v => set({ primaryBackoffSets: v })} />
        <NumField label="Pad/skok svake sljedeće (%)" value={plan.primaryBackoffPct} suffix="%" onCommit={v => set({ primaryBackoffPct: v ?? 92.5 })} />
      </div>

      {/* SEKUNDARNI */}
      <div style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem', margin: '18px 0 9px' }}>SEKUNDARNI · {label}</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ ...eyebrow, fontSize: '0.45rem', letterSpacing: '0.12em' }}>Varijacija</span>
        <select value={plan.secondaryExerciseId ?? ''}
          onChange={e => {
            const id = e.target.value || null
            const ex = varOptions.find(v => v.id === id) ?? null
            set({ secondaryExerciseId: id, secondaryExerciseName: ex?.name ?? null, secondary1rm: null })
          }}
          style={{ ...inputBase, fontFamily: 'var(--fm)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer' }}>
          <option value="">— bez sekundarnog —</option>
          {varOptions.map(v => (
            <option key={v.id} value={v.id}>{v.name}{pctForExercise(v.name) ? ` · ${pctForExercise(v.name)}%` : ''}</option>
          ))}
        </select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: '9px', marginTop: '9px' }}>
        <NumField label={secAuto != null && plan.secondary1rm == null ? `1RM (auto ${secPct ?? '—'}%)` : '1RM varijacije'}
          value={sec1rm} suffix="kg" onCommit={v => set({ secondary1rm: v })} />
        <NumField label="Početni RPE" value={plan.secondaryStartRpe} onCommit={v => set({ secondaryStartRpe: v })} placeholder="7" />
        <NumField label="Završni RPE" value={plan.secondaryEndRpe} onCommit={v => set({ secondaryEndRpe: v })} placeholder="9" />
        <NumField label="Ponavljanja" value={plan.secondaryReps} onCommit={v => set({ secondaryReps: Math.max(1, Math.round(v ?? 1)) })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '9px', marginTop: '9px' }}>
        <Stepper label="Broj backoff serija" value={plan.secondaryBackoffSets} onChange={v => set({ secondaryBackoffSets: v })} />
        <NumField label="Pad/skok svake sljedeće (%)" value={plan.secondaryBackoffPct} suffix="%" onCommit={v => set({ secondaryBackoffPct: v ?? 92.5 })} />
      </div>

      {/* RASPORED PO TJEDNIMA */}
      <div style={{ ...eyebrow, color: '#f0f0f0', fontSize: '0.56rem', margin: '18px 0 9px' }}>RASPORED PO TJEDNIMA</div>
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
              <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                <td style={{ ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, fontSize: '0.56rem', letterSpacing: '0.14em', color: '#888' }}>TOP SET</td>
                {rows.map(r => (
                  <td key={r.week} style={{ ...td, color: r.primaryManual ? '#facc15' : '#e8e8e8' }}>
                    {r.primaryKg != null ? fmtKg(r.primaryKg) : '—'}
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                <td style={{ ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, fontSize: '0.5rem', letterSpacing: '0.12em', color: '#666' }}>RUČNO</td>
                {rows.map(r => (
                  <td key={r.week} style={{ padding: '4px 5px' }}>
                    <input value={plan.weekOverrides[String(r.week)] ?? ''} inputMode="decimal" placeholder="—"
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
              <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                <td style={{ ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, fontSize: '0.56rem', letterSpacing: '0.14em', color: '#888' }}>SEKUNDARNI</td>
                {rows.map(r => (
                  <td key={r.week} style={{ ...td, color: r.secondaryKg != null ? '#4ade80' : '#555' }}>
                    {r.secondaryKg != null ? fmtKg(r.secondaryKg) : '—'}
                    {r.secondaryRpe != null && r.secondaryKg != null && (
                      <div style={{ fontSize: '0.48rem', color: '#facc15', fontWeight: 600, marginTop: '2px' }}>@{r.secondaryRpe}</div>
                    )}
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: '1px solid var(--t-border)' }}>
                <td style={{ ...td, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--t-s1)', zIndex: 1, fontSize: '0.5rem', letterSpacing: '0.12em', color: '#666' }}>ODRAĐENO</td>
                {rows.map(r => {
                  const d = done.get(r.week)
                  return <td key={r.week} style={{ ...td, fontSize: '0.7rem', color: d ? '#f0f0f0' : '#444' }}>{d ? fmtKg(d.kg) : '—'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* akcije */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px' }}>
        <button type="button" onClick={save} disabled={status === 'saving'}
          style={{ padding: '10px 16px', borderRadius: '9px', background: 'var(--t-s3)', border: '1px solid var(--t-border-hi)', color: '#e8e8e8', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700, cursor: 'pointer' }}>
          {status === 'saving' ? 'SPREMAM…' : 'SPREMI PLAN'}
        </button>
        <button type="button" onClick={applyToBlock} disabled={apply === 'busy'}
          style={{ padding: '10px 16px', borderRadius: '9px', background: '#1a3a26', border: '1px solid #4ade80', color: '#4ade80', fontFamily: 'var(--fm)', fontSize: '0.62rem', letterSpacing: '0.16em', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
          {apply === 'busy' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          UPIŠI U BLOK
        </button>
        {status === 'saved' && <span style={{ fontSize: '0.62rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} /> spremljeno</span>}
      </div>
      {status === 'error' && <div style={{ fontSize: '0.64rem', color: '#f87171', marginTop: '8px' }}>{err}</div>}
      {applyMsg && <div style={{ fontSize: '0.64rem', color: apply === 'done' ? '#4ade80' : '#f87171', marginTop: '8px', lineHeight: 1.6 }}>{applyMsg}</div>}
      <div style={{ fontSize: '0.58rem', color: '#666', marginTop: '10px', lineHeight: 1.6 }}>
        Top set ide linearno od početka do kraja bloka, zaokruženo na 2.5 kg; ručni upis nadjačava izračun (žuto).
        Backoff serije su postotak prethodne serije. „Upiši u blok" postavlja kilažu, ponavljanja, broj serija i backoff
        u {compEx?.name ?? 'natjecateljsku vježbu'}{plan.secondaryExerciseName ? ` i ${plan.secondaryExerciseName}` : ''} — ništa se ne briše.
      </div>

      {/* DETALJNE TABLICE ZA SEKUNDARNE LIFTOVE */}
      <button type="button" onClick={() => setShowTable(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontFamily: 'var(--fm)', fontSize: '0.56rem', letterSpacing: '0.18em', fontWeight: 700, padding: 0 }}>
        <ChevronDown size={13} style={{ transform: showTable ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        DETALJNE TABLICE ZA SEKUNDARNE LIFTOVE
      </button>
      {showTable && (
        sec1rm != null ? (
          <>
            <div style={{ ...eyebrow, margin: '10px 0 7px' }}>
              {plan.secondaryExerciseName ?? 'varijacija'} · 1RM {fmtKg(sec1rm)} kg
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
                      <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--t-s1)', color: '#facc15', fontSize: '0.7rem', zIndex: 1 }}>{rpe}</td>
                      {REPS_COLS.map(r => {
                        const kg = weightFromRpe(sec1rm, r, rpe)
                        return <td key={r} style={td}>{kg != null ? fmtKg(kg) : '—'}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

export function BlockProjectionsModal({ athleteId, blockId, blockName, canEdit, onClose }: {
  athleteId: string; blockId: string; blockName: string; canEdit: boolean; onClose: () => void
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tab, setTab] = useState<LiftKey>('squat')

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
              {canEdit ? 'PLANER KILAŽA · BLOK' : 'PROJEKCIJE · KRAJ BLOKA'}
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
