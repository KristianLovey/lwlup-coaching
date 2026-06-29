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
type Raw = { workouts: any[]; sets: any[]; bw: { date: string; weight_kg: number }[]; wb: any[]; nut: any[]; meets: any[]; blocks: any[]; comps: any[]; profile: any | null; phases: any[]; compSel: any | null }

export function AthleteDashboard({ athleteId, athleteName, cards, setCard }: {
  athleteId: string; athleteName: string; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void
}) {
  const [raw, setRaw] = useState<Raw | null>(null)
  const [loading, setLoading] = useState(true)
  const [lift, setLift] = useState<LiftK>('sq')
  const [volLift, setVolLift] = useState<'all' | LiftK>('all')
  const [exp, setExp] = useState<'total' | 'predicted' | 'compliance' | 'bw' | 'tonnage' | null>(null)
  const [planYear, setPlanYear] = useState(() => new Date().getFullYear())

  const DASH_CACHE_TTL = 90_000 // 90 s
  const dashCacheKey = `adminos:dash:${athleteId}`

  const load = useCallback(async (background = false) => {
    // Serve stale cache immediately so UI renders before network
    if (!background) {
      try {
        const c = JSON.parse(localStorage.getItem(`adminos:dash:${athleteId}`) ?? 'null')
        if (c?.ts && Date.now() - c.ts < DASH_CACHE_TTL && c.raw) {
          setRaw(c.raw); setLoading(false)
          // Refresh in background so next view is still fresh
          setTimeout(() => load(true), 0); return
        }
      } catch {}
    }

    const today = new Date().toISOString().slice(0, 10)
    // Two lean workouts queries instead of one huge nested query:
    // A) just dates+completion (for calendar/compliance) — tiny payload
    // B) flat set_logs join (for e1RM/volume charts) — no workout_exercises nesting
    const [woRes, setsRes, bwRes, wbRes, nutRes, meetRes, blkRes, profRes, phaseRes, compSelRes] = await Promise.all([
      supabase.from('workouts')
        .select('id, workout_date, completed, day_name')
        .eq('athlete_id', athleteId).order('workout_date', { ascending: true }).limit(500),
      supabase.from('set_logs')
        .select('weight_kg, reps, rpe, is_top_set, workout_exercises!inner(exercise:exercises(name,category), workouts!inner(workout_date))')
        .eq('athlete_id', athleteId).eq('completed', true)
        .order('id', { ascending: true }).limit(6000),
      supabase.from('pr_logs').select('date, weight_kg').eq('athlete_id', athleteId)
        .eq('lift', 'other').eq('notes', 'Tjelesna težina').order('date', { ascending: true }).limit(400),
      supabase.from('wellbeing_logs').select('*').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(14),
      supabase.from('nutrition_logs').select('*').eq('user_id', athleteId).order('date', { ascending: false }).limit(90),
      supabase.from('meet_attempts').select('lift, meet_date, competition_id, attempt1_max, attempt1_actual, attempt2_max, attempt2_actual, attempt3_max, attempt3_actual').eq('athlete_id', athleteId).order('meet_date', { ascending: false }).limit(30),
      supabase.from('blocks').select('id, name, status, start_date, end_date').eq('athlete_id', athleteId).order('start_date', { ascending: true }).limit(60),
      supabase.from('lifters').select('current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class').eq('id', athleteId).single(),
      supabase.from('athlete_training_phases').select('id, label, start_date, end_date, color').eq('athlete_id', athleteId).order('start_date', { ascending: true }),
      supabase.from('athlete_competition_selection').select('competition:competitions(name, date, location)').eq('athlete_id', athleteId).maybeSingle(),
    ])
    const compSelComp = (compSelRes.data as any)?.competition ?? null
    const next: Raw = {
      workouts: woRes.data ?? [], sets: setsRes.data ?? [],
      bw: (bwRes.data ?? []) as { date: string; weight_kg: number }[],
      wb: wbRes.data ?? [], nut: nutRes.data ?? [], meets: meetRes.data ?? [],
      blocks: blkRes.data ?? [], comps: [], profile: profRes.data ?? null,
      phases: phaseRes.data ?? [], compSel: compSelComp,
    }
    setRaw(next)
    try { localStorage.setItem(`adminos:dash:${athleteId}`, JSON.stringify({ ts: Date.now(), raw: next })) } catch {}
    setLoading(false)
  }, [athleteId])

  useEffect(() => { setLoading(true); load(false) }, [load])

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
    const { workouts, sets, bw, wb, nut, meets, blocks, profile, phases, compSel } = raw
    // Calendar: use flat workouts (date + completed only)
    const doneDates = new Set<string>()
    const plannedDates = new Set<string>()
    for (const w of workouts) {
      plannedDates.add(w.workout_date)
      if (w.completed) doneDates.add(w.workout_date)
    }

    const weekSet = new Set<string>()
    const e1: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const dayE1: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const dayDone: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const volByWeek: Record<string, number> = {}
    const rpeByWeek: Record<string, number[]> = {}
    const compByWeek: Record<string, { done: number; total: number }> = {}
    const bestE1: Record<LiftK, number> = { sq: 0, bp: 0, dl: 0 }
    const bestSrc: Record<LiftK, Best | null> = { sq: null, bp: null, dl: null }
    const volMain: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const volVar: Record<LiftK, Record<string, Record<string, number>>> = { sq: {}, bp: {}, dl: {} }

    // Compliance: from flat workouts
    for (const w of workouts) {
      const wk = weekKey(w.workout_date)
      weekSet.add(wk)
      const c = (compByWeek[wk] ??= { done: 0, total: 0 })
      c.total++; if (w.completed) c.done++
    }

    // Analytics (e1RM, volume): from flat set_logs join — much smaller payload
    for (const s of sets) {
      const we = (s as any).workout_exercises
      const wo = we?.workouts
      const workoutDate: string = wo?.workout_date ?? ''
      if (!workoutDate) continue
      const cat: string = we?.exercise?.category ?? ''
      const nm: string = we?.exercise?.name ?? cat
      const lk = liftKey(cat)
      const wk = weekKey(workoutDate)
      const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
      if (kg > 0 && Number.isFinite(reps) && reps > 0) {
        const ton = kg * reps
        volByWeek[wk] = (volByWeek[wk] ?? 0) + ton
        if (s.rpe) (rpeByWeek[wk] ??= []).push(Number(s.rpe))
        if (lk) {
          volMain[lk][wk] = (volMain[lk][wk] ?? 0) + ton
          const vv = (volVar[lk][nm] ??= {}); vv[wk] = (vv[wk] ?? 0) + ton
          // e1RM estimation is only valid for RPE >= 5 — ignore lighter/easier sets entirely
          const validRpe = s.rpe != null && Number(s.rpe) >= 5
          if (validRpe) {
            // competition main lift only (exclude variations) — for the progress charts
            const isComp = cat === 'Squat' || cat === 'Bench' || cat === 'Deadlift'
            const e = estimate1RM(kg, reps, s.rpe) ?? 0
            if (e > 0) {
              if (!e1[lk][wk] || e > e1[lk][wk]) e1[lk][wk] = e
              if (e > bestE1[lk]) { bestE1[lk] = e; bestSrc[lk] = { e1: e, date: workoutDate, name: nm, day: '', kg, reps, rpe: s.rpe ?? null } }
              if (isComp && (!dayE1[lk][workoutDate] || e > dayE1[lk][workoutDate])) dayE1[lk][workoutDate] = e
            }
            // "odrađeno": heaviest actual weight lifted on the comp lift that day
            if (isComp && (!dayDone[lk][workoutDate] || kg > dayDone[lk][workoutDate])) dayDone[lk][workoutDate] = kg
          }
        }
      }
    }
    const e1Sessions: Record<LiftK, { date: string; e1: number }[]> = {
      sq: Object.entries(dayE1.sq).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      bp: Object.entries(dayE1.bp).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      dl: Object.entries(dayE1.dl).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
    }
    const doneSessions: Record<LiftK, { date: string; e1: number }[]> = {
      sq: Object.entries(dayDone.sq).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      bp: Object.entries(dayDone.bp).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
      dl: Object.entries(dayDone.dl).map(([date, v]) => ({ date, e1: v })).sort((a, b) => a.date.localeCompare(b.date)),
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

    // tonnage last 7 days + by muscle group — use flat sets
    const ago7Str = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    let ton7 = 0
    const ton7ByCat: Record<string, number> = {}
    for (const s of sets) {
      const workoutDate: string = (s as any).workout_exercises?.workouts?.workout_date ?? ''
      if (workoutDate >= ago7Str) {
        const cat = (s as any).workout_exercises?.exercise?.category ?? 'Ostalo'
        const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
        if (kg > 0 && reps > 0) { ton7 += kg * reps; ton7ByCat[cat] = (ton7ByCat[cat] ?? 0) + kg * reps }
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
      weeks, e1Sessions, doneSessions, bestE1, bestSrc, volByWeek, rpeByWeek, totalE1Week, bwByWeek, volMain, volVar,
      complianceSeries, complianceOverall: totalWo ? Math.round((doneWo / totalWo) * 100) : 0,
      doneWo, totalWo, firstDate, lastDate, blockWeeks, curTotal, curBw, ton7, ton7ByCat,
      predicted, predBy, latestMeet: meets[0]?.meet_date ?? null,
      latestWb: wb[0] ?? null, latestNut: nut[0] ?? null, nutHistory: nut, bw, profile,
      blocks, nextComp: compSel ?? null, comps: [], doneDates, plannedDates, phases, compSel,
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

  // progress (by session dates) — competition lifts only, RPE >= 5
  const pr = cards.progress
  const cut = Date.now() - pr.range * 7 * 86400000
  const windowSess = (all: { date: string; e1: number }[]) => {
    let s = all.filter(x => new Date(x.date + 'T12:00:00').getTime() >= cut)
    if (s.length < 2) s = all.slice(-Math.max(2, Math.min(all.length, 8)))
    return s
  }
  // estimated 1RM series
  const sess = windowSess(data.e1Sessions[lift])
  const e1Series = sess.map(s => s.e1)
  const e1Dates = sess.map(s => fmtDate(s.date))
  const e1Last = e1Series[e1Series.length - 1] ?? 0
  const e1Prev = e1Series[Math.max(0, e1Series.length - 2)] ?? e1Last
  // actual performed weight series
  const doneSess = windowSess(data.doneSessions[lift])
  const doneSeries = doneSess.map(s => s.e1)
  const doneDates = doneSess.map(s => fmtDate(s.date))
  const doneLast = doneSeries[doneSeries.length - 1] ?? 0
  const donePrev = doneSeries[Math.max(0, doneSeries.length - 2)] ?? doneLast
  // Block bands: label each session by the block its date falls in (gaps between
  // blocks are naturally ignored — points are evenly spaced by session, not by date).
  const BLOCK_COLORS = ['#22c55e', '#6b8cff', '#f59e0b', '#a78bfa', '#ef4444', '#14b8a6']
  const blockColor = new Map<string, string>()
  ;(data.blocks as any[]).forEach((b, i) => blockColor.set(b.id, BLOCK_COLORS[i % BLOCK_COLORS.length]))
  const blockSegments = (sessions: { date: string }[]) => {
    const findB = (d: string) => (data.blocks as any[]).find(b => b.start_date && b.end_date && d >= b.start_date && d <= b.end_date) ?? null
    const segs: { s: number; e: number; label: string; color: string }[] = []
    let cur: { id: string | null; s: number; e: number; label: string; color: string } | null = null
    sessions.forEach((ss, i) => {
      const b = findB(ss.date); const id = b?.id ?? null
      if (!cur || cur.id !== id) { cur = { id, s: i, e: i, label: b?.name ?? '', color: b ? (blockColor.get(b.id) ?? '#6b8cff') : 'transparent' }; segs.push(cur) }
      else cur.e = i
    })
    return segs.filter(g => g.label)
  }
  const e1Segments = blockSegments(sess)
  const doneSegments = blockSegments(doneSess)

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
        <Card id="blockplan" title="Plan blokova">
          {(() => {
            const nc = data.nextComp
            const daysTo = nc ? Math.max(0, Math.ceil((new Date(nc.date + 'T12:00:00').getTime() - Date.now()) / 86400000)) : null
            const now = new Date(); const curMonth = now.getMonth(), curYear = now.getFullYear()
            type PRow = { id: string; label: string; color: string; startM: number; endM: number }
            const rows: PRow[] = ((data.phases as any[]).map((ph) => {
              const s = new Date(ph.start_date + 'T12:00:00'), e = new Date(ph.end_date + 'T12:00:00')
              const sy = s.getFullYear(), ey = e.getFullYear()
              if (planYear < sy || planYear > ey) return null
              return { id: ph.id, label: ph.label, color: ph.color, startM: planYear > sy ? 0 : s.getMonth(), endM: planYear < ey ? 11 : e.getMonth() }
            }).filter(Boolean)) as PRow[]
            const legend = Array.from(new Map((data.phases as any[]).map((p) => [p.label + p.color, { label: p.label as string, color: p.color as string }])).values())
            const compInYear = data.compSel?.date && Number(data.compSel.date.slice(0, 4)) === planYear
              ? { month: Number(data.compSel.date.slice(5, 7)) - 1, name: data.compSel.name as string } : null
            return (
              <div>
                {nc && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', marginBottom: 16, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
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

                {/* Year navigator — pomak lijevo/desno po godinama */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 }}>
                  <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setPlanYear((yy) => yy - 1)} aria-label="Prethodna godina"><ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /></button>
                  <div style={{ textAlign: 'center', minWidth: 76 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Godina</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{planYear}</div>
                  </div>
                  <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setPlanYear((yy) => yy + 1)} aria-label="Sljedeća godina"><ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} /></button>
                </div>

                {/* Month table — stupci = mjeseci, obojeni redovi = blokovi */}
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 540 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>Mjesec</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4, marginBottom: 8 }}>
                      {Array.from({ length: 12 }).map((_, mi) => {
                        const here = mi === curMonth && planYear === curYear
                        return <div key={mi} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, padding: '5px 0', borderRadius: 6, color: here ? 'var(--accent)' : 'var(--text-muted)', background: here ? 'var(--accent-soft)' : 'var(--surface-1)' }}>{mi + 1}</div>
                      })}
                    </div>
                    {rows.length === 0 && !compInYear ? (
                      <div className="os-empty" style={{ padding: 22 }}>Nema blokova u {planYear}.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {rows.map((r) => (
                          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4 }}>
                            {Array.from({ length: 12 }).map((_, mi) => {
                              const active = mi >= r.startM && mi <= r.endM
                              return <div key={mi} title={r.label} style={{ height: 22, borderRadius: 6, background: active ? r.color : 'var(--surface-1)', opacity: active ? 1 : 0.45, boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.18)' : undefined }} />
                            })}
                          </div>
                        ))}
                        {compInYear && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4, marginTop: 2 }}>
                            {Array.from({ length: 12 }).map((_, mi) => (
                              <div key={mi} style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{mi === compInYear.month ? '🏆' : ''}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legenda — boja + ime */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {legend.length === 0 && !compInYear ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>Označi blokove s bojom u planiranju liftera.</span>
                  ) : legend.map((l, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }} /> {l.label}
                    </span>
                  ))}
                  {compInYear && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f59e0b' }}>🏆 {compInYear.name}</span>
                  )}
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
          {e1Series.length < 2 && doneSeries.length < 2 ? (
            <div className="os-empty">Nema dovoljno comp setova (RPE ≥ 5) za {liftNames[lift]}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Chart 1 — estimated 1RM */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Procijenjeni 1RM</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em' }}>{e1Last}<span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>kg</span></span>
                  {e1Last - e1Prev !== 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{e1Last - e1Prev > 0 ? '+' : ''}{e1Last - e1Prev} <span style={{ color: 'var(--text-muted)' }}>zadnji</span></span>}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{sess.length} sesija</span>
                </div>
                {e1Series.length < 2
                  ? <div className="os-empty" style={{ padding: '28px 0' }}>Premalo comp setova s RPE ≥ 5</div>
                  : <LineChart data={e1Series} dates={e1Dates} segments={e1Segments} height={185} />}
              </div>
              {/* Chart 2 — actual performed weight */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Odrađeno · najteži set</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em' }}>{doneLast}<span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>kg</span></span>
                  {doneLast - donePrev !== 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{doneLast - donePrev > 0 ? '+' : ''}{doneLast - donePrev} <span style={{ color: 'var(--text-muted)' }}>zadnji</span></span>}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{doneSess.length} sesija</span>
                </div>
                {doneSeries.length < 2
                  ? <div className="os-empty" style={{ padding: '28px 0' }}>Premalo comp setova s RPE ≥ 5</div>
                  : <LineChart data={doneSeries} dates={doneDates} segments={doneSegments} accent height={185} />}
              </div>
            </div>
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
