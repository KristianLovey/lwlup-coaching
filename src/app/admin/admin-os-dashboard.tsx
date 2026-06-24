'use client'
// LWL UP · ADMIN OS — per-athlete analytics dashboard (real Supabase data)
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Minus, Plus, ChevronDown, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Spark, LineChart, MultiLineChart, Donut, StrengthRadar, MetricBar } from './admin-os-charts'
import { estimate1RM } from '../training/training-setplan'

const supabase = createClient()

// ── Card settings model ──
export type CardId = 'blockplan' | 'progress' | 'compliance' | 'volume' | 'bodyweight' | 'recovery' | 'balance' | 'macro'
export type CardState = { hidden: boolean; collapsed: boolean; range: number }
export type DashCards = Record<CardId, CardState>
export const CARD_META: { id: CardId; label: string; series: boolean }[] = [
  { id: 'blockplan',  label: 'Plan blokova',       series: false },
  { id: 'progress',   label: 'Pregled napretka',   series: true },
  { id: 'compliance', label: 'Trening compliance',  series: false },
  { id: 'volume',     label: 'Volumen & intenzitet', series: true },
  { id: 'bodyweight', label: 'Trend težine',        series: true },
  { id: 'recovery',   label: 'Oporavak',            series: false },
  { id: 'balance',    label: 'Balans snage',        series: false },
  { id: 'macro',      label: 'Makro & aktivnost',   series: false },
]
export function defaultCards(): DashCards {
  const o = {} as DashCards
  CARD_META.forEach(c => { o[c.id] = { hidden: false, collapsed: false, range: c.id === 'bodyweight' ? 8 : 12 } })
  return o
}

type LiftK = 'sq' | 'bp' | 'dl'
const liftKey = (cat: string): LiftK | null =>
  cat === 'Squat' || cat === 'Squat Variation' ? 'sq'
    : cat === 'Bench' || cat === 'Bench Variation' ? 'bp'
      : cat === 'Deadlift' || cat === 'Deadlift Variation' ? 'dl' : null
