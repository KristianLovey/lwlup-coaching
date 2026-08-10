'use client'
// LWL UP · ADMIN OS — per-athlete analytics dashboard (real Supabase data)
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Minus, Plus, ChevronDown, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Spark, LineChart, StackedBarChart, Donut, StrengthRadar } from './admin-os-charts'
import { estimate1RM } from '../training/training-setplan'

const supabase = createClient()

// ── Card settings model ──
export type CardId = 'blockplan' | 'progress' | 'compliance' | 'volume' | 'bodyweight' | 'recovery' | 'balance' | 'macro' | 'water'
export type CardState = { hidden: boolean; collapsed: boolean; range: number }
export type DashCards = Record<CardId, CardState>
export const CARD_META: { id: CardId; label: string; series: boolean }[] = [
  { id: 'blockplan',  label: 'Plan blokova',       series: false },
  { id: 'progress',   label: 'Pregled napretka',   series: true },
  { id: 'compliance', label: 'Zadnji treninzi',      series: false },
  { id: 'volume',     label: 'Volumen & intenzitet', series: true },
  { id: 'bodyweight', label: 'Trend težine',        series: true },
  { id: 'recovery',   label: 'Oporavak',            series: false },
  { id: 'balance',    label: 'Balans snage',        series: false },
  { id: 'macro',      label: 'Makro & aktivnost',   series: false },
  { id: 'water',      label: 'Unos tekućine',       series: false },
]
export function defaultCards(): DashCards {
  const o = {} as DashCards
  CARD_META.forEach(c => { o[c.id] = { hidden: false, collapsed: false, range: c.id === 'progress' ? 0 : c.id === 'bodyweight' ? 8 : 12 } })
  return o
}

// Progress card: range = broj zadnjih blokova (0 = svi). Stare spremljene
// vrijednosti u tjednima (8/12) normaliziraju se na "svi blokovi".
const BLOCK_RANGE_OPTS = [1, 2, 3, 4]
const normBlockRange = (n: number) => BLOCK_RANGE_OPTS.includes(n) ? n : 0

