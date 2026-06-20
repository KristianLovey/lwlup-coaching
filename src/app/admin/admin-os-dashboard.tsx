'use client'
// LWL UP · ADMIN OS — per-athlete analytics dashboard (real Supabase data)
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Minus, Plus, ChevronDown, X, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { Spark, LineChart, VolumeBars, Donut, StrengthRadar, MetricBar } from './admin-os-charts'

const supabase = createClient()

// ── Card settings model ──
export type CardId = 'progress' | 'compliance' | 'volume' | 'bodyweight' | 'recovery' | 'balance' | 'macro'
export type CardState = { hidden: boolean; collapsed: boolean; range: number }
export type DashCards = Record<CardId, CardState>
export const CARD_META: { id: CardId; label: string; series: boolean }[] = [
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

const epley = (kg: number, reps: number) => Math.round(kg * (1 + reps / 30))
const liftKey = (cat: string): 'sq' | 'bp' | 'dl' | null =>
  cat === 'Squat' || cat === 'Squat Variation' ? 'sq'
    : cat === 'Bench' || cat === 'Bench Variation' ? 'bp'
      : cat === 'Deadlift' || cat === 'Deadlift Variation' ? 'dl' : null

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// carry-forward fill so a gap week keeps the last known value
function fillSeries(weeks: string[], perWeek: Record<string, number>): number[] {
  let last: number | null = null
  const out: number[] = []
  for (const w of weeks) { if (perWeek[w] != null) last = perWeek[w]; if (last != null) out.push(last) }
  return out
}

type Raw = {
  workouts: any[]
  bw: { date: string; weight_kg: number }[]
  wb: any[]
  nut: any[]
  profile: any | null
}

export function AthleteDashboard({ athleteId, athleteName, cards, setCard }: {
  athleteId: string; athleteName: string; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void
}) {
  const [raw, setRaw] = useState<Raw | null>(null)
  const [loading, setLoading] = useState(true)
  const [lift, setLift] = useState<'sq' | 'bp' | 'dl'>('sq')

  useEffect(() => {
    let alive = true
    setLoading(true)
    const load = async () => {
      const [woRes, bwRes, wbRes, nutRes, profRes] = await Promise.all([
        supabase.from('workouts')
          .select('id, workout_date, completed, workout_exercises(id, exercise:exercises(category), set_logs(weight_kg, reps, rpe, completed, is_top_set))')
          .eq('athlete_id', athleteId).order('workout_date', { ascending: true }).limit(400),
        supabase.from('pr_logs').select('date, weight_kg').eq('athlete_id', athleteId)
          .eq('lift', 'other').eq('notes', 'Tjelesna težina').order('date', { ascending: true }).limit(400),
        supabase.from('wellbeing_logs').select('*').eq('user_id', athleteId).order('log_date', { ascending: false }).limit(14),
        supabase.from('nutrition_logs').select('*').eq('user_id', athleteId).order('date', { ascending: false }).limit(1),
        supabase.from('profiles').select('current_squat_1rm, current_bench_1rm, current_deadlift_1rm, body_weight, weight_class').eq('id', athleteId).single(),
      ])
      if (!alive) return
      setRaw({
        workouts: woRes.data ?? [],
        bw: (bwRes.data ?? []) as { date: string; weight_kg: number }[],
        wb: wbRes.data ?? [],
        nut: nutRes.data ?? [],
        profile: profRes.data ?? null,
      })
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [athleteId])

  const data = useMemo(() => {
    if (!raw) return null
    const { workouts, bw, wb, nut, profile } = raw

    // weekly buckets
    const weekSet = new Set<string>()
    const e1: Record<'sq' | 'bp' | 'dl', Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    // per fully-completed day → best top-set e1RM (drives the progress chart)
    const dayE1: Record<'sq' | 'bp' | 'dl', Record<string, number>> = { sq: {}, bp: {}, dl: {} }
    const volByWeek: Record<string, number> = {}
    const rpeByWeek: Record<string, number[]> = {}
    const compByWeek: Record<string, { done: number; total: number }> = {}
    const bestE1: Record<'sq' | 'bp' | 'dl', number> = { sq: 0, bp: 0, dl: 0 }

    for (const w of workouts) {
      const wk = weekKey(w.workout_date)
      weekSet.add(wk)
      const c = (compByWeek[wk] ??= { done: 0, total: 0 })
      c.total++; if (w.completed) c.done++
      for (const we of (w.workout_exercises ?? [])) {
        const cat = we.exercise?.category ?? ''
        const lk = liftKey(cat)
        for (const s of (we.set_logs ?? [])) {
          const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
          if (kg > 0 && Number.isFinite(reps) && reps > 0) {
            volByWeek[wk] = (volByWeek[wk] ?? 0) + kg * reps
            if (s.rpe) (rpeByWeek[wk] ??= []).push(Number(s.rpe))
            if (s.is_top_set && lk) {
              const e = epley(kg, reps)
              if (!e1[lk][wk] || e > e1[lk][wk]) e1[lk][wk] = e
              if (e > bestE1[lk]) bestE1[lk] = e
              // only count days that are marked fully completed
              if (w.completed && (!dayE1[lk][w.workout_date] || e > dayE1[lk][w.workout_date])) dayE1[lk][w.workout_date] = e
            }
          }
        }
      }
    }
    const e1Sessions: Record<'sq' | 'bp' | 'dl', { date: string; e1: number }[]> = {
      sq: Object.entries(dayE1.sq).map(([date, e1v]) => ({ date, e1: e1v })).sort((a, b) => a.date.localeCompare(b.date)),
      bp: Object.entries(dayE1.bp).map(([date, e1v]) => ({ date, e1: e1v })).sort((a, b) => a.date.localeCompare(b.date)),
      dl: Object.entries(dayE1.dl).map(([date, e1v]) => ({ date, e1: e1v })).sort((a, b) => a.date.localeCompare(b.date)),
    }
    const weeks = [...weekSet].sort()
    const bwByWeek: Record<string, number> = {}
    for (const r of bw) { bwByWeek[weekKey(r.date)] = Number(r.weight_kg) }
    for (const w of Object.keys(bwByWeek)) weekSet.add(w)
    const allWeeks = [...weekSet].sort()

    const totalE1Week: Record<string, number> = {}
    for (const wk of weeks) {
      const s = e1.sq[wk] ?? 0, b = e1.bp[wk] ?? 0, d = e1.dl[wk] ?? 0
      if (s || b || d) totalE1Week[wk] = s + b + d
    }

    // compliance overall
    const totalWo = workouts.length
    const doneWo = workouts.filter((w: any) => w.completed).length
    const complianceSeries = weeks.map(wk => {
      const c = compByWeek[wk]; return c && c.total ? Math.round((c.done / c.total) * 100) : 0
    })

    // tonnage last 7 days
    const today = new Date()
    const ago7 = new Date(today); ago7.setDate(today.getDate() - 7)
    let ton7 = 0
    for (const w of workouts) {
      const d = new Date(w.workout_date + 'T12:00:00')
      if (d >= ago7) for (const we of (w.workout_exercises ?? [])) for (const s of (we.set_logs ?? [])) {
        const kg = Number(s.weight_kg), reps = parseFloat(String(s.reps ?? ''))
        if (kg > 0 && reps > 0) ton7 += kg * reps
      }
    }

    const curTotal = bestE1.sq + bestE1.bp + bestE1.dl
    const curBw = bw.length ? Number(bw[bw.length - 1].weight_kg) : (profile?.body_weight ?? null)
    const latestWb = wb[0] ?? null
    const latestNut = nut[0] ?? null

    return {
      weeks, allWeeks, e1, e1Sessions, bestE1, volByWeek, rpeByWeek, totalE1Week, bwByWeek,
      complianceSeries, complianceOverall: totalWo ? Math.round((doneWo / totalWo) * 100) : 0,
      doneWo, totalWo, curTotal, curBw, ton7, latestWb, latestNut, profile,
      balance: {
        benchSquat: bestE1.sq ? Math.round((bestE1.bp / bestE1.sq) * 100) : 0,
        deadliftSquat: bestE1.sq ? Math.round((bestE1.dl / bestE1.sq) * 100) : 0,
        totalSquat: bestE1.sq ? Math.round((curTotal / bestE1.sq) * 100) : 0,
      },
    }
  }, [raw])

  if (loading || !data) return <div className="os-empty" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={20} className="os-spin" /></div>

  const rangeWeeks = (n: number, arr: string[]) => arr.slice(Math.max(0, arr.length - n))
  const sliceNum = (n: number, arr: number[]) => arr.slice(Math.max(0, arr.length - n))

  // KPI sparklines
  const totalSpark = fillSeries(data.weeks, data.totalE1Week)
  const bwSpark = fillSeries(data.allWeeks, data.bwByWeek)
  const volSpark = data.weeks.map(w => Math.round((data.volByWeek[w] ?? 0) / 100))

  // progress card — plotted by actual dates of fully-completed logged days
  const pr = cards.progress
  const fmtDate = (d: string) => { const [, mo, da] = d.split('-'); return `${da}.${mo}` }
  const allSess = data.e1Sessions[lift]
  const cutoff = Date.now() - pr.range * 7 * 86400000
  let sess = allSess.filter(s => new Date(s.date + 'T12:00:00').getTime() >= cutoff)
  if (sess.length < 2) sess = allSess.slice(-Math.max(2, Math.min(allSess.length, 8)))
  const e1Series = sess.map(s => s.e1)
  const e1Last = e1Series[e1Series.length - 1] ?? 0
  const e1Prev = e1Series[Math.max(0, e1Series.length - 2)] ?? e1Last
  const e1Labels = sess.length >= 2
    ? [fmtDate(sess[0].date), ...(sess.length > 3 ? [fmtDate(sess[Math.floor(sess.length / 2)].date)] : []), fmtDate(sess[sess.length - 1].date)]
    : undefined

  const vol = cards.volume
  const volWeeks = rangeWeeks(vol.range, data.weeks)
  const volSeries = volWeeks.map(w => Math.round((data.volByWeek[w] ?? 0) / 100))
  const rpeSeries = volWeeks.map(w => { const a = data.rpeByWeek[w] ?? []; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 })

  const bwC = cards.bodyweight
  const bwSeries = sliceNum(bwC.range, bwSpark)

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
  const liftNames = { sq: 'Squat', bp: 'Bench', dl: 'Deadlift' } as const

  return (
    <div>
      {/* KPI strip */}
      <div className="kpi-strip">
        <KpiCard label="Trenutni total" num={data.curTotal || '—'} unit={data.curTotal ? 'kg' : ''} sub="e1RM zbroj" data={totalSpark} />
        <KpiCard label="Compliance" num={data.totalWo ? data.complianceOverall : '—'} unit={data.totalWo ? '%' : ''} sub={`${data.doneWo}/${data.totalWo} treninga`} data={data.complianceSeries} accent />
        <KpiCard label="Tjelesna težina" num={data.curBw ?? '—'} unit={data.curBw ? 'kg' : ''} sub={data.profile?.weight_class ? `kat. ${data.profile.weight_class}` : ''} data={bwSpark} />
        <KpiCard label="Tonaža · 7d" num={data.ton7 ? Math.round(data.ton7).toLocaleString('hr') : '—'} unit={data.ton7 ? 'kg' : ''} sub="ukupno podignuto" data={volSpark} accent />
      </div>

      {/* row 1: progress | compliance */}
      <div className="grid c2feat">
        <Card id="progress" title={`Pregled napretka — ${athleteName.split(' ')[0]}`}
          head={<><div className="seg">{(['sq', 'bp', 'dl'] as const).map(k => <button key={k} className={lift === k ? 'on' : ''} onClick={() => setLift(k)}>{liftNames[k]}</button>)}</div><RangeSel id="progress" /></>}>
          {e1Series.length < 2 ? <div className="os-empty">Nema dovoljno odrađenih dana s top setom za {liftNames[lift]}</div> : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>e1RM</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-0.04em' }}>{e1Last}<span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 4 }}>kg</span></span>
                {e1Last - e1Prev !== 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{e1Last - e1Prev > 0 ? '+' : ''}{e1Last - e1Prev} <span style={{ color: 'var(--text-muted)' }}>zadnji</span></span>}
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{sess.length} sesija</span>
              </div>
              <LineChart data={e1Series} labels={e1Labels} height={200} />
            </>
          )}
        </Card>

        <Card id="compliance" title="Trening compliance">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
            <Donut pct={data.complianceOverall} label={data.complianceOverall + '%'} sub="Odrađeno" size={150} stroke={14} />
            <div className="compliance-rows">
              <div className="compliance-row"><span className="k">Treninzi</span><span className="v">{data.doneWo}<small> / {data.totalWo}</small></span></div>
              <div className="compliance-row"><span className="k">Tonaža 7d</span><span className="v">{Math.round(data.ton7).toLocaleString('hr')}<small> kg</small></span></div>
              <div className="compliance-row"><span className="k">Tjedana</span><span className="v">{data.weeks.length}</span></div>
            </div>
          </div>
        </Card>
      </div>

      {/* row 2: volume | bodyweight */}
      <div className="grid c2">
        <Card id="volume" title="Volumen & intenzitet" head={<><span className="r">×100 kg · RPE</span><RangeSel id="volume" /></>}>
          {volSeries.every(v => v === 0) ? <div className="os-empty">Nema logiranog volumena</div> : (
            <>
              <VolumeBars volume={volSeries} rpe={rpeSeries} labels={volWeeks.map(w => fmtDate(w))} />
              <div className="readout" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cell"><div className="k">Avg RPE</div><div className="v">{(() => { const a = rpeSeries.filter(v => v > 0); return a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—' })()}</div></div>
                <div className="cell"><div className="k">Tonaža 7d</div><div className="v">{Math.round(data.ton7).toLocaleString('hr')}<small> kg</small></div></div>
              </div>
            </>
          )}
        </Card>

        <Card id="bodyweight" title="Trend tjelesne težine" head={<><span className="r">kg</span><RangeSel id="bodyweight" /></>}>
          {bwSeries.length < 2 ? <div className="os-empty">Premalo unosa težine</div> : (
            <>
              <LineChart data={bwSeries} accent height={200} />
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
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bench / Squat</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em' }}>{data.balance.benchSquat}%</div>
              </div>
              <StrengthRadar balance={data.balance} />
              <div className="readout" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cell"><div className="k">Deadlift / Squat</div><div className="v">{data.balance.deadliftSquat}%</div></div>
                <div className="cell"><div className="k">Total / Squat</div><div className="v">{data.balance.totalSquat}%</div></div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* row 4: macro & activity */}
      <div className="grid c1">
        <Card id="macro" title="Makro & aktivnost · zadnji unos">
          {!data.latestNut ? <div className="os-empty">Nema unosa prehrane</div> : (() => {
            const m = data.latestNut
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
          })()}
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ label, num, unit, sub, data, accent }: { label: string; num: number | string; unit: string; sub: string; data: number[]; accent?: boolean }) {
  return (
    <div className="kpi">
      <div className="top"><span className="label">{label}</span></div>
      <div className="num">{num}<span className="unit">{unit}</span></div>
      <div className={'delta ' + (accent ? 'up' : 'flat')}>{sub}</div>
      <div className="spark-slot"><Spark data={data} accent={accent} height={40} /></div>
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