const liftNames = { sq: 'Squat', bp: 'Bench', dl: 'Deadlift' } as const
const fmtDate = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.` : d }

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fillSeries(weeks: string[], perWeek: Record<string, number>): number[] {
  let last: number | null = null
  const out: number[] = []
  for (const w of weeks) { if (perWeek[w] != null) last = perWeek[w]; if (last != null) out.push(last) }
  return out
}

type Best = { e1: number; date: string; name: string; day: string; kg: number; reps: number; rpe: number | null }
type Raw = { workouts: any[]; bw: { date: string; weight_kg: number }[]; wb: any[]; nut: any[]; meets: any[]; blocks: any[]; comps: any[]; profile: any | null; phases: any[]; compSel: any | null }

export function AthleteDashboard({ athleteId, athleteName, cards, setCard }: {
  athleteId: string; athleteName: string; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void
}) {
  const [raw, setRaw] = useState<Raw | null>(null)
  const [loading, setLoading] = useState(true)
  const [lift, setLift] = useState<LiftK>('sq')
  const [volLift, setVolLift] = useState<'all' | LiftK>('all')
  const [exp, setExp] = useState<'total' | 'predicted' | 'compliance' | 'bw' | 'tonnage' | null>(null)
  const [calM, setCalM] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    const [woRes, bwRes, wbRes, nutRes, meetRes, blkRes, compRes, profRes, phaseRes, compSelRes] = await Promise.all([
      supabase.from('workouts')
        .select('id, workout_date, completed, day_name, workout_exercises(id, exercise:exercises(category, name), set_logs(weight_kg, reps, rpe, completed, is_top_set))')
        .eq('athlete_id', athleteId).order('workout_date', { ascending: true }).limit(500),
      supabase.from('pr_logs').select('date, weight_kg').eq('athlete_id', athleteId)
        .eq('lift', 'other').eq('notes', 'Tjelesna težina').order('date', { ascending: true }).limit(400),
      supabase.from('wellbeing_logs').select('*').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(14),
      supabase.from('nutrition_logs').select('*').eq('user_id', athleteId).order('date', { ascending: false }).limit(90),
      supabase.from('meet_attempts').select('lift, meet_date, competition_id, attempt1_max, attempt1_actual, attempt2_max, attempt2_actual, attempt3_max, attempt3_actual').eq('athlete_id', athleteId).order('meet_date', { ascending: false }).limit(30),
      supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', athleteId).order('start_date', { ascending: true }).limit(60),
      supabase.from('competitions').select('name, date, location').gte('date', today).order('date', { ascending: true }).limit(5),
      supabase.from('lifters').select('current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class').eq('id', athleteId).single(),
      supabase.from('athlete_training_phases').select('id, label, start_date, end_date, color').eq('athlete_id', athleteId).order('start_date', { ascending: true }),
      supabase.from('athlete_competition_selection').select('competition:competitions(name, date, location)').eq('athlete_id', athleteId).maybeSingle(),
    ])
    const compSelComp = (compSelRes.data as any)?.competition ?? null
    setRaw({
      workouts: woRes.data ?? [], bw: (bwRes.data ?? []) as { date: string; weight_kg: number }[],
      wb: wbRes.data ?? [], nut: nutRes.data ?? [], meets: meetRes.data ?? [],
      blocks: blkRes.data ?? [], comps: compRes.data ?? [], profile: profRes.data ?? null,
      phases: phaseRes.data ?? [], compSel: compSelComp,
    })
    setLoading(false)
  }, [athleteId])

  useEffect(() => { setLoading(true); load() }, [load])

  // #1 realtime — admin/trener sees lifter's inputs live
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    const ping = () => { if (t) clearTimeout(t); t = setTimeout(load, 600) }
    const ch = supabase.channel(`dash-rt-${athleteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'set_logs', filter: `athlete_id=eq.${athleteId}` }, ping)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts', filter: `athlete_id=eq.${athleteId}` }, ping)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pr_logs', filter: `athlete_id=eq.${athleteId}` }, ping)
      .subscribe()
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch) }
  }, [athleteId, load])

  const data = useMemo(() => {
    if (!raw) return null
    const { workouts, bw, wb, nut, meets, blocks, comps, profile, phases, compSel } = raw
    // training days for the calendar: any day with a completed workout or a completed set
    const doneDates = new Set<string>()
    const plannedDates = new Set<string>()
    for (const w of workouts) {
      plannedDates.add(w.workout_date)
      const anyDone = w.completed || (w.workout_exercises ?? []).some((we: any) => (we.set_logs ?? []).some((s: any) => s.completed))
      if (anyDone) doneDates.add(w.workout_date)
    }

    const weekSet = new Set<string>()
    const e1: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const dayE1: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const volByWeek: Record<string, number> = {}
    const rpeByWeek: Record<string, number[]> = {}
    const compByWeek: Record<string, { done: number; total: number }> = {}
    const bestE1: Record<LiftK, number> = { sq: 0, bp: 0, dl: 0 }
    const bestSrc: Record<LiftK, Best | null> = { sq: null, bp: null, dl: null }
    // volume by main lift per week + by variation (exercise name) per week
    const volMain: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const volVar: Record<LiftK, Record<string, Record<string, number>>> = { sq: {}, bp: {}, dl: {} }

    for (const w of workouts) {
      const wk = weekKey(w.workout_date)
      weekSet.add(wk)
      const c = (compByWeek[wk] ??= { done: 0, total: 0 })
      c.total++; if (w.completed) c.done++
      for (const we of (w.workout_exercises ?? [])) {
        const cat = we.exercise?.category ?? ''
        const nm = we.exercise?.name ?? cat
        const lk = liftKey(cat)
        for (const s of (we.set_logs ?? [])) {
          const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
          if (kg > 0 && Number.isFinite(reps) && reps > 0) {
            const ton = kg * reps
            volByWeek[wk] = (volByWeek[wk] ?? 0) + ton
            if (s.rpe) (rpeByWeek[wk] ??= []).push(Number(s.rpe))
            if (lk) {
              volMain[lk][wk] = (volMain[lk][wk] ?? 0) + ton
              const vv = (volVar[lk][nm] ??= {}); vv[wk] = (vv[wk] ?? 0) + ton
              // e1RM — use any logged set (best of the day) so the chart always has data
              const e = estimate1RM(kg, reps, s.rpe) ?? 0
              if (e > 0) {
                if (!e1[lk][wk] || e > e1[lk][wk]) e1[lk][wk] = e
                if (!dayE1[lk][w.workout_date] || e > dayE1[lk][w.workout_date]) dayE1[lk][w.workout_date] = e
                if (e > bestE1[lk]) { bestE1[lk] = e; bestSrc[lk] = { e1: e, date: w.workout_date, name: nm, day: w.day_name ?? '', kg, reps, rpe: s.rpe ?? null } }
              }
            }
          }
        }
      }
    }
    const e1Sessions: Record<LiftK, { date: string; e1: number }[]> = {
      sq: Object.entries(dayE1.sq).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      bp: Object.entries(dayE1.bp).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      dl: Object.entries(dayE1.dl).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
    }
    const weeks = [...weekSet].sort()
    const bwByWeek: Record<string, number> = {}
    for (const r of bw) bwByWeek[weekKey(r.date)] = Number(r.weight_kg)

    const totalE1Week: Record<string, number> = {}
    for (const wk of weeks) { const t = (e1.sq[wk] ?? 0) + (e1.bp[wk] ?? 0) + (e1.dl[wk] ?? 0); if (t) totalE1Week[wk] = t }

    // Compliance scoped to active block only
    const activeBlock = blocks.find((b: any) => b.status === 'active') ?? blocks[blocks.length - 1] ?? null
    const blockWo = activeBlock
      ? workouts.filter((w: any) => w.workout_date >= activeBlock.start_date && w.workout_date <= activeBlock.end_date)
      : workouts
    const totalWo = blockWo.length
    const doneWo = blockWo.filter((w: any) => w.completed).length
    const complianceSeries = weeks.map(wk => { const c = compByWeek[wk]; return c && c.total ? Math.round((c.done / c.total) * 100) : 0 })
    const blockWeeks = [...new Set(blockWo.map((w: any) => weekKey(w.workout_date)))].sort()
    const firstDate = blockWo[0]?.workout_date, lastDate = blockWo[blockWo.length - 1]?.workout_date

    // tonnage last 7 days + by muscle group
    const ago7 = new Date(); ago7.setDate(ago7.getDate() - 7)
    let ton7 = 0
    const ton7ByCat: Record<string, number> = {}
    for (const w of workouts) {
      if (new Date(w.workout_date + 'T12:00:00') >= ago7) for (const we of (w.workout_exercises ?? [])) {
        const cat = we.exercise?.category ?? 'Ostalo'
        for (const s of (we.set_logs ?? [])) {
          const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
          if (kg > 0 && reps > 0) { ton7 += kg * reps; ton7ByCat[cat] = (ton7ByCat[cat] ?? 0) + kg * reps }
        }
      }
    }

    // predicted total from latest meet's attempts
    let predicted = 0
    const predBy: Record<LiftK, number> = { sq: 0, bp: 0, dl: 0 }
    if (meets.length) {
      const latest = meets[0].meet_date
      for (const a of meets.filter((m: any) => m.meet_date === latest)) {
        const lk: LiftK | null = a.lift === 'squat' ? 'sq' : a.lift === 'bench' ? 'bp' : a.lift === 'deadlift' ? 'dl' : null
        if (!lk) continue
        const best = a.attempt3_actual ?? a.attempt3_max ?? a.attempt2_actual ?? a.attempt2_max ?? a.attempt1_actual ?? a.attempt1_max ?? 0
        predBy[lk] = Number(best) || 0; predicted += Number(best) || 0
      }
    }

    const curTotal = bestE1.sq + bestE1.bp + bestE1.dl
    const curBw = bw.length ? Number(bw[bw.length - 1].weight_kg) : (profile?.body_weight ?? null)

    return {
      weeks, e1Sessions, bestE1, bestSrc, volByWeek, rpeByWeek, totalE1Week, bwByWeek, volMain, volVar,
      complianceSeries, complianceOverall: totalWo ? Math.round((doneWo / totalWo) * 100) : 0,
      doneWo, totalWo, firstDate, lastDate, blockWeeks, curTotal, curBw, ton7, ton7ByCat,
      predicted, predBy, latestMeet: meets[0]?.meet_date ?? null,
      latestWb: wb[0] ?? null, latestNut: nut[0] ?? null, nutHistory: nut, bw, profile,
      blocks, nextComp: compSel ?? comps[0] ?? null, comps, doneDates, plannedDates, phases, compSel,
      balance: {
        sqTotal: curTotal ? Math.round((bestE1.sq / curTotal) * 100) : 0,
        bpTotal: curTotal ? Math.round((bestE1.bp / curTotal) * 100) : 0,
        dlTotal: curTotal ? Math.round((bestE1.dl / curTotal) * 100) : 0,
      },
    }
  }, [raw])

  if (loading || !data) return <div className="os-empty" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={20} className="os-spin" /></div>

  const rangeWeeks = (n: number, arr: string[]) => arr.slice(Math.max(0, arr.length - n))
  const totalSpark = fillSeries(data.weeks, data.totalE1Week)
  const volSpark = data.weeks.map(w => Math.round((data.volByWeek[w] ?? 0) / 100))
  const bwSparkE = data.bw.map(r => Number(r.weight_kg))

  // progress (by session dates)
  const pr = cards.progress
  const allSess = data.e1Sessions[lift]
  const cut = Date.now() - pr.range * 7 * 86400000
  let sess = allSess.filter(s => new Date(s.date + 'T12:00:00').getTime() >= cut)
  if (sess.length < 2) sess = allSess.slice(-Math.max(2, Math.min(allSess.length, 8)))
  const e1Series = sess.map(s => s.e1)
  const e1Dates = sess.map(s => fmtDate(s.date))
  const e1Last = e1Series[e1Series.length - 1] ?? 0
  const e1Prev = e1Series[Math.max(0, e1Series.length - 2)] ?? e1Last

  // volume (by lift / variation)
  const vol = cards.volume
  const volWeeks = rangeWeeks(vol.range, data.weeks)
  const volDates = volWeeks.map(w => fmtDate(w))
  const volSeries = volLift === 'all'
    ? (['sq', 'bp', 'dl'] as LiftK[]).map(lk => ({ name: liftNames[lk], data: volWeeks.map(w => Math.round((data.volMain[lk][w] ?? 0) / 100 * 10) / 10) }))
    : Object.entries(data.volVar[volLift])
        .map(([name, byW]) => ({ name, total: Object.values(byW).reduce((a, b) => a + b, 0), data: volWeeks.map(w => Math.round((byW[w] ?? 0) / 100 * 10) / 10) }))
        .sort((a, b) => b.total - a.total).slice(0, 6).map(({ name, data }) => ({ name, data }))

  // bodyweight (by actual entries)
  const bwC = cards.bodyweight
  const bwEntries = data.bw.slice(-Math.max(2, bwC.range * 2))
  const bwSeries = bwEntries.map(r => Number(r.weight_kg))
  const bwDates = bwEntries.map(r => fmtDate(r.date))

  const Card = ({ id, title, head, children }: { id: CardId; title: string; head?: React.ReactNode; children: React.ReactNode }) => {
    const st = cards[id]
    if (st.hidden) return null
    return (
      <div className={'card' + (st.collapsed ? ' is-collapsed' : '')}>
        <div className="card-head">
          <span className="t">{title}</span>
          <div className="card-tools">
            {!st.collapsed && head}
            <button className="card-min" onClick={() => setCard(id, { collapsed: !st.collapsed })} title={st.collapsed ? 'Proširi' : 'Minimiziraj'}>
              {st.collapsed ? <Plus size={13} /> : <Minus size={13} />}
            </button>
          </div>
        </div>
        {!st.collapsed && children}
      </div>
    )
  }
  const RangeSel = ({ id }: { id: CardId }) => (
    <div className="range-select">
      <select value={cards[id].range} onChange={e => setCard(id, { range: Number(e.target.value) })}>
        <option value={4}>4 tj.</option><option value={8}>8 tj.</option><option value={12}>12 tj.</option>
      </select>
      <span className="rs-caret"><ChevronDown size={11} /></span>
    </div>
  )

  const toggleExp = (k: typeof exp) => setExp(p => p === k ? null : k)

  return (
    <div>
      {/* KPI strip — clickable to expand source */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}>
        <KpiCard label="Trenutni total" num={data.curTotal || '—'} unit={data.curTotal ? 'kg' : ''} sub="najbolji e1RM zbroj" data={totalSpark} open={exp === 'total'} onClick={() => toggleExp('total')} />
        <KpiCard label="Predviđeni total" num={data.predicted || '—'} unit={data.predicted ? 'kg' : ''} sub={data.latestMeet ? `meet ${fmtDate(data.latestMeet)}` : 'nema meeta'} data={[]} accent open={exp === 'predicted'} onClick={() => toggleExp('predicted')} />
        <KpiCard label="Compliance" num={data.totalWo ? data.complianceOverall : '—'} unit={data.totalWo ? '%' : ''} sub={`${data.doneWo}/${data.totalWo} odrađenih treninga`} data={data.complianceSeries} open={exp === 'compliance'} onClick={() => toggleExp('compliance')} />
        <KpiCard label="Tjelesna težina" num={data.curBw ?? '—'} unit={data.curBw ? 'kg' : ''} sub={data.bw.length ? `zadnji: ${fmtDate(data.bw[data.bw.length - 1].date)}` : '—'} data={bwSparkE} open={exp === 'bw'} onClick={() => toggleExp('bw')} />
        <KpiCard label="Tonaža · 7d" num={data.ton7 ? Math.round(data.ton7).toLocaleString('hr') : '—'} unit={data.ton7 ? 'kg' : ''} sub="zadnjih 7 dana" data={volSpark} accent open={exp === 'tonnage'} onClick={() => toggleExp('tonnage')} />
      </div>

      {/* KPI detail panel */}
      {exp && (
        <div className="card os-fade" style={{ marginBottom: 14 }}>
          {exp === 'total' && (
            <><div className="card-head"><span className="t">Trenutni total — izvor (najbolji e1RM po liftu)</span></div>
              <div className="rec-rows">
                {(['sq', 'bp', 'dl'] as LiftK[]).map(lk => { const b = data.bestSrc[lk]; return (
                  <div className="compliance-row" key={lk} style={{ alignItems: 'flex-start' }}>
                    <span className="k" style={{ minWidth: 64 }}>{liftNames[lk]}</span>
                    {b ? <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>{b.name} · {b.reps}×{b.kg}kg{b.rpe ? ` @RPE${b.rpe}` : ''} · {fmtDate(b.date)}{b.day ? ` (${b.day})` : ''} → <b style={{ color: 'var(--text)' }}>{b.e1}kg e1RM</b></span> : <span className="v" style={{ color: 'var(--text-faint)' }}>—</span>}
                  </div>) })}
                <div className="compliance-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}><span className="k">Total</span><span className="v" style={{ color: 'var(--accent)' }}>{data.curTotal} kg</span></div>
              </div></>
          )}
          {exp === 'predicted' && (
            <><div className="card-head"><span className="t">Predviđeni total — odabrani pokušaji (zadnji meet)</span></div>
              {data.predicted ? <div className="rec-rows">
                {(['sq', 'bp', 'dl'] as LiftK[]).map(lk => (
                  <div className="compliance-row" key={lk}><span className="k">{liftNames[lk]}</span><span className="v">{data.predBy[lk] || '—'}<small> kg</small></span></div>
                ))}
                <div className="compliance-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}><span className="k">Projekcija</span><span className="v" style={{ color: 'var(--accent)' }}>{data.predicted} kg</span></div>
              </div> : <div className="os-empty">Nema unesenih pokušaja za meet. Unesi ih u MEET DAY.</div>}</>
          )}
          {exp === 'compliance' && (
            <><div className="card-head"><span className="t">Compliance — odrađeni treninzi</span></div>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6, margin: '0 0 4px' }}>
                <b style={{ color: 'var(--text)' }}>{data.doneWo}</b> od <b style={{ color: 'var(--text)' }}>{data.totalWo}</b> zadanih treninga označeno kao odrađeno
                {data.firstDate && data.lastDate ? <> u periodu <b style={{ color: 'var(--text)' }}>{fmtDate(data.firstDate)} – {fmtDate(data.lastDate)}</b></> : ''} ({data.weeks.length} tjedana).
              </p></>
          )}
          {exp === 'bw' && (
            <><div className="card-head"><span className="t">Tjelesna težina — unosi</span></div>
              {data.bw.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 240, overflowY: 'auto' }}>
                {[...data.bw].reverse().slice(0, 30).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span><span style={{ fontWeight: 700 }}>{r.weight_kg} kg</span>
                  </div>))}
              </div> : <div className="os-empty">Nema unosa težine</div>}</>
          )}
          {exp === 'tonnage' && (
            <><div className="card-head"><span className="t">Tonaža (7 dana) — po mišićnim skupinama</span></div>
              {Object.keys(data.ton7ByCat).length ? <div className="rec-rows">
                {Object.entries(data.ton7ByCat).sort((a, b) => b[1] - a[1]).map(([cat, t]) => (
                  <div className="rec-row" key={cat}><span className="k">{cat}</span><span className="val">{Math.round(t).toLocaleString('hr')}</span><MetricBar value={t} max={Math.max(...Object.values(data.ton7ByCat))} /></div>
                ))}
              </div> : <div className="os-empty">Nema podataka u zadnjih 7 dana</div>}</>
          )}
        </div>
      )}

      {/* Plan blokova — timeline + countdown + kalendar */}
      <div className="grid c1">
        <Card id="blockplan" title="Plan blokova & kalendar">
          {(() => {
            const STC: Record<string, string> = { completed: 'var(--text-muted)', active: '#22c55e', planned: 'var(--text-muted)' }
            const STL: Record<string, string> = { completed: 'ZAVRŠENO', active: 'AKTIVAN', planned: 'ZAVRŠENO' }
            const todayStr = new Date().toISOString().slice(0, 10)
            const nc = data.nextComp
            const daysTo = nc ? Math.max(0, Math.ceil((new Date(nc.date + 'T12:00:00').getTime() - Date.now()) / 86400000)) : null
            const { y, m } = calM
            const monthNames = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']
            const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
            const daysIn = new Date(y, m + 1, 0).getDate()
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }} className="bp-grid">
                {/* left: blocks timeline + next comp */}
                <div>
                  {nc && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', marginBottom: 14, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)' }}>Sljedeće natjecanje</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(nc.date)}{nc.location ? ` · ${nc.location}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--accent)', lineHeight: 1 }}>{daysTo}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>DANA</div>
                      </div>
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Blokovi</div>
                  {data.blocks.length === 0 ? <div className="os-empty" style={{ padding: 20 }}>Nema blokova</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.blocks.map((b: any) => {
                        const isNow = b.start_date <= todayStr && todayStr <= b.end_date
                        const st = b.status === 'active' ? 'active' : 'completed'
                        return (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${isNow ? 'var(--border-strong)' : 'var(--border)'}`, background: isNow ? 'var(--surface-2)' : 'transparent' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STC[st] ?? 'var(--text-muted)', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: STC[st], flexShrink: 0 }}>{STL[st] ?? st}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {/* right: month calendar of training days */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setCalM(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}><ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} /></button>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>{monthNames[m]} {y}</span>
                    <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setCalM(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}><ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
                  </div>
                  {(() => {
                    const phasesForDate = (ds: string) => (data.phases as any[]).filter(ph => ds >= ph.start_date && ds <= ph.end_date)
                    const compDate = data.compSel?.date ?? null
                    // collect unique phases visible this month for legend
                    const visiblePhases = new Map<string, { label: string; color: string }>()
                    for (let i = 1; i <= daysIn; i++) {
                      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
                      phasesForDate(ds).forEach((ph: any) => { if (!visiblePhases.has(ph.id)) visiblePhases.set(ph.id, { label: ph.label, color: ph.color }) })
                    }
                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                          {['P', 'U', 'S', 'Č', 'P', 'S', 'N'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', padding: '2px 0' }}>{d}</div>)}
                          {Array.from({ length: firstDow }).map((_, i) => <div key={'e' + i} />)}
                          {Array.from({ length: daysIn }).map((_, i) => {
                            const day = i + 1
                            const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            const done = data.doneDates.has(ds), planned = data.plannedDates.has(ds), isToday = ds === todayStr
                            const dayPhases = phasesForDate(ds)
                            const topPhase = dayPhases[0] ?? null
                            const isComp = ds === compDate
                            return (
                              <div key={day} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, position: 'relative', background: done ? 'rgba(34,197,94,0.16)' : planned ? 'var(--surface-2)' : 'transparent', border: isComp ? '1.5px solid #f59e0b' : isToday ? '1px solid var(--accent)' : topPhase ? `1px solid ${topPhase.color}55` : '1px solid transparent', color: done ? '#4ade80' : planned ? 'var(--text-dim)' : 'var(--text-faint)', boxShadow: topPhase ? `inset 0 0 0 1000px ${topPhase.color}12` : undefined }}>
                                {day}
                                {isComp
                                  ? <span style={{ fontSize: 7, marginTop: 1 }}>🏆</span>
                                  : done
                                    ? <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', marginTop: 1 }} />
                                    : topPhase
                                      ? <span style={{ width: 4, height: 4, borderRadius: '50%', background: topPhase.color, marginTop: 1, opacity: 0.7 }} />
                                      : null}
                              </div>
                            )
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(34,197,94,0.6)' }} /> odrađeno</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--surface-3)' }} /> planirano</span>
                          {[...visiblePhases.values()].map((ph, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: ph.color }} /> {ph.label}</span>
                          ))}
                          {compDate && `${y}-${String(m + 1).padStart(2, '0')}` === compDate.slice(0, 7) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#f59e0b' }}>🏆 {data.compSel?.name}</span>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )
          })()}
        </Card>
      </div>

      {/* row 1: progress | compliance */}
      <div className="grid c2feat">
        <Card id="progress" title={`Pregled napretka — ${athleteName.split(' ')[0]}`}
          head={<><div className="seg">{(['sq', 'bp', 'dl'] as LiftK[]).map(k => <button key={k} className={lift === k ? 'on' : ''} onClick={() => setLift(k)}>{liftNames[k]}</button>)}</div><RangeSel id="progress" /></>}>
          {e1Series.length < 2 ? <div className="os-empty">Nema dovoljno logiranih dana za {liftNames[lift]}</div> : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>e1RM</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-0.04em' }}>{e1Last}<span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>kg</span></span>
                {e1Last - e1Prev !== 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{e1Last - e1Prev > 0 ? '+' : ''}{e1Last - e1Prev} <span style={{ color: 'var(--text-muted)' }}>zadnji</span></span>}
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{sess.length} sesija</span>
              </div>
              <LineChart data={e1Series} dates={e1Dates} labels={e1Dates.length > 2 ? [e1Dates[0], e1Dates[e1Dates.length - 1]] : e1Dates} height={200} />
            </>
          )}
        </Card>

        <Card id="compliance" title="Trening compliance">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
            <Donut pct={data.complianceOverall} label={data.complianceOverall + '%'} sub="Odrađeno" size={150} stroke={14} />
            <div className="compliance-rows">
              <div className="compliance-row"><span className="k">Odrađeni treninzi</span><span className="v">{data.doneWo}<small> / {data.totalWo}</small></span></div>
              <div className="compliance-row"><span className="k">Tjedana</span><span className="v">{data.blockWeeks.length}</span></div>
              <div className="compliance-row"><span className="k">Period</span><span className="v" style={{ fontSize: 13 }}>{data.firstDate ? fmtDate(data.firstDate) : '—'}{data.lastDate ? `–${fmtDate(data.lastDate)}` : ''}</span></div>
            </div>
          </div>
        </Card>
      </div>

      {/* row 2: volume | bodyweight */}
      <div className="grid c2">
        <Card id="volume" title="Volumen po liftu"
          head={<><div className="seg">
            <button className={volLift === 'all' ? 'on' : ''} onClick={() => setVolLift('all')}>SVE</button>
            {(['sq', 'bp', 'dl'] as LiftK[]).map(k => <button key={k} className={volLift === k ? 'on' : ''} onClick={() => setVolLift(k)}>{liftNames[k]}</button>)}
          </div><RangeSel id="volume" /></>}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>TONAŽA (×100 kg) · {volLift === 'all' ? 'glavni liftovi' : `${liftNames[volLift]} varijacije`}</div>
          <MultiLineChart series={volSeries} dates={volDates} height={230} />
        </Card>

        <Card id="bodyweight" title="Trend tjelesne težine" head={<RangeSel id="bodyweight" />}>
          {bwSeries.length < 2 ? <div className="os-empty">Premalo unosa težine</div> : (
            <>
              <LineChart data={bwSeries} dates={bwDates} labels={bwDates.length > 2 ? [bwDates[0], bwDates[bwDates.length - 1]] : bwDates} accent height={200} />
              <div className="readout" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="cell"><div className="k">Trenutno</div><div className="v">{bwSeries[bwSeries.length - 1]}<small> kg</small></div></div>
                <div className="cell"><div className="k">Promjena</div><div className="v" style={{ color: 'var(--text-dim)' }}>{(bwSeries[bwSeries.length - 1] - bwSeries[0]).toFixed(1)} kg</div></div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* row 3: recovery | balance */}
      <div className="grid c2">
        <Card id="recovery" title="Oporavak · zadnji unos">
          {!data.latestWb ? <div className="os-empty">Nema wellbeing unosa</div> : (
            <div className="rec-rows">
              {[
                { k: 'San (h)', v: data.latestWb.sleep_hours, max: 12 },
                { k: 'Stres', v: data.latestWb.stress_level, max: 10 },
                { k: 'Kofein (mg)', v: data.latestWb.caffeine_mg, max: 400 },
              ].filter(r => r.v != null).map((r, i) => (
                <div className="rec-row" key={i}><span className="k">{r.k}</span><span className="val">{r.v}</span><MetricBar value={Number(r.v)} max={r.max} /></div>
              ))}
            </div>
          )}
        </Card>

        <Card id="balance" title="Balans snage">
          {!data.bestE1.sq ? <div className="os-empty">Nema dovoljno e1RM podataka</div> : (
            <>
              <StrengthRadar balance={data.balance} />
              <div className="readout" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="cell"><div className="k">SQ / Total</div><div className="v">{data.balance.sqTotal}%</div></div>
                <div className="cell"><div className="k">BP / Total</div><div className="v">{data.balance.bpTotal}%</div></div>
                <div className="cell"><div className="k">DL / Total</div><div className="v">{data.balance.dlTotal}%</div></div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* row 4: macro & activity (+ history) */}
      <div className="grid c1">
        <MacroCard data={data} cards={cards} setCard={setCard} />
      </div>
    </div>
  )
}