function RangeSelect({ id, value, onChange }: { id: CardId; value: number; onChange: (n: number) => void }) {
  const byBlocks = id === 'progress'
  return (
    <div className="range-select">
      <select value={byBlocks ? normBlockRange(value) : value} onChange={e => onChange(Number(e.target.value))}>
        {byBlocks
          ? <><option value={1}>1 blok</option><option value={2}>2 bloka</option><option value={3}>3 bloka</option><option value={4}>4 bloka</option><option value={0}>Svi blokovi</option></>
          : <><option value={4}>4 tj.</option><option value={8}>8 tj.</option><option value={12}>12 tj.</option></>}
      </select>
      <span className="rs-caret"><ChevronDown size={11} /></span>
    </div>
  )
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
type Raw = { workouts: any[]; sets: any[]; bw: { date: string; weight_kg: number }[]; wb: any[]; water: { log_date: string; amount_ml: number }[]; nut: any[]; meets: any[]; blocks: any[]; comps: any[]; profile: any | null; phases: any[]; compSel: any | null }

export function AthleteDashboard({ athleteId, athleteName, cards, setCard, onViewAllTraining }: {
  athleteId: string; athleteName: string; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void
  onViewAllTraining?: () => void
}) {
  const [raw, setRaw] = useState<Raw | null>(null)
  const [loading, setLoading] = useState(true)
  const [lift, setLift] = useState<LiftK>('sq')
  const [volLift, setVolLift] = useState<'all' | LiftK>('all')
  const [exp, setExp] = useState<'total' | 'predicted' | 'compliance' | 'bw' | 'daysout' | null>(null)
  const [planYear, setPlanYear] = useState(() => new Date().getFullYear())

  const DASH_CACHE_TTL = 90_000 // 90 s
  // v3: setovi nose block_id + week_number + day_name; dodani water logovi
  const dashCacheKey = `adminos:dash:v3:${athleteId}`

  const load = useCallback(async (background = false) => {
    // Serve stale cache immediately so UI renders before network
    if (!background) {
      try {
        const c = JSON.parse(localStorage.getItem(dashCacheKey) ?? 'null')
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
    const [woRes, setsRes, bwRes, wbRes, waterRes, nutRes, meetRes, blkRes, profRes, phaseRes, compSelRes] = await Promise.all([
      supabase.from('workouts')
        .select('id, workout_date, completed, day_name')
        .eq('athlete_id', athleteId).order('workout_date', { ascending: true }).limit(500),
      supabase.from('set_logs')
        .select('weight_kg, reps, rpe, is_top_set, workout_exercises!inner(exercise:exercises(name,category), workouts!inner(workout_date, day_name, weeks(block_id, week_number)))')
        .eq('athlete_id', athleteId).eq('completed', true)
        .order('id', { ascending: true }).limit(6000),
      supabase.from('pr_logs').select('date, weight_kg').eq('athlete_id', athleteId)
        .eq('lift', 'other').eq('notes', 'Tjelesna težina').order('date', { ascending: true }).limit(400),
      supabase.from('wellbeing_logs').select('*').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(60),
      supabase.from('water_logs').select('log_date, amount_ml').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(120),
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
      wb: wbRes.data ?? [], water: (waterRes.data ?? []) as { log_date: string; amount_ml: number }[],
      nut: nutRes.data ?? [], meets: meetRes.data ?? [],
      blocks: blkRes.data ?? [], comps: [], profile: profRes.data ?? null,
      phases: phaseRes.data ?? [], compSel: compSelComp,
    }
    setRaw(next)
    try { localStorage.setItem(dashCacheKey, JSON.stringify({ ts: Date.now(), raw: next })) } catch {}
    setLoading(false)
  }, [athleteId, dashCacheKey])

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
    const { workouts, sets, bw, wb, water, nut, meets, blocks, profile, phases, compSel } = raw
    // Calendar: use flat workouts (date + completed only)
    const doneDates = new Set<string>()
    const plannedDates = new Set<string>()
    for (const w of workouts) {
      plannedDates.add(w.workout_date)
      if (w.completed) doneDates.add(w.workout_date)
    }

    const weekSet = new Set<string>()
    type SetMeta = { kg: number; reps: number; rpe: number | null; blockId: string | null; week: number | null; day: string | null }
    const e1: Record<LiftK, Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const dayE1: Record<LiftK, Record<string, { e1: number } & SetMeta>> = { sq: {}, bp: {}, dl: {} }
    const dayDone: Record<LiftK, Record<string, SetMeta>> = { sq: {}, bp: {}, dl: {} }
    type TopSet = { date: string; e1: number } & SetMeta
    const topE1: Record<LiftK, TopSet[]> = { sq: [], bp: [], dl: [] }
    const topDone: Record<LiftK, TopSet[]> = { sq: [], bp: [], dl: [] }
    const tonWeekBlock: Record<string, Record<string, number>> = {}
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
      // Blok kojem sesija stvarno pripada (workout → week → block), ne po datumima
      const blockId: string | null = wo?.weeks?.block_id ?? null
      const weekNo: number | null = wo?.weeks?.week_number ?? null
      const dayNm: string | null = wo?.day_name ?? null
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
          // tjedan → blok: najveća tonaža u tjednu odlučuje kojem bloku tjedan pripada
          if (blockId) { const tb = (tonWeekBlock[wk] ??= {}); tb[`${blockId}|${weekNo ?? ''}`] = (tb[`${blockId}|${weekNo ?? ''}`] ?? 0) + ton }
          // competition main lift only (exclude variations) — for the progress charts
          const isComp = cat === 'Squat' || cat === 'Bench' || cat === 'Deadlift'
          // e1RM estimation is only valid for RPE >= 5 — ignore lighter/easier sets entirely
          const validRpe = s.rpe != null && Number(s.rpe) >= 5
          const e = validRpe ? (estimate1RM(kg, reps, s.rpe) ?? 0) : 0
          if (e > 0) {
            if (!e1[lk][wk] || e > e1[lk][wk]) e1[lk][wk] = e
            if (e > bestE1[lk]) { bestE1[lk] = e; bestSrc[lk] = { e1: e, date: workoutDate, name: nm, day: '', kg, reps, rpe: s.rpe ?? null } }
            if (isComp && (!dayE1[lk][workoutDate] || e > dayE1[lk][workoutDate].e1)) dayE1[lk][workoutDate] = { e1: e, kg, reps, rpe: s.rpe ?? null, blockId, week: weekNo, day: dayNm }
          }
          // "odrađeno": heaviest actual weight lifted on the comp lift that day
          if (isComp && validRpe && (!dayDone[lk][workoutDate] || kg > dayDone[lk][workoutDate].kg)) dayDone[lk][workoutDate] = { kg, reps, rpe: s.rpe ?? null, blockId, week: weekNo, day: dayNm }
          // Zahtjev trenera: u graf ulazi SVAKI set označen kao top set (glavni liftovi)
          if (isComp && (s as any).is_top_set) {
            topDone[lk].push({ date: workoutDate, e1: kg, kg, reps, rpe: s.rpe ?? null, blockId, week: weekNo, day: dayNm })
            if (e > 0) topE1[lk].push({ date: workoutDate, e1: e, kg, reps, rpe: s.rpe ?? null, blockId, week: weekNo, day: dayNm })
          }
        }
      }
    }
    type Sess = { date: string; e1: number; kg: number; reps: number; rpe: number | null; blockId: string | null; week: number | null; day: string | null }
    const mkSess = (rec: Record<string, { e1: number } & SetMeta>): Sess[] =>
      Object.entries(rec).map(([date, v]) => ({ date, e1: v.e1, kg: v.kg, reps: v.reps, rpe: v.rpe, blockId: v.blockId, week: v.week, day: v.day })).sort((a, b) => a.date.localeCompare(b.date))
    const mkDone = (rec: Record<string, SetMeta>): Sess[] =>
      Object.entries(rec).map(([date, v]) => ({ date, e1: v.kg, kg: v.kg, reps: v.reps, rpe: v.rpe, blockId: v.blockId, week: v.week, day: v.day })).sort((a, b) => a.date.localeCompare(b.date))
    // Graf prikazuje svaki označeni TOP SET; fallback na najbolji set po danu
    // za liftere koji top setove ne označavaju.
    const sortD = (a: Sess, b: Sess) => a.date.localeCompare(b.date)
    const e1Sessions: Record<LiftK, Sess[]> = {
      sq: topE1.sq.length ? [...topE1.sq].sort(sortD) : mkSess(dayE1.sq),
      bp: topE1.bp.length ? [...topE1.bp].sort(sortD) : mkSess(dayE1.bp),
      dl: topE1.dl.length ? [...topE1.dl].sort(sortD) : mkSess(dayE1.dl),
    }
    const doneSessions: Record<LiftK, Sess[]> = {
      sq: topDone.sq.length ? [...topDone.sq].sort(sortD) : mkDone(dayDone.sq),
      bp: topDone.bp.length ? [...topDone.bp].sort(sortD) : mkDone(dayDone.bp),
      dl: topDone.dl.length ? [...topDone.dl].sort(sortD) : mkDone(dayDone.dl),
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

    // tjedan → dominantni blok + week broj bloka (za trake i tooltip na grafu volumena)
    const blockByWeek: Record<string, string> = {}
    const weekNoByWeek: Record<string, number> = {}
    for (const [wk, m] of Object.entries(tonWeekBlock)) {
      let bestK: string | null = null, bv = 0
      for (const [k, v] of Object.entries(m)) if (v > bv) { bv = v; bestK = k }
      if (bestK) {
        const [bid, wn] = bestK.split('|')
        blockByWeek[wk] = bid
        if (wn) weekNoByWeek[wk] = Number(wn)
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
      doneWo, totalWo, firstDate, lastDate, blockWeeks, curTotal, curBw, blockByWeek, weekNoByWeek,
      wbHistory: [...wb].reverse(), waterLogs: water,
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
  const bwSparkE = data.bw.map(r => Number(r.weight_kg))
  const daysOut = data.nextComp?.date ? Math.max(0, Math.ceil((new Date(data.nextComp.date + 'T12:00:00').getTime() - Date.now()) / 86400000)) : null

  // progress (by session dates) — competition lifts only, RPE >= 5
  // Prozor = zadnjih N blokova. Sesija pripada bloku preko workout → week → block
  // (ne po datumskim rasponima blokova — oni se znaju preklapati).
  const pr = cards.progress
  const nBlocks = normBlockRange(pr.range)
  const orderedBlockIds: string[] = []
  for (const s of [...data.e1Sessions[lift], ...data.doneSessions[lift]].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!s.blockId) continue
    const i = orderedBlockIds.indexOf(s.blockId)
    if (i !== -1) orderedBlockIds.splice(i, 1)
    orderedBlockIds.push(s.blockId) // poredak po zadnjem pojavljivanju
  }
  const allowedBlocks = nBlocks > 0 ? new Set(orderedBlockIds.slice(-nBlocks)) : null
  const windowSess = <T extends { blockId: string | null }>(all: T[]): T[] => {
    let s = allowedBlocks ? all.filter(x => x.blockId != null && allowedBlocks.has(x.blockId)) : all
    if (s.length < 2) s = all.slice(-Math.max(2, Math.min(all.length, 8)))
    return s
  }
  const toMeta = (arr: { kg: number; reps: number; rpe: number | null; week?: number | null; day?: string | null }[]) =>
    arr.map(s => ({ kg: s.kg, reps: s.reps, rpe: s.rpe, week: s.week ?? null, day: s.day ?? null }))
  // estimated 1RM series
  const sess = windowSess(data.e1Sessions[lift])
  const e1Series = sess.map(s => s.e1)
  const e1Dates = sess.map(s => fmtDate(s.date))
  const e1Meta = toMeta(sess)
  const e1Last = e1Series[e1Series.length - 1] ?? 0
  const e1Prev = e1Series[Math.max(0, e1Series.length - 2)] ?? e1Last
  // actual performed weight series
  const doneSess = windowSess(data.doneSessions[lift])
  const doneSeries = doneSess.map(s => s.e1)
  const doneDates = doneSess.map(s => fmtDate(s.date))
  const doneMeta = toMeta(doneSess)
  const doneLast = doneSeries[doneSeries.length - 1] ?? 0
  const donePrev = doneSeries[Math.max(0, doneSeries.length - 2)] ?? doneLast
  // Block bands: label each session by the block it actually belongs to (via blockId).
  // Points are evenly spaced by session, not by date, so gaps between blocks are ignored.
  const BLOCK_COLORS = ['#22c55e', '#6b8cff', '#f59e0b', '#a78bfa', '#ef4444', '#14b8a6']
  const blockColor = new Map<string, string>()
  const blockName = new Map<string, string>()
  ;(data.blocks as any[]).forEach((b, i) => { blockColor.set(b.id, BLOCK_COLORS[i % BLOCK_COLORS.length]); blockName.set(b.id, b.name ?? '') })
  const blockSegments = (sessions: { blockId: string | null }[]) => {
    const segs: { s: number; e: number; label: string; color: string }[] = []
    let cur: { id: string | null; s: number; e: number; label: string; color: string } | null = null
    sessions.forEach((ss, i) => {
      const id = ss.blockId
      if (!cur || cur.id !== id) { cur = { id, s: i, e: i, label: id ? (blockName.get(id) ?? '') : '', color: id ? (blockColor.get(id) ?? '#6b8cff') : 'transparent' }; segs.push(cur) }
      else cur.e = i
    })
    return segs.filter(g => g.label)
  }
  const e1Segments = blockSegments(sess)
  const doneSegments = blockSegments(doneSess)

  // volume (by lift / variation) — stvarni kilogrami po tjednu, ne ×100
  const vol = cards.volume
  const volWeeks = rangeWeeks(vol.range, data.weeks)
  const volDates = volWeeks.map(w => fmtDate(w))
  const volSeries = volLift === 'all'
    ? (['sq', 'bp', 'dl'] as LiftK[]).map(lk => ({ name: liftNames[lk], data: volWeeks.map(w => Math.round(data.volMain[lk][w] ?? 0)) }))
    : Object.entries(data.volVar[volLift])
        .map(([name, byW]) => ({ name, total: Object.values(byW).reduce((a, b) => a + b, 0), data: volWeeks.map(w => Math.round(byW[w] ?? 0)) }))
        .sort((a, b) => b.total - a.total).slice(0, 6).map(({ name, data }) => ({ name, data }))
  // blok-trake po tjednima (isti stil kao na grafu 1RM)
  const volSegments = (() => {
    const segs: { s: number; e: number; label: string; color: string }[] = []
    let cur: { id: string | null; s: number; e: number; label: string; color: string } | null = null
    volWeeks.forEach((w, i) => {
      const id = data.blockByWeek[w] ?? null
      if (!cur || cur.id !== id) { cur = { id, s: i, e: i, label: id ? (blockName.get(id) ?? '') : '', color: id ? (blockColor.get(id) ?? '#6b8cff') : 'transparent' }; segs.push(cur) }
      else cur.e = i
    })
    return segs.filter(g => g.label)
  })()

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
    <RangeSelect id={id} value={cards[id].range} onChange={n => setCard(id, { range: n })} />
  )

  const toggleExp = (k: typeof exp) => setExp(p => p === k ? null : k)

  return (
    <div>
      {/* KPI strip — klik otvara detalje unutar kartice (ne u zasebnom panelu) */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', alignItems: 'start' }}>
        <KpiCard label="Trenutni total" num={data.curTotal || '—'} unit={data.curTotal ? 'kg' : ''} sub="najbolji e1RM zbroj" data={totalSpark} open={exp === 'total'} onClick={() => toggleExp('total')}
          detail={<>
            {(['sq', 'bp', 'dl'] as LiftK[]).map(lk => { const b = data.bestSrc[lk]; return (
              <div key={lk} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{liftNames[lk]}</span>
                {b ? <span style={{ color: 'var(--text-dim)', textAlign: 'right' }}>{b.reps}×{b.kg}{b.rpe ? `@${b.rpe}` : ''} → <b style={{ color: 'var(--text)' }}>{b.e1} kg</b></span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
              </div>) })}
          </>} />
        <KpiCard label="Predviđeni total" num={data.predicted || '—'} unit={data.predicted ? 'kg' : ''} sub={data.latestMeet ? `meet ${fmtDate(data.latestMeet)}` : 'nema meeta'} data={[]} accent open={exp === 'predicted'} onClick={() => toggleExp('predicted')}
          detail={data.predicted ? <>
            {(['sq', 'bp', 'dl'] as LiftK[]).map(lk => (
              <div key={lk} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{liftNames[lk]}</span><span style={{ fontWeight: 700 }}>{data.predBy[lk] || '—'} kg</span>
              </div>))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>Projekcija</span><span style={{ fontWeight: 800, color: 'var(--accent)' }}>{data.predicted} kg</span>
            </div>
          </> : <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Nema unesenih pokušaja za meet. Unesi ih u MEET DAY.</div>} />
        <KpiCard label="Compliance" num={data.totalWo ? data.complianceOverall : '—'} unit={data.totalWo ? '%' : ''} sub={`${data.doneWo}/${data.totalWo} odrađenih treninga`} data={data.complianceSeries} open={exp === 'compliance'} onClick={() => toggleExp('compliance')}
          detail={<p style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            <b style={{ color: 'var(--text)' }}>{data.doneWo}</b> od <b style={{ color: 'var(--text)' }}>{data.totalWo}</b> treninga odrađeno
            {data.firstDate && data.lastDate ? <> · <b style={{ color: 'var(--text)' }}>{fmtDate(data.firstDate)} – {fmtDate(data.lastDate)}</b></> : ''} ({data.blockWeeks.length} {data.blockWeeks.length === 1 ? 'tjedan' : 'tjedana'})
          </p>} />
        <KpiCard label="Tjelesna težina" num={data.curBw ?? '—'} unit={data.curBw ? 'kg' : ''} sub={data.bw.length ? `zadnji: ${fmtDate(data.bw[data.bw.length - 1].date)}` : '—'} data={bwSparkE} open={exp === 'bw'} onClick={() => toggleExp('bw')}
          detail={data.bw.length ? <div style={{ maxHeight: 190, overflowY: 'auto' }}>
            {[...data.bw].reverse().slice(0, 20).map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span><span style={{ fontWeight: 700 }}>{r.weight_kg} kg</span>
              </div>))}
          </div> : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nema unosa težine</div>} />
        <KpiCard label="Days out" num={daysOut ?? '—'} unit={daysOut != null ? 'dana' : ''} sub={data.nextComp ? `${data.nextComp.name}` : 'nema odabranog natjecanja'} data={[]} accent open={exp === 'daysout'} onClick={() => toggleExp('daysout')}
          detail={data.nextComp ? <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{data.nextComp.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(data.nextComp.date)}{data.nextComp.location ? ` · ${data.nextComp.location}` : ''}</div>
          </div> : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Odaberi natjecanje lifteru u planiranju.</div>} />
      </div>

      {/* Plan blokova — timeline + countdown + kalendar */}
      <div className="grid c1">
        <Card id="blockplan" title="Plan blokova">
          {(() => {
            const now = new Date(); const curYear = now.getFullYear()
            // Godišnji timeline: pozicija po DANU u godini (ne po mjesecu) → cijela
            // godina stane u jedan red, tanke crte označavaju početak svakog tjedna.
            const yStart = new Date(planYear, 0, 1).getTime()
            const yEnd = new Date(planYear + 1, 0, 1).getTime()
            const span = yEnd - yStart
            const fracOf = (t: number) => Math.max(0, Math.min(1, (t - yStart) / span))
            const monthNames = ['Sij','Velj','Ožu','Tra','Svi','Lip','Srp','Kol','Ruj','Lis','Stu','Pro']
            const shortDate = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${+p[2]}.${+p[1]}.` : d }

            type Bar = { id: string; label: string; color: string; l: number; w: number; start: string; end: string }
            const bars: Bar[] = ((data.phases as any[]).map((ph) => {
              const s = new Date(ph.start_date + 'T12:00:00').getTime(), e = new Date(ph.end_date + 'T12:00:00').getTime()
              if (e < yStart || s > yEnd) return null
              const l = fracOf(s), r = fracOf(e)
              return { id: ph.id, label: ph.label, color: ph.color, l, w: Math.max(0.012, r - l), start: ph.start_date, end: ph.end_date }
            }).filter(Boolean) as Bar[]).sort((a, b) => a.l - b.l)

            // Greedy raspored u trake (lanes) — blokovi koji se ne preklapaju dijele red
            const lanes: Bar[][] = []
            for (const b of bars) {
              let placed = false
              for (const lane of lanes) {
                if (lane[lane.length - 1].l + lane[lane.length - 1].w <= b.l + 0.001) { lane.push(b); placed = true; break }
              }
              if (!placed) lanes.push([b])
            }
            const compFrac = data.compSel?.date && Number(data.compSel.date.slice(0, 4)) === planYear
              ? { frac: fracOf(new Date(data.compSel.date + 'T12:00:00').getTime()), name: data.compSel.name as string, date: data.compSel.date as string } : null
            const todayFrac = planYear === curYear ? fracOf(now.getTime()) : null

            return (
              <div>
                {/* Year navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 }}>
                  <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setPlanYear((yy) => yy - 1)} aria-label="Prethodna godina"><ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /></button>
                  <div style={{ textAlign: 'center', minWidth: 76 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Godina</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{planYear}</div>
                  </div>
                  <button className="ctrl icon" style={{ padding: 6 }} onClick={() => setPlanYear((yy) => yy + 1)} aria-label="Sljedeća godina"><ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} /></button>
                </div>

                <div style={{ position: 'relative' }}>
                  {/* Mjeseci */}
                  <div style={{ position: 'relative', height: 16, marginBottom: 4 }}>
                    {monthNames.map((mn, mi) => (
                      <div key={mi} style={{ position: 'absolute', left: `${fracOf(new Date(planYear, mi, 1).getTime()) * 100}%`, fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: mi === now.getMonth() && planYear === curYear ? 'var(--accent)' : 'var(--text-muted)', paddingLeft: 3 }}>{mn}</div>
                    ))}
                  </div>

                  {/* Timeline tijelo s tjednim crtama */}
                  <div style={{ position: 'relative', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
                    {/* tjedne crte (svaki ponedjeljak) */}
                    {(() => {
                      const lines: React.ReactNode[] = []
                      const d = new Date(planYear, 0, 1)
                      d.setDate(d.getDate() + ((8 - d.getDay()) % 7)) // prvi ponedjeljak
                      let k = 0
                      while (d.getFullYear() === planYear) {
                        const isMonthStart = d.getDate() <= 7
                        lines.push(<div key={k++} style={{ position: 'absolute', top: 0, bottom: 0, left: `${fracOf(d.getTime()) * 100}%`, width: 1, background: isMonthStart ? 'var(--border-strong)' : 'var(--border)', opacity: isMonthStart ? 0.9 : 0.5 }} />)
                        d.setDate(d.getDate() + 7)
                      }
                      return lines
                    })()}
                    {todayFrac != null && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayFrac * 100}%`, width: 2, background: 'var(--accent)', opacity: 0.7, zIndex: 3 }} />}

                    {bars.length === 0 && !compFrac ? (
                      <div className="os-empty" style={{ padding: 18 }}>Nema blokova u {planYear}.</div>
                    ) : (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {lanes.map((lane, li) => (
                          <div key={li} style={{ position: 'relative', height: 40 }}>
                            {lane.map(b => (
                              <div key={b.id} title={`${b.label} · ${shortDate(b.start)} – ${shortDate(b.end)}`}
                                style={{ position: 'absolute', left: `${b.l * 100}%`, width: `${b.w * 100}%`, top: 0, height: 26, background: b.color, borderRadius: 5, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 2 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 6px' }}>{b.label}</span>
                              </div>
                            ))}
                            {/* datum početka i kraja — inside the 40px lane height */}
                            {lane.map(b => (
                              <div key={b.id + '-d'} style={{ position: 'absolute', left: `${b.l * 100}%`, width: `${b.w * 100}%`, top: 28, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', pointerEvents: 'none', overflow: 'hidden' }}>
                                <span style={{ whiteSpace: 'nowrap' }}>{shortDate(b.start)}</span>
                                {b.w > 0.07 && <span style={{ whiteSpace: 'nowrap' }}>{shortDate(b.end)}</span>}
                              </div>
                            ))}
                          </div>
                        ))}
                        {compFrac && (
                          <div style={{ position: 'absolute', left: `calc(${compFrac.frac * 100}% - 7px)`, top: -2, fontSize: 13, zIndex: 4 }} title={`${compFrac.name} · ${shortDate(compFrac.date)}`}>🏆</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {compFrac && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f59e0b' }}>🏆 {compFrac.name} · {shortDate(compFrac.date)}</div>
                )}
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
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{sess.length} setova</span>
                </div>
                {e1Series.length < 2
                  ? <div className="os-empty" style={{ padding: '28px 0' }}>Premalo comp setova s RPE ≥ 5</div>
                  : <LineChart data={e1Series} dates={e1Dates} segments={e1Segments} meta={e1Meta} valuePrefix="≈ " height={185} />}
              </div>
              {/* Chart 2 — actual performed weight */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Odrađeno · najteži set</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em' }}>{doneLast}<span style={{ fontSize: 14, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>kg</span></span>
                  {doneLast - donePrev !== 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{doneLast - donePrev > 0 ? '+' : ''}{doneLast - donePrev} <span style={{ color: 'var(--text-muted)' }}>zadnji</span></span>}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{doneSess.length} setova</span>
                </div>
                {doneSeries.length < 2
                  ? <div className="os-empty" style={{ padding: '28px 0' }}>Premalo comp setova s RPE ≥ 5</div>
                  : <LineChart data={doneSeries} dates={doneDates} segments={doneSegments} meta={doneMeta} accent height={185} />}
              </div>
            </div>
          )}
        </Card>

        <Card id="compliance" title="Zadnji treninzi">
          <RecentTraining athleteId={athleteId} onViewAll={onViewAllTraining} />
        </Card>
      </div>

      {/* row 2: volume | bodyweight */}
      <div className="grid c2">
        <Card id="volume" title="Volumen po liftu"
          head={<><div className="seg">
            <button className={volLift === 'all' ? 'on' : ''} onClick={() => setVolLift('all')}>SVE</button>
            {(['sq', 'bp', 'dl'] as LiftK[]).map(k => <button key={k} className={volLift === k ? 'on' : ''} onClick={() => setVolLift(k)}>{liftNames[k]}</button>)}
          </div><RangeSel id="volume" /></>}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>TONAŽA (kg) · po tjednu · {volLift === 'all' ? 'glavni liftovi' : `${liftNames[volLift]} varijacije`}</div>
          <StackedBarChart series={volSeries} dates={volDates} segments={volSegments} weekNos={volWeeks.map(w => data.weekNoByWeek[w] ?? null)} height={250} />
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
        <Card id="recovery" title="Oporavak">
          {!data.wbHistory.length ? <div className="os-empty">Nema wellbeing unosa</div> : (() => {
            // zajednička os datuma — zadnjih 14 unosa, kronološki
            const rows = (data.wbHistory.slice(-14) as any[])
            const colorFor = (d: string) => { const bid = data.blockByWeek[weekKey(d)]; return bid ? (blockColor.get(bid) ?? 'var(--text-dim)') : 'var(--text-dim)' }
            const nameFor = (d: string) => { const bid = data.blockByWeek[weekKey(d)]; return bid ? (blockName.get(bid) ?? '') : '' }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {([
                  { k: 'San', unit: 'h', field: 'sleep_hours', max: 12 },
                  { k: 'Stres', unit: '/10', field: 'stress_level', max: 10 },
                  { k: 'Kofein', unit: 'mg', field: 'caffeine_mg', max: Math.max(400, ...rows.map((r: any) => Number(r.caffeine_mg) || 0)) },
                ] as const).map(v => {
                  const latest = [...rows].reverse().find(r => r[v.field] != null)
                  return (
                    <div key={v.field}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{v.k} <span style={{ color: 'var(--text-faint)' }}>({v.unit})</span></span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>{latest?.[v.field] ?? '—'}<span style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 2 }}>{v.unit}</span></span>
                      </div>
                      {/* stupci — širi, s razmakom, vrijednost iznad, boja po bloku */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 46 }}>
                        {rows.map((r: any, i: number) => {
                          const val = Number(r[v.field] ?? 0)
                          const has = r[v.field] != null
                          return (
                            <div key={i} title={`${fmtDate(r.log_date)} · ${v.k}: ${r[v.field] ?? '—'}${nameFor(r.log_date) ? ` · ${nameFor(r.log_date)}` : ''}`}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                              {has && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-dim)', marginBottom: 2 }}>{r[v.field]}</span>}
                              <div style={{ width: '100%', height: `${has ? Math.max(10, (val / v.max) * 100) : 3}%`, background: has ? colorFor(r.log_date) : 'var(--surface-3)', opacity: has ? 0.9 : 0.4, borderRadius: '3px 3px 0 0' }} />
                            </div>
                          )
                        })}
                      </div>
                      {/* datum ispod stupaca — svaki ~3. da se ne preklapa (ostalo na hover) */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {rows.map((r: any, i: number) => {
                          const step = Math.ceil(rows.length / 5)
                          const show = i % step === 0 || i === rows.length - 1
                          return (
                            <span key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'visible' }}>{show ? fmtDate(r.log_date) : ''}</span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Card>

        <Card id="balance" title="Balans snage">
          {!data.bestE1.sq ? <div className="os-empty">Nema dovoljno e1RM podataka</div> : (
            <>
              <StrengthRadar balance={data.balance} e1={data.bestE1} />
              <div className="readout" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
                <div className="cell"><div className="k">Total</div><div className="v" style={{ color: 'var(--accent)' }}>{data.curTotal}<small> kg</small></div></div>
                <div className="cell"><div className="k">SQ / Total</div><div className="v">{data.balance.sqTotal}%</div></div>
                <div className="cell"><div className="k">BP / Total</div><div className="v">{data.balance.bpTotal}%</div></div>
                <div className="cell"><div className="k">DL / Total</div><div className="v">{data.balance.dlTotal}%</div></div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* row 4: macro & activity | water */}
      <div className="grid c2">
        <MacroCard data={data} cards={cards} setCard={setCard} />
        <Card id="water" title="Unos tekućine">
          {(() => {
            const byDay: Record<string, number> = {}
            for (const r of data.waterLogs as any[]) byDay[r.log_date] = (byDay[r.log_date] ?? 0) + Number(r.amount_ml)
            const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
            if (!days.length) return <div className="os-empty">Nema unosa tekućine</div>
            const maxMl = Math.max(...days.map(([, ml]) => ml), 3000)
            const avg = days.reduce((s, [, ml]) => s + ml, 0) / days.length
            const todayMl = byDay[new Date().toISOString().slice(0, 10)] ?? 0
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130 }}>
                  {days.map(([d, ml]) => (
                    <div key={d} title={`${fmtDate(d)} · ${(ml / 1000).toFixed(1)} L`}
                      style={{ flex: 1, height: `${Math.max(6, (ml / maxMl) * 100)}%`, background: '#38bdf8', opacity: 0.85, borderRadius: 4 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>
                  <span>{fmtDate(days[0][0])}</span><span>{fmtDate(days[days.length - 1][0])}</span>
                </div>
                <div className="readout" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="cell"><div className="k">Danas</div><div className="v">{(todayMl / 1000).toFixed(1)}<small> L</small></div></div>
                  <div className="cell"><div className="k">Prosjek · {days.length}d</div><div className="v">{(avg / 1000).toFixed(1)}<small> L</small></div></div>
                </div>
              </>
            )
          })()}
        </Card>
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

// Zadnji odrađeni treninzi — što je lifter stvarno upisao (zamjena za compliance karticu)
function RecentTraining({ athleteId, onViewAll }: { athleteId: string; onViewAll?: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    let alive = true
    supabase.from('workouts')
      .select('id, workout_date, day_name, workout_exercises(id, exercise_order, exercise:exercises(name), set_logs(set_number, weight_kg, reps, rpe, completed, is_top_set))')
      .eq('athlete_id', athleteId).eq('completed', true)
      .order('workout_date', { ascending: false }).limit(5)
      .then(({ data }) => { if (alive) setRows(data ?? []) })
    return () => { alive = false }
  }, [athleteId])
  if (!rows) return <div className="os-empty" style={{ display: 'flex', justifyContent: 'center' }}><Loader2 size={16} className="os-spin" /></div>
  if (!rows.length) return <div className="os-empty">Nema odrađenih treninga</div>
  return (
    <div>
      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }}>
        {rows.map((wo: any) => (
          <div key={wo.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{wo.day_name || 'Trening'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmtDate(wo.workout_date)}</span>
            </div>
            {[...(wo.workout_exercises ?? [])].sort((a: any, b: any) => a.exercise_order - b.exercise_order).map((we: any) => {
              const done = [...(we.set_logs ?? [])].filter((sl: any) => sl.completed).sort((a: any, b: any) => a.set_number - b.set_number)
              if (!done.length) return null
              return (
                <div key={we.id} style={{ display: 'flex', gap: 10, padding: '4px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-dim)', flex: '0 0 38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{we.exercise?.name ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', flex: 1, textAlign: 'right', overflowWrap: 'anywhere' }}>
                    {done.map((sl: any) => `${Number(sl.weight_kg)}×${sl.reps}${sl.rpe ? `@${sl.rpe}` : ''}${sl.is_top_set ? '★' : ''}`).join('  ')}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {onViewAll && (
        <button className="btn-a" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={onViewAll}>
          Prikaži sve treninge <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      )}
    </div>
  )
}

function KpiCard({ label, num, unit, sub, data, accent, open, onClick, detail }: { label: string; num: number | string; unit: string; sub: string; data: number[]; accent?: boolean; open?: boolean; onClick?: () => void; detail?: React.ReactNode }) {
  return (
    <div className="kpi" style={{ textAlign: 'left', borderColor: open ? 'var(--border-strong)' : undefined }}>
      <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }} role="button">
        <div className="top"><span className="label">{label}</span>{onClick && <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}</div>
        <div className="num">{num}<span className="unit">{unit}</span></div>
        <div className={'delta ' + (accent ? 'up' : 'flat')}>{sub}</div>
        {/* sve KPI kartice iste visine — prazan slot kad nema sparklinea */}
        {data.length > 1
          ? <div className="spark-slot"><Spark data={data} accent={accent} height={40} /></div>
          : <div className="spark-slot" style={{ height: 40 }} />}
      </div>
      {open && detail && <div className="os-fade" style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>{detail}</div>}
    </div>
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
                      ? <RangeSelect id={c.id} value={st.range} onChange={n => setCard(c.id, { range: n })} />
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