function MacroCard({ data, cards, setCard }: { data: any; cards: DashCards; setCard: (id: CardId, p: Partial<CardState>) => void }) {
  const [hist, setHist] = useState(false)
  const st = cards.macro
  if (st.hidden) return null
  const m = data.latestNut
  return (
    <div className={'card' + (st.collapsed ? ' is-collapsed' : '')}>
      <div className="card-head">
        <span className="t">Makro & aktivnost{m ? ` · ${fmtDate(m.date)}` : ''}</span>
        <div className="card-tools">
          {!st.collapsed && m && <button className={'ctrl' + (hist ? ' on' : '')} style={{ padding: '5px 11px', fontSize: 11 }} onClick={() => setHist(h => !h)}>{hist ? 'Zadnji' : 'Povijest'}</button>}
          <button className="card-min" onClick={() => setCard('macro', { collapsed: !st.collapsed })}>{st.collapsed ? <Plus size={13} /> : <Minus size={13} />}</button>
        </div>
      </div>
      {!st.collapsed && (!m ? <div className="os-empty">Nema unosa prehrane</div> : hist ? (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 1fr', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px 8px', borderBottom: '1px solid var(--border)' }}>
            <span>Datum</span><span style={{ textAlign: 'right' }}>kcal</span><span style={{ textAlign: 'right' }}>P</span><span style={{ textAlign: 'right' }}>UH</span><span style={{ textAlign: 'right' }}>M</span>
          </div>
          {data.nutHistory.map((r: any, i: number) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 1fr', gap: 4, padding: '9px 4px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{r.calories ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.protein_g ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.carbs_g ?? '—'}</span>
              <span style={{ textAlign: 'right' }}>{r.fat_g ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : (() => {
        const p = Number(m.protein_g) || 0, c = Number(m.carbs_g) || 0, f = Number(m.fat_g) || 0
        const tot = p * 4 + c * 4 + f * 9
        const pct = (g: number, k: number) => tot ? Math.round((g * k / tot) * 100) : 0
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1.3fr 1fr', gap: 30, alignItems: 'center' }} className="macro-inner">
            <Donut pct={70} label={(Number(m.calories) || 0).toLocaleString('hr')} sub="kcal" size={148} stroke={14} accent={false} />
            <div className="macro-legend">
              <div className="row"><span className="dot" style={{ background: 'var(--text)' }} /><span className="nm">Protein</span><span className="vv">{p}g · {pct(p, 4)}%</span></div>
              <div className="row"><span className="dot" style={{ background: 'var(--text-muted)' }} /><span className="nm">Ugljikohidrati</span><span className="vv">{c}g · {pct(c, 4)}%</span></div>
              <div className="row"><span className="dot" style={{ background: 'var(--accent)' }} /><span className="nm">Masti</span><span className="vv">{f}g · {pct(f, 9)}%</span></div>
            </div>
            <div className="macro-foot" style={{ marginTop: 0 }}>
              <div className="cell"><div className="k">Koraci</div><div className="v">{m.steps != null ? Number(m.steps).toLocaleString('hr') : '—'}</div></div>
              <div className="cell"><div className="k">Tip dana</div><div className="v" style={{ fontSize: 14 }}>{m.day_type ?? '—'}</div></div>
            </div>
          </div>
        )
      })())}
    </div>
  )
}

function KpiCard({ label, num, unit, sub, data, accent, open, onClick }: { label: string; num: number | string; unit: string; sub: string; data: number[]; accent?: boolean; open?: boolean; onClick?: () => void }) {
  return (
    <button className="kpi" onClick={onClick} style={{ textAlign: 'left', cursor: onClick ? 'pointer' : 'default', borderColor: open ? 'var(--border-strong)' : undefined }}>
      <div className="top"><span className="label">{label}</span>{onClick && <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}</div>
      <div className="num">{num}<span className="unit">{unit}</span></div>
      <div className={'delta ' + (accent ? 'up' : 'flat')}>{sub}</div>
      {data.length > 1 && <div className="spark-slot"><Spark data={data} accent={accent} height={40} /></div>}
    </button>
  )
}

// ── Settings drawer ──
export function SettingsDrawer({ open, onClose, cards, setCard, onReset }: {
  open: boolean; onClose: () => void; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void; onReset: () => void
}) {
  return (
    <>
      <aside className={'settings-drawer' + (open ? ' open' : '')}>
        <div className="sd-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Postavke</div>
            <div className="sd-title">Dashboard</div>
          </div>
          <button className="icon-sm" onClick={onClose} aria-label="zatvori"><X size={16} /></button>
        </div>
        <div className="sd-scroll">
          <div className="sd-section">
            <div className="sd-label">Kartice na dashboardu</div>
            <div className="sd-cards">
              {CARD_META.map(c => {
                const st = cards[c.id]
                return (
                  <div className={'sd-card-row' + (st.hidden ? ' off' : '')} key={c.id}>
                    <button className="sd-eye" onClick={() => setCard(c.id, { hidden: !st.hidden })} title={st.hidden ? 'Prikaži' : 'Sakrij'}>
                      {st.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <span className="sd-card-name">{c.label}</span>
                    {c.series
                      ? <div className="range-select"><select value={st.range} onChange={e => setCard(c.id, { range: Number(e.target.value) })}><option value={4}>4 tj.</option><option value={8}>8 tj.</option><option value={12}>12 tj.</option></select><span className="rs-caret"><ChevronDown size={11} /></span></div>
                      : <span className="sd-na">—</span>}
                    <button className="sd-min" onClick={() => setCard(c.id, { collapsed: !st.collapsed })} title={st.collapsed ? 'Proširi' : 'Minimiziraj'}>
                      {st.collapsed ? <Plus size={13} /> : <Minus size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <button className="sd-reset" onClick={onReset}><RotateCcw size={15} /> Vrati zadano</button>
        </div>
      </aside>
      {open && <div className="sd-scrim" onClick={onClose} />}
    </>
  )
}
