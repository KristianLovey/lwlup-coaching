'use client'
import { Num } from '@/components/ui/num'
import { confirmDialog } from '@/components/ui/confirm'
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MeetAttempt } from './types'
import {
  CUT_TYPES, DEFAULTS, FLIGHTS, xround, LIFTS, attemptWarnings, duringMeet, expFromWeightClass, flightNo, fmt0, fmt1, fmtJump,
  formatTime, isMorningSession, jumps, keyNumbers, legacyLiftersAhead, lotOrder, parseNum, parseTime, scheduleTimes,
  timeline, totals, weighInFromLot,
  type CutType, type Flight, type Lift, type LiftPlan, type Plans,
} from '@/lib/meet-card'

/**
 * Meet card i Nutrition po klupskoj tablici. Svi izračuni su u
 * src/lib/meet-card.ts (testirani); ovdje je samo unos, prikaz i spremanje.
 *
 * Gdje što živi:
 *  - meet_cards.card / .nutrition — sve po sportašu i natjecanju (jsonb)
 *  - meet_attempts (red po disciplini) — PLAN/MIN/MAX, zagrijavanje, napomena
 *    trenera (cue), podignuto i priznato (to upisuje i lifter)
 *
 * Trener i admin uređuju sve; lifter vidi karticu i upisuje samo podignute
 * kilaže i priznato/nepriznato, kao i prije.
 */

const supabase = createClient()

type Card = Partial<{
  weightClass: string; trainingBw: string; weighInBw: string; goals: string
  // vaga: lot se broji od prvog lota grupe (lotFrom); yourWeighIn je ručno vrijeme vage
  weighInStart: string; weighInPerLifter: string; lot: string; lotFrom: string; lotTo: string; yourWeighIn: string
  compStart: string; flight: Flight | ''; flightNames: string[]; minutesPerAttempt: string
  // liftersAhead = svi lifteri iz flightova ispred zajedno; liftersA/liftersB su sa starijih kartica
  liftersAhead: string; liftersA: string; liftersB: string
  warmupLead: string; announcedSquat: string
  rackType: string; squatRack: string; benchRack: string; benchSafety: string; gear: string; cueGeneral: string
}>
type Nutrition = Partial<{
  cutType: CutType; trainingBw: string; exp: string; weighedInAt: string; morning: '' | 'Yes' | 'No'
  caffeineWaking: string; caffeinePreSquat: string; caffeineAfterBench: string
  coachNote: string; handler: string; coach: string
}>
type WRow = { kg: string; reps: string }
type Warmups = { bar: WRow; rows: WRow[]; extra: WRow }
type PlanKey = keyof LiftPlan | 'a1Min' | 'a1Max'
type LiftState = {
  plan: Record<PlanKey, string>
  warmups: Warmups
  cue: string
  act: [string, string, string]
  good: [boolean | null, boolean | null, boolean | null]
}

const LIFT_LABEL: Record<Lift, string> = { squat: 'SQUAT', bench: 'BENCH PRESS', deadlift: 'DEADLIFT' }
const LIFT_COLOR: Record<Lift, string> = { squat: '#6b8cff', bench: '#f59e0b', deadlift: '#22c55e' }
const ATT_ROWS: readonly (readonly [string, PlanKey, PlanKey, PlanKey])[] = [
  ['1', 'a1Min', 'a1Plan', 'a1Max'],
  ['2', 'a2Min', 'a2Plan', 'a2Max'],
  ['3', 'a3Min', 'a3Plan', 'a3Max'],
]
const WU_ROWS = ['BAR', '1', '2', '3', '4', '5', '6', 'EXTRA'] as const
// prikaz kao fmt1/fmtJump ("522,5", "+12,5"), ali animiran (NumberFlow); vrijednost prije toga xround
const KG_FMT = { minimumFractionDigits: 1, maximumFractionDigits: 1 }
const JUMP_FMT = { ...KG_FMT, signDisplay: 'always' as const }

const s = (v: number | null | undefined) => (v == null ? '' : String(v))
const emptyWarmups = (): Warmups => ({ bar: { kg: 'Bar', reps: 'As needed' }, rows: Array.from({ length: 6 }, () => ({ kg: '', reps: '' })), extra: { kg: '', reps: '' } })
const liftVar = (color: string) => ({ '--lc': color }) as CSSProperties

function liftFromRow(a: MeetAttempt | null): LiftState {
  const w = a?.warmups
  const rows = Array.from({ length: 6 }, (_, i) => ({ kg: w?.rows?.[i]?.kg ?? '', reps: w?.rows?.[i]?.reps ?? '' }))
  return {
    plan: {
      a1Plan: s(a?.attempt1_plan), a1Min: s(a?.attempt1_min), a1Max: s(a?.attempt1_max),
      a2Min: s(a?.attempt2_min), a2Plan: s(a?.attempt2_plan), a2Max: s(a?.attempt2_max),
      a3Min: s(a?.attempt3_min), a3Plan: s(a?.attempt3_plan), a3Max: s(a?.attempt3_max),
    },
    warmups: w ? { bar: w.bar ?? emptyWarmups().bar, rows, extra: w.extra ?? { kg: '', reps: '' } } : emptyWarmups(),
    cue: a?.admin_notes ?? '',
    act: [s(a?.attempt1_actual), s(a?.attempt2_actual), s(a?.attempt3_actual)],
    good: [a?.attempt1_good ?? null, a?.attempt2_good ?? null, a?.attempt3_good ?? null],
  }
}

const liftsOf = (atts: MeetAttempt[]) =>
  Object.fromEntries(LIFTS.map(l => [l, liftFromRow(atts.find(a => a.lift === l) ?? null)])) as Record<Lift, LiftState>

// ── gradivni elementi: svako polje iste visine i istog oblika ──────

function Sec({ n, title, aside, children }: { n?: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mc-sec">
      <header className="mc-sec-head">
        {n && <span className="mc-sec-n">{n}</span>}
        <h3 className="mc-sec-t">{title}</h3>
        {aside && <div className="mc-sec-aside">{aside}</div>}
      </header>
      {children}
    </section>
  )
}

function F({ label, children, span, color, group }: { label: string; children: ReactNode; span?: 2 | 'all'; color?: string; group?: boolean }) {
  const cls = `mc-f${span === 2 ? ' mc-span2' : span === 'all' ? ' mc-span-all' : ''}`
  const lbl = <span className="mc-lbl" style={color ? { color } : undefined}>{label}</span>
  // grupa gumba ne smije biti u <label>, inače klik na naslov pritisne prvi gumb
  return group
    ? <div className={cls} role="group" aria-label={label}>{lbl}{children}</div>
    : <label className={cls}>{lbl}{children}</label>
}

function In({ value, onChange, ro, placeholder, type = 'text', mode, unit, className }: {
  value: string; onChange: (v: string) => void; ro: boolean; placeholder?: string
  type?: string; mode?: 'decimal' | 'numeric'; unit?: string; className?: string
}) {
  const input = (
    <input className={`mc-in${className ? ' ' + className : ''}`} value={value} onChange={e => onChange(e.target.value)} readOnly={ro}
      type={type} inputMode={mode} placeholder={ro ? '—' : placeholder} />
  )
  if (!unit) return input
  return <span className="mc-unit-wrap">{input}<span className="mc-unit">{unit}</span></span>
}

function Seg<T extends string>({ options, value, onChange, ro, label }: {
  options: readonly T[]; value: T | ''; onChange: (v: T | '') => void; ro: boolean; label: string
}) {
  return (
    <div className="mc-seg" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o} type="button" role="radio" aria-checked={value === o} disabled={ro}
          onClick={() => onChange(value === o ? '' : o)} className={`mc-seg-btn${value === o ? ' on' : ''}`}>{o}</button>
      ))}
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`mc-stat${accent ? ' mc-stat-accent' : ''}`}>
      <span className="mc-lbl">{label}</span>
      <span className="mc-stat-val">{value || '—'}</span>
      <span className="mc-stat-sub">{sub || ' '}</span>
    </div>
  )
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`mc-kv${accent ? ' mc-kv-accent' : ''}`}><span>{label}</span><b>{value || '—'}</b></div>
}

function LiftHead({ lift, children }: { lift: Lift | null; children?: ReactNode }) {
  return (
    <div className="mc-card-head">
      <span className="mc-dot" />{lift ? LIFT_LABEL[lift] : 'TOTAL'}
      {children}
    </div>
  )
}

function Jumps({ j12, j23 }: { j12: number | null; j23: number | null }) {
  return (
    <div className="mc-card-foot">
      <span className="mc-lbl">JUMPS</span>
      <span>1→2<b><Num value={j12 == null ? null : xround(j12, 1)} locales="hr-HR" format={JUMP_FMT} /></b></span>
      <span>2→3<b><Num value={j23 == null ? null : xround(j23, 1)} locales="hr-HR" format={JUMP_FMT} /></b></span>
    </div>
  )
}

// ── glavna komponenta ─────────────────────────────────────────────

export function MeetCardPanel({ athleteId, athleteName, competitionId, competitionName, competitionDate, canEdit, attempts, onRowsSaved, onRowDeleted, onBestChange, onTabChange }: {
  athleteId: string
  athleteName: string
  competitionId: string
  competitionName: string
  competitionDate: string | null
  canEdit: boolean
  attempts: MeetAttempt[]
  onRowsSaved: (rows: MeetAttempt[]) => void
  onRowDeleted: (id: string) => void
  onBestChange: (lift: Lift, best: number | null) => void
  onTabChange?: (tab: 'card' | 'nutrition') => void
}) {
  const [tab, setTab] = useState<'card' | 'nutrition'>('card')
  useEffect(() => { onTabChange?.(tab) }, [tab, onTabChange])
  const [card, setCard] = useState<Card>({})
  const [nut, setNut] = useState<Nutrition>({})
  const [lifts, setLifts] = useState<Record<Lift, LiftState>>(() => liftsOf(attempts))
  // zadnje spremljeno stanje, za "nespremljene promjene"
  const [cardBase, setCardBase] = useState<string | null>(null)
  const [liftsBase, setLiftsBase] = useState(() => JSON.stringify(liftsOf(attempts)))
  const adoptNext = useRef(false)
  const [loadErr, setLoadErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // kartica i nutrition za ovog sportaša i natjecanje
  useEffect(() => {
    let alive = true
    setCard({}); setNut({}); setLoadErr(''); setCardBase(null)
    supabase.from('meet_cards').select('card, nutrition').eq('athlete_id', athleteId).eq('competition_id', competitionId).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { setLoadErr('Kartica se nije učitala: ' + error.message); return }
        const c = (data?.card ?? {}) as Card, n = (data?.nutrition ?? {}) as Nutrition
        setCard(c); setNut(n); setCardBase(JSON.stringify([c, n]))
      })
    return () => { alive = false }
  }, [athleteId, competitionId])

  // Redovi pokušaja stignu i nakon otvaranja kartice (promjena liftera,
  // osvježavanje u pozadini). Preuzmi ih ako ništa nije mijenjano lokalno.
  const attSig = attempts.map(a => `${a.id}:${a.updated_at ?? ''}`).join('|')
  useEffect(() => {
    const fresh = liftsOf(attempts)
    const adopt = adoptNext.current
    adoptNext.current = false
    setLifts(cur => (adopt || JSON.stringify(cur) === liftsBase ? fresh : cur))
    setLiftsBase(JSON.stringify(fresh))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attSig])

  const setC = (patch: Card) => setCard(c => ({ ...c, ...patch }))
  const setN = (patch: Nutrition) => setNut(n => ({ ...n, ...patch }))
  const setL = (lift: Lift, patch: Partial<LiftState>) => setLifts(ls => ({ ...ls, [lift]: { ...ls[lift], ...patch } }))
  const setPlan = (lift: Lift, k: PlanKey, v: string) => setL(lift, { plan: { ...lifts[lift].plan, [k]: v } })
  const ro = !canEdit

  const dirty = (cardBase != null && JSON.stringify([card, nut]) !== cardBase) || JSON.stringify(lifts) !== liftsBase

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ── izračuni (sve iz lib/meet-card) ──
  const flight = (card.flight || null) as Flight | null
  // starije kartice: broj liftera ispred izvodi se iz liftersA/liftersB dok se ne upiše novi
  const liftersAheadTxt = card.liftersAhead ?? s(legacyLiftersAhead(flight, parseNum(card.liftersA), parseNum(card.liftersB)))
  const sched = useMemo(() => scheduleTimes({
    weighInStart: parseTime(card.weighInStart), compStart: parseTime(card.compStart), flight,
    minutesPerAttempt: parseNum(card.minutesPerAttempt), liftersAhead: parseNum(liftersAheadTxt),
    warmupLead: parseNum(card.warmupLead), announcedSquat: parseTime(card.announcedSquat),
  }), [card, flight, liftersAheadTxt])

  const plans: Plans = useMemo(() => Object.fromEntries(LIFTS.map(l => {
    const p = lifts[l].plan
    return [l, {
      a1Plan: parseNum(p.a1Plan),
      a2Min: parseNum(p.a2Min), a2Plan: parseNum(p.a2Plan), a2Max: parseNum(p.a2Max),
      a3Min: parseNum(p.a3Min), a3Plan: parseNum(p.a3Plan), a3Max: parseNum(p.a3Max),
    }]
  })) as Plans, [lifts])
  const tot = totals(plans)
  const jmp = jumps(plans)
  const warnings = attemptWarnings(plans)

  const cut: CutType = nut.cutType ?? DEFAULTS.cutType
  const bw = parseNum(nut.trainingBw) ?? parseNum(card.trainingBw)
  const exp = parseNum(nut.exp) ?? expFromWeightClass(card.weightClass)
  // na vagu se ide redom po lotu unutar grupe; ručno upisano vrijeme ima prednost
  const lot = parseNum(card.lot)
  const order = lotOrder(lot, parseNum(card.lotFrom), parseNum(card.lotTo))
  const lotWeighIn = weighInFromLot(parseTime(card.weighInStart), lot, parseNum(card.weighInPerLifter), parseNum(card.lotFrom))
  const cardWeighIn = parseTime(card.yourWeighIn) ?? lotWeighIn
  const wi = parseTime(nut.weighedInAt) ?? cardWeighIn
  // jutarnja sesija ovisi o početku vage, ne o tome kad je lot na redu
  const morning = nut.morning === 'Yes' ? true : nut.morning === 'No' ? false : isMorningSession(parseTime(card.weighInStart) ?? wi)
  const key = keyNumbers(bw, exp, cut)
  const tl = timeline({
    cut, bw, exp, weighedInAt: wi, morning,
    caffeineWaking: parseNum(nut.caffeineWaking), caffeinePreSquat: parseNum(nut.caffeinePreSquat),
    squatStarts: sched.squatStarts, warmUpFrom: sched.warmUpFrom,
  })
  const during = duringMeet({ cut, caffeineAfterBench: parseNum(nut.caffeineAfterBench), handler: nut.handler ?? null, coach: nut.coach ?? null })

  // najbolje priznato po disciplini → sažetak ispod kartice
  const bestOf = (l: Lift) => {
    const goods = lifts[l].act.map((a, i) => (lifts[l].good[i] ? parseNum(a) : null)).filter((v): v is number => v != null)
    return goods.length ? Math.max(...goods) : null
  }
  useEffect(() => {
    for (const l of LIFTS) onBestChange(l, bestOf(l))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifts, onBestChange])

  // ── spremanje ──
  const save = async () => {
    setSaving(true); setSaveMsg(null)
    const errors: string[] = []
    const now = new Date().toISOString()
    const cardSnap = JSON.stringify([card, nut])

    // Ako se kartica nije učitala, ne prepisuj je praznom.
    if (canEdit && cardBase != null) {
      const { error } = await supabase.from('meet_cards').upsert(
        { athlete_id: athleteId, competition_id: competitionId, card, nutrition: nut, updated_at: now },
        { onConflict: 'athlete_id,competition_id' })
      if (error) errors.push('kartica: ' + error.message)
      else setCardBase(cardSnap)
    }

    const saved: MeetAttempt[] = []
    for (const lift of LIFTS) {
      const L = lifts[lift], p = L.plan
      const results = {
        attempt1_actual: parseNum(L.act[0]), attempt2_actual: parseNum(L.act[1]), attempt3_actual: parseNum(L.act[2]),
        attempt1_good: L.good[0], attempt2_good: L.good[1], attempt3_good: L.good[2],
      }
      const planned = canEdit ? {
        attempt1_plan: parseNum(p.a1Plan), attempt1_min: parseNum(p.a1Min), attempt1_max: parseNum(p.a1Max),
        attempt2_min: parseNum(p.a2Min), attempt2_plan: parseNum(p.a2Plan), attempt2_max: parseNum(p.a2Max),
        attempt3_min: parseNum(p.a3Min), attempt3_plan: parseNum(p.a3Plan), attempt3_max: parseNum(p.a3Max),
        warmups: L.warmups, admin_notes: L.cue.trim() || null,
      } : {}
      const payload = { ...results, ...planned, updated_at: now }
      const existing = attempts.find(a => a.lift === lift)
      const hasData = Object.values(results).some(v => v != null) || (canEdit && (
        Object.values(p).some(v => String(v).trim() !== '') || L.cue.trim() !== '' ||
        L.warmups.rows.some(r => r.kg || r.reps) || L.warmups.extra.kg !== ''))
      if (!existing && !hasData) continue

      const q = existing
        ? supabase.from('meet_attempts').update(payload).eq('id', existing.id).select('*').single()
        : supabase.from('meet_attempts').insert({ ...payload, lift, athlete_id: athleteId, competition_id: competitionId, meet_date: competitionDate ?? now.slice(0, 10) }).select('*').single()
      const { data, error } = await q
      if (error) errors.push(`${LIFT_LABEL[lift].toLowerCase()}: ${error.message}`)
      else if (data) saved.push(data as MeetAttempt)
    }
    if (saved.length) {
      // bez grešaka: preuzmi spremljene vrijednosti (npr. "185,0" → "185")
      adoptNext.current = errors.length === 0
      onRowsSaved(saved)
    }
    setSaving(false)
    setSaveMsg(errors.length ? { ok: false, text: 'Greška pri spremanju: ' + errors.join('; ') } : { ok: true, text: 'Spremljeno' })
    if (!errors.length) setTimeout(() => setSaveMsg(null), 2200)
  }

  // Brisanje plana i rezultata jedne discipline
  const removeLift = async (lift: Lift) => {
    const existing = attempts.find(a => a.lift === lift)
    if (!existing) { setL(lift, liftFromRow(null)); return }
    if (!(await confirmDialog({ title: `Obrisati ${LIFT_LABEL[lift].toLowerCase()}?`, description: 'Brišu se plan, zagrijavanje i rezultati. Ovo se ne može vratiti.', confirmLabel: 'Obriši', destructive: true }))) return
    const { error } = await supabase.from('meet_attempts').delete().eq('id', existing.id)
    if (error) { setSaveMsg({ ok: false, text: 'Brisanje nije uspjelo: ' + error.message }); return }
    setL(lift, liftFromRow(null))
    onRowDeleted(existing.id)
  }

  const putWarmup = (l: Lift, ri: number, patch: Partial<WRow>) => {
    const w = lifts[l].warmups
    const next: Warmups = { bar: { ...w.bar }, rows: w.rows.map(r => ({ ...r })), extra: { ...w.extra } }
    if (ri === 0) next.bar = { ...next.bar, ...patch }
    else if (ri === WU_ROWS.length - 1) next.extra = { ...next.extra, ...patch }
    else next.rows[ri - 1] = { ...next.rows[ri - 1], ...patch }
    setL(l, { warmups: next })
  }

  const dateTxt = competitionDate ? competitionDate.split('-').reverse().join('.') : ''
  const bwShown = card.weighInBw || card.trainingBw
  const flightName = (f: Flight) => card.flightNames?.[flightNo(f) - 1]?.trim() ?? ''
  const setFlightName = (i: number, v: string) =>
    setC({ flightNames: FLIGHTS.map((_, j) => (j === i ? v : card.flightNames?.[j] ?? '')) })
  const flightChip = flight ? [String(flightNo(flight)), flightName(flight)].filter(Boolean).join(' · ') : ''
  const chips = ([
    ['CLASS', card.weightClass], ['FLIGHT', flightChip], ['LOT', card.lot], ['BW', bwShown ? `${bwShown} kg` : ''],
  ] as const).filter(([, v]) => v)
  const lead = parseNum(card.warmupLead) ?? DEFAULTS.warmupLead
  const squatSub = parseTime(card.announcedSquat) != null ? 'announced'
    : sched.estimate != null && flight ? `estimate · flight ${flightNo(flight)}` : ''
  const weighInSub = [
    parseTime(card.yourWeighIn) != null ? 'set by hand'
      : lot == null ? 'no lot, weigh-in start'
      : `lot ${fmt0(lot)}${order?.inRange && order.count != null ? ` · ${order.position}/${order.count}` : ''}`,
    sched.weighInCloses != null ? `closes ${formatTime(sched.weighInCloses)}` : '',
  ].filter(Boolean).join(' · ')
  // koliko liftera čučne prije njegovog flighta: za 2 je to flight 1, za 3 flightovi 1 i 2 zajedno
  const aheadLabel = flight === 'B' ? 'LIFTERS IN FLIGHT 1' : flight === 'C' ? 'LIFTERS IN FLIGHTS 1 + 2' : 'LIFTERS AHEAD'

  const saveState = saving ? { cls: '', text: 'Spremam…' }
    : saveMsg && !saveMsg.ok ? { cls: ' err', text: saveMsg.text }
    : dirty ? { cls: ' dirty', text: 'Nespremljene promjene' }
    : { cls: '', text: saveMsg?.ok ? 'Spremljeno' : 'Sve je spremljeno' }

  return (
    <div className="mc">
      <header className="mc-hero">
        <div className="mc-hero-l">
          <span className="mc-eyebrow">{competitionName}{dateTxt && ` · ${dateTxt}`}</span>
          <h2 className="mc-name">{athleteName || 'Lifter'}</h2>
        </div>
        {chips.length > 0 && (
          <div className="mc-chips">
            {chips.map(([k, v]) => <span key={k} className="mc-chip"><i>{k}</i>{v}</span>)}
          </div>
        )}
      </header>

      <div className="mc-tabs" role="tablist">
        {([['card', 'MEET CARD'], ['nutrition', 'NUTRITION']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`mc-tab${tab === k ? ' on' : ''}`}>{label}</button>
        ))}
      </div>
      {loadErr && <div className="mc-alert">{loadErr}</div>}

      {/* ════════════════ MEET CARD ════════════════ */}
      {tab === 'card' && (<>
        {/* izračunata vremena dana natjecanja — prvo što se vidi */}
        <Sec title="MEET DAY">
          <div className="mc-stats">
            <Stat label="YOUR WEIGH-IN" value={formatTime(cardWeighIn)} sub={weighInSub} />
            <Stat label="WARM UP FROM" value={formatTime(sched.warmUpFrom)} sub={`${lead} min before squat`} />
            <Stat label="LAST WARM-UP" value={formatTime(sched.lastWarmUp)} sub={`${DEFAULTS.lastWarmupBefore} min before squat`} />
            <Stat accent label="SQUAT STARTS" value={formatTime(sched.squatStarts)} sub={squatSub} />
          </div>
          <p className="mc-hint">You weigh in by lot order within your group: weigh-in start + (lot − first lot of the range) × minutes per lifter, at the latest when the weigh-in closes. Flight 1 starts with the meet, flight 2 after all of flight 1 has squatted, flight 3 after flights 1 and 2. The announced start overrides the estimate. Follow the announcer.</p>
        </Sec>

        <Sec n="01" title="ATHLETE & WEIGH-IN">
          <div className="mc-grid4">
            <F label="WEIGHT CLASS"><In ro={ro} value={card.weightClass ?? ''} onChange={v => setC({ weightClass: v })} placeholder="-105" /></F>
            <F label="WEIGH-IN STARTS"><In ro={ro} type="time" value={card.weighInStart ?? ''} onChange={v => setC({ weighInStart: v })} /></F>
            <F label="LOT RANGE · YOUR GROUP" group>
              <div className="mc-range">
                <In ro={ro} mode="numeric" value={card.lotFrom ?? ''} onChange={v => setC({ lotFrom: v })} placeholder="od" />
                <span className="mc-range-sep" aria-hidden>–</span>
                <In ro={ro} mode="numeric" value={card.lotTo ?? ''} onChange={v => setC({ lotTo: v })} placeholder="do" />
              </div>
            </F>
            <F label="YOUR LOT NUMBER"><In ro={ro} mode="numeric" value={card.lot ?? ''} onChange={v => setC({ lot: v })} /></F>
            <F label="WEIGH-IN PER LIFTER"><In ro={ro} mode="decimal" unit="min" value={card.weighInPerLifter ?? ''} onChange={v => setC({ weighInPerLifter: v })} placeholder={fmt1(DEFAULTS.weighInPerLifter)} /></F>
            <F label={card.yourWeighIn ? 'YOUR WEIGH-IN · MANUAL' : 'YOUR WEIGH-IN · BY LOT'}>
              <In ro={ro} type="time" value={card.yourWeighIn || formatTime(lotWeighIn)} onChange={v => setC({ yourWeighIn: v })} />
            </F>
            <F label="WEIGH-IN BODYWEIGHT"><In ro={ro} mode="decimal" unit="kg" value={card.weighInBw ?? ''} onChange={v => setC({ weighInBw: v })} /></F>
            <F label="TRAINING BODYWEIGHT"><In ro={ro} mode="decimal" unit="kg" value={card.trainingBw ?? ''} onChange={v => setC({ trainingBw: v })} /></F>
            <F label="COMP GOALS" span="all"><In ro={ro} value={card.goals ?? ''} onChange={v => setC({ goals: v })} placeholder="Npr. 600 total, 3/3 na benchu" /></F>
          </div>
          {order && !order.inRange && (
            <div className="mc-warns">
              <div className="mc-warn"><AlertTriangle size={13} />
                <span>Lot {fmt0(lot)} nije u rasponu lotova grupe ({card.lotFrom || '?'}–{card.lotTo || '?'}). Provjeri lot ili raspon.</span>
              </div>
            </div>
          )}
          <p className="mc-hint">Lot numbers are drawn for the whole meet, so a group can have lots 120–140. Your weigh-in is counted from the first lot of the range. Type a time in Your weigh-in to set it by hand, clear it to go back to the lot.</p>
        </Sec>

        <Sec n="02" title="RACK & GEAR">
          <div className="mc-grid4">
            <F label="RACK"><In ro={ro} value={card.rackType ?? ''} onChange={v => setC({ rackType: v })} placeholder="Npr. Eleiko" /></F>
            <F label="SQUAT RACK HEIGHT"><In ro={ro} value={card.squatRack ?? ''} onChange={v => setC({ squatRack: v })} /></F>
            <F label="BENCH RACK HEIGHT"><In ro={ro} value={card.benchRack ?? ''} onChange={v => setC({ benchRack: v })} /></F>
            <F label="BENCH SAFETY HEIGHT"><In ro={ro} value={card.benchSafety ?? ''} onChange={v => setC({ benchSafety: v })} /></F>
            <F label="GEAR CHECKLIST" span="all">
              <textarea className="mc-in mc-ta-short" rows={1} readOnly={ro} value={card.gear ?? DEFAULTS.gearChecklist} onChange={e => setC({ gear: e.target.value })} />
            </F>
          </div>
        </Sec>

        <Sec n="03" title="SCHEDULE">
          <div className="mc-grid3">
            <F label="COMPETITION STARTS"><In ro={ro} type="time" value={card.compStart ?? ''} onChange={v => setC({ compStart: v })} /></F>
            <F label="FLIGHT · PICK YOURS, NAME THE GROUPS" span={2} group>
              <div className="mc-flights" role="radiogroup" aria-label="Flight">
                {FLIGHTS.map((f, i) => {
                  const on = flight === f
                  return (
                    <div key={f} className={`mc-flight${on ? ' on' : ''}`}>
                      <button type="button" role="radio" aria-checked={on} aria-label={`Flight ${i + 1}`} disabled={ro}
                        onClick={() => setC({ flight: on ? '' : f })} className="mc-flight-no">{i + 1}</button>
                      <input className="mc-flight-name" value={card.flightNames?.[i] ?? ''} readOnly={ro}
                        onChange={e => setFlightName(i, e.target.value)} placeholder={ro ? '—' : 'Naziv grupe'} aria-label={`Naziv flighta ${i + 1}`} />
                    </div>
                  )
                })}
              </div>
            </F>
            <F label={aheadLabel}>
              {/* prvi flight ne čeka nikoga; promjena broja briše stare brojeve po flightu */}
              <In ro={ro || flight === 'A'} mode="numeric" value={flight === 'A' ? '0' : liftersAheadTxt}
                onChange={v => setC({ liftersAhead: v, liftersA: undefined, liftersB: undefined })} placeholder={flight ? '' : 'Odaberi flight'} />
            </F>
            <F label="MINUTES PER ATTEMPT"><In ro={ro} mode="decimal" unit="min" value={card.minutesPerAttempt ?? ''} onChange={v => setC({ minutesPerAttempt: v })} placeholder={fmt1(DEFAULTS.minutesPerAttempt)} /></F>
            <F label="WARM-UP LEAD"><In ro={ro} mode="numeric" unit="min" value={card.warmupLead ?? ''} onChange={v => setC({ warmupLead: v })} placeholder={String(DEFAULTS.warmupLead)} /></F>
            <F label="ANNOUNCED SQUAT START"><In ro={ro} type="time" value={card.announcedSquat ?? ''} onChange={v => setC({ announcedSquat: v })} /></F>
          </div>
        </Sec>

        <Sec n="04" title="ATTEMPTS">
          <div className="mc-cols3">
            {LIFTS.map(l => {
              const P = lifts[l].plan
              return (
                <div key={l} className="mc-card" style={liftVar(LIFT_COLOR[l])}>
                  <LiftHead lift={l}>
                    {canEdit && attempts.some(a => a.lift === l) && (
                      <button type="button" className="mc-icon-btn" onClick={() => removeLift(l)}
                        aria-label={`Obriši ${LIFT_LABEL[l].toLowerCase()}`} title="Obriši plan, zagrijavanje i rezultate">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </LiftHead>
                  <div className="mc-att">
                    <span /><span className="mc-col-h">MIN</span><span className="mc-col-h mc-col-plan">PLAN</span><span className="mc-col-h">MAX</span>
                    {ATT_ROWS.map(([n, kMin, kPlan, kMax]) => (
                      <Fragment key={n}>
                        <span className="mc-row-n">{n}</span>
                        {[kMin, kPlan, kMax].map(k => {
                          const bad = warnings.some(w => w.lift === l && w.field === k)
                          return (
                            <In key={k} ro={ro} mode="decimal" value={P[k]} onChange={v => setPlan(l, k, v)}
                              className={`${k === kPlan ? 'mc-in-plan' : ''}${bad ? ' mc-in-warn' : ''}`} />
                          )
                        })}
                      </Fragment>
                    ))}
                  </div>
                  <Jumps j12={jmp[l].j12} j23={jmp[l].j23} />
                </div>
              )
            })}
          </div>

          <div className="mc-card mc-total">
            <LiftHead lift={null} />
            <div className="mc-total-grid">
              {([
                ['1ST', tot.a1.plan, null, null],
                ['2ND', tot.a2.plan, tot.a2.min, tot.a2.max],
                ['3RD', tot.a3.plan, tot.a3.min, tot.a3.max],
              ] as const).map(([lbl, plan, mn, mx], i) => (
                <div key={lbl} className={`mc-total-cell${i === 2 ? ' mc-total-target' : ''}`}>
                  <span className="mc-lbl">{lbl}</span>
                  <span className="mc-total-val"><Num value={plan == null ? null : xround(plan, 1)} locales="hr-HR" format={KG_FMT} /></span>
                  <span className="mc-total-range">{i > 0 && (mn != null || mx != null) ? `${fmt1(mn) || '—'} – ${fmt1(mx) || '—'}` : ' '}</span>
                </div>
              ))}
            </div>
            <Jumps j12={jmp.total.j12} j23={jmp.total.j23} />
          </div>

          {warnings.length > 0 && (
            <div className="mc-warns">
              {warnings.map((w, i) => (
                <div key={i} className="mc-warn"><AlertTriangle size={13} /><span><b>{LIFT_LABEL[w.lift]}</b> · {w.message}</span></div>
              ))}
            </div>
          )}
        </Sec>

        {/* rezultat na natjecanju — upisuje i lifter */}
        <Sec n="05" title="RESULTS" aside="upisuje i lifter">
          <div className="mc-cols3">
            {LIFTS.map(l => {
              const L = lifts[l]
              const best = bestOf(l)
              const planOf = [L.plan.a1Plan, L.plan.a2Plan, L.plan.a3Plan]
              return (
                <div key={l} className="mc-card" style={liftVar(LIFT_COLOR[l])}>
                  <LiftHead lift={l}>{best != null && <span className="mc-best"><Num value={xround(best, 1)} locales="hr-HR" format={KG_FMT} /> kg</span>}</LiftHead>
                  <div className="mc-res">
                    {[0, 1, 2].map(i => {
                      const g = L.good[i]
                      const setGood = (v: boolean) => setL(l, { good: L.good.map((x, j) => (j === i ? (x === v ? null : v) : x)) as LiftState['good'] })
                      return (
                        <div key={i} className={`mc-res-row${g === true ? ' good' : g === false ? ' bad' : ''}`}>
                          <span className="mc-row-n">{i + 1}</span>
                          <In ro={false} mode="decimal" value={L.act[i]} placeholder={planOf[i] || 'kg'}
                            onChange={v => setL(l, { act: L.act.map((x, j) => (j === i ? v : x)) as LiftState['act'] })} />
                          <button type="button" aria-label={`${i + 1}. pokušaj priznat`} aria-pressed={g === true} onClick={() => setGood(true)} className={`mc-res-btn ok${g === true ? ' on' : ''}`}><Check size={15} /></button>
                          <button type="button" aria-label={`${i + 1}. pokušaj nije priznat`} aria-pressed={g === false} onClick={() => setGood(false)} className={`mc-res-btn no${g === false ? ' on' : ''}`}><X size={15} /></button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Sec>

        <Sec n="06" title="WARM-UPS">
          <div className="mc-cols3">
            {LIFTS.map(l => {
              const w = lifts[l].warmups
              return (
                <div key={l} className="mc-card" style={liftVar(LIFT_COLOR[l])}>
                  <LiftHead lift={l} />
                  <div className="mc-wu">
                    <span /><span className="mc-col-h">KG</span><span className="mc-col-h">REPS</span>
                    {WU_ROWS.map((rowLabel, ri) => {
                      const cell: WRow = ri === 0 ? w.bar : ri === WU_ROWS.length - 1 ? w.extra : w.rows[ri - 1]
                      return (
                        <Fragment key={rowLabel}>
                          <span className="mc-row-n">{rowLabel}</span>
                          <In ro={ro} value={cell.kg} onChange={v => putWarmup(l, ri, { kg: v })} />
                          <In ro={ro} value={cell.reps} onChange={v => putWarmup(l, ri, { reps: v })} />
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Sec>

        <Sec n="07" title="NOTES & CUES">
          <div className="mc-grid4">
            {LIFTS.map(l => (
              <F key={l} label={LIFT_LABEL[l]} color={LIFT_COLOR[l]}>
                <textarea className="mc-in" readOnly={ro} placeholder={ro ? '—' : ''} value={lifts[l].cue} onChange={e => setL(l, { cue: e.target.value })} />
              </F>
            ))}
            <F label="GENERAL">
              <textarea className="mc-in" readOnly={ro} placeholder={ro ? '—' : ''} value={card.cueGeneral ?? ''} onChange={e => setC({ cueGeneral: e.target.value })} />
            </F>
          </div>
        </Sec>
      </>)}

      {/* ════════════════ NUTRITION ════════════════ */}
      {tab === 'nutrition' && (<>
        <Sec n="01" title="SETUP">
          <div className="mc-grid4">
            <F label="CUT TYPE">
              <select className="mc-in" disabled={ro} value={cut} onChange={e => setN({ cutType: e.target.value as CutType })}>
                {CUT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
            <F label="TRAINING BODYWEIGHT"><In ro={ro} mode="decimal" unit="kg" value={nut.trainingBw ?? ''} onChange={v => setN({ trainingBw: v })} placeholder={card.trainingBw ?? ''} /></F>
            <F label="EXPECTED WEIGH-IN"><In ro={ro} mode="decimal" unit="kg" value={nut.exp ?? ''} onChange={v => setN({ exp: v })} placeholder={fmt1(expFromWeightClass(card.weightClass))} /></F>
            <F label={nut.weighedInAt ? 'WEIGHED IN AT · MANUAL' : card.yourWeighIn ? 'WEIGHED IN AT · MEET CARD' : `WEIGHED IN AT${lot != null ? ` · LOT ${fmt0(lot)}` : ''}`}>
              <In ro={ro} type="time" value={nut.weighedInAt || formatTime(cardWeighIn)} onChange={v => setN({ weighedInAt: v })} />
            </F>
            <F label="MORNING SESSION">
              <select className="mc-in" disabled={ro} value={nut.morning ?? ''} onChange={e => setN({ morning: e.target.value as Nutrition['morning'] })}>
                <option value="">{morning == null ? '—' : `${morning ? 'Yes' : 'No'} (auto)`}</option>
                <option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </F>
            <F label="CAFFEINE ON WAKING"><In ro={ro} mode="numeric" unit="mg" value={nut.caffeineWaking ?? ''} onChange={v => setN({ caffeineWaking: v })} placeholder="0" /></F>
            <F label="CAFFEINE PRE-SQUAT"><In ro={ro} mode="numeric" unit="mg" value={nut.caffeinePreSquat ?? ''} onChange={v => setN({ caffeinePreSquat: v })} placeholder="0" /></F>
            <F label="CAFFEINE AFTER BENCH"><In ro={ro} mode="numeric" unit="mg" value={nut.caffeineAfterBench ?? ''} onChange={v => setN({ caffeineAfterBench: v })} placeholder="0" /></F>
            <F label="HANDLER"><In ro={ro} value={nut.handler ?? ''} onChange={v => setN({ handler: v })} /></F>
            <F label="COACH"><In ro={ro} value={nut.coach ?? ''} onChange={v => setN({ coach: v })} /></F>
            <F label="COACH NOTE" span={2}><In ro={ro} value={nut.coachNote ?? ''} onChange={v => setN({ coachNote: v })} /></F>
          </div>
          <p className="mc-hint">Bodyweight and weight class come from the Meet card. Weighed in at comes from Your weigh-in on the Meet card (lot order within the group, or the time typed there), so the timeline starts when you actually step on the scale. Type a time to set it by hand, clear it to go back to the Meet card. Morning session means the weigh-in starts before 12:00.</p>
        </Sec>

        <Sec n="02" title="KEY NUMBERS">
          {!key ? <div className="mc-empty">Upiši tjelesnu masu, ovdje ili na Meet cardu.</div> : (<>
            <div className="mc-cols3">
              <div className="mc-card">
                <div className="mc-card-head"><span className="mc-dot" />FLUIDS</div>
                <div>
                  <KV label="Before 1st squat" value={`${fmt1(key.fluid)} L`} />
                  <KV label="First drink (water)" value={`${fmt1(key.firstDrink)} L`} />
                  <KV label="Then sip" value={`${fmt1(key.thenSip)} L`} />
                  <KV label="Target BW at 1st squat" value={key.targetBw != null ? `${fmt1(key.targetBw)} kg` : ''} />
                </div>
              </div>
              <div className="mc-card">
                <div className="mc-card-head"><span className="mc-dot" />MEAL</div>
                <div>
                  <KV label="White rice (uncooked)" value={`${key.rice} g`} />
                  <KV label="Or pasta (uncooked)" value={`${key.pasta} g`} />
                  <KV label="Bananas" value={key.bananas} />
                  <KV accent label="Carbs per hour at meet" value={`${key.carbsPerHour} g`} />
                </div>
              </div>
              <div className="mc-card">
                <div className="mc-card-head"><span className="mc-dot" />SHAKE</div>
                <div>
                  <KV label="Salt" value={key.salt != null ? `${fmt1(key.salt)} g` : 'None'} />
                  <KV label="Dextrose" value={key.dextrose != null ? `${fmt0(key.dextrose)} g` : 'None'} />
                  <KV label="Glycerol" value={key.glycerol != null ? `${fmt0(key.glycerol)} g` : 'None'} />
                  <KV label="Sodium" value={key.sodium != null ? `${fmt0(key.sodium)} mg` : 'None'} />
                </div>
              </div>
            </div>
            <div className="mc-recipe"><span className="mc-lbl">RECIPE</span>{key.recipe}</div>
          </>)}
        </Sec>

        <Sec n="03" title="POST WEIGH-IN TIMELINE">
          <ol className="mc-tl">
            {tl.map((r, i) => (
              <li key={i} className={`mc-tl-row${r.highlight ? ' hi' : ''}${i === tl.length - 1 ? ' last' : ''}`}>
                <span className="mc-tl-time">{r.label ?? (formatTime(r.time) || '—')}</span>
                <span className="mc-tl-dot" aria-hidden />
                <span className="mc-tl-text">{r.text}</span>
              </li>
            ))}
          </ol>
        </Sec>

        <Sec n="04" title="DURING THE MEET">
          <dl className="mc-dl">
            {during.map((r, i) => (
              <div key={i} className={`mc-dl-row${r.highlight ? ' hi' : ''}`}>
                <dt>{r.label}</dt>
                <dd>{r.text || '—'}</dd>
              </div>
            ))}
          </dl>
        </Sec>
      </>)}

      <div className="mc-savebar">
        <span className={`mc-save-state${saveState.cls}`} role="status">{saveState.text}</span>
        <button type="button" onClick={save} disabled={saving || !dirty} className="mc-save">
          {saving ? <><Loader2 size={13} className="mc-spin" /> SPREMAM</> : canEdit ? 'SPREMI' : 'SPREMI REZULTATE'}
        </button>
      </div>

      <style>{CSS}</style>
    </div>
  )
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`

const CSS = `
.mc { --h: 44px; --r: var(--t-r-sm); --acc: #ef3535; display: flex; flex-direction: column; gap: 14px; font-family: var(--fm); color: #f0f0f0; }

/* ── zaglavlje ── */
.mc-hero { position: relative; overflow: hidden; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 22px 24px; border: 1px solid var(--t-border-hi); border-radius: var(--t-r); background: radial-gradient(120% 160% at 0% 0%, rgba(239,53,53,0.12), transparent 55%), var(--t-s1); }
.mc-hero::before { content: ''; position: absolute; left: 0; top: 18px; bottom: 18px; width: 3px; border-radius: 0 3px 3px 0; background: var(--acc); }
.mc-hero-l { min-width: 0; }
.mc-eyebrow { display: block; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
.mc-name { margin: 0; font-family: var(--fd); font-weight: 800; font-size: clamp(1.5rem, 3.2vw, 2.2rem); line-height: 1; letter-spacing: -0.02em; color: #fff; overflow-wrap: anywhere; }
.mc-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.mc-chip { display: inline-flex; align-items: baseline; gap: 7px; height: 32px; box-sizing: border-box; padding: 8px 12px; border-radius: 999px; background: var(--t-s3); border: 1px solid var(--t-border-hi); font-size: 0.76rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.mc-chip i { font-style: normal; font-size: 0.5rem; letter-spacing: 0.14em; color: rgba(255,255,255,0.5); }

.mc-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; background: var(--t-s1); border: 1px solid var(--t-border); border-radius: var(--t-r); }
.mc-tab { height: 40px; border: 0; border-radius: var(--t-r); background: transparent; color: rgba(255,255,255,0.55); font-family: var(--fm); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.18em; cursor: pointer; transition: background 0.2s, color 0.2s; }
.mc-tab:hover { color: #fff; }
.mc-tab.on { background: #f0f0f0; color: #0a0a0a; }

/* ── sekcije ── */
.mc-sec { background: var(--t-s1); border: 1px solid var(--t-border); border-radius: var(--t-r); padding: 18px 20px 20px; }
.mc-sec-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
.mc-sec-n { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; color: var(--acc); font-variant-numeric: tabular-nums; }
.mc-sec-t { margin: 0; font-family: var(--fm); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.2em; color: #f0f0f0; }
.mc-sec-aside { margin-left: auto; font-size: 0.6rem; letter-spacing: 0.08em; color: rgba(255,255,255,0.45); }

.mc-grid4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.mc-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mc-cols3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mc-span2 { grid-column: span 2; }
.mc-span-all { grid-column: 1 / -1; }
.mc-divider { height: 1px; background: var(--t-border); margin: 18px 0; }

/* ── polja: sva iste visine ── */
.mc-f { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.mc-lbl { font-size: 0.54rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-in { width: 100%; height: var(--h); box-sizing: border-box; min-width: 0; padding: 0 12px; background: var(--t-s2); border: 1px solid var(--t-border); border-radius: var(--r); color: #f0f0f0; font-family: var(--fm); font-size: 0.88rem; font-weight: 700; font-variant-numeric: tabular-nums; outline: none; color-scheme: dark; transition: border-color 0.15s, background 0.15s; }
.mc-in::placeholder { color: rgba(255,255,255,0.28); font-weight: 500; }
.mc-in:hover:not([readonly]):not(:disabled) { border-color: var(--t-border-hi); }
.mc-in:focus:not([readonly]) { border-color: rgba(255,255,255,0.45); background: var(--t-s3); }
.mc-in[readonly], .mc-in:disabled { border-color: transparent; cursor: default; opacity: 1; color: #f0f0f0; }
select.mc-in { appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer; background-image: ${CHEVRON}; background-repeat: no-repeat; background-position: right 13px center; }
select.mc-in:disabled { background-image: none; }
textarea.mc-in { height: auto; min-height: 104px; padding: 11px 12px; resize: vertical; field-sizing: content; font-size: 0.82rem; font-weight: 500; line-height: 1.55; }
textarea.mc-in[readonly] { resize: none; }
textarea.mc-ta-short { min-height: var(--h); }
.mc-unit-wrap { position: relative; display: block; }
.mc-unit-wrap .mc-in { padding-right: 40px; }
.mc-unit { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.6rem; font-weight: 700; color: rgba(255,255,255,0.4); pointer-events: none; }

.mc-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3px; height: var(--h); box-sizing: border-box; padding: 3px; background: var(--t-s2); border: 1px solid var(--t-border); border-radius: var(--r); }
.mc-seg-btn { border: 0; border-radius: var(--t-r-sm); background: transparent; color: rgba(255,255,255,0.5); font-family: var(--fm); font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: background 0.15s, color 0.15s; }
.mc-seg-btn:not(.on):not(:disabled):hover { background: var(--t-s3); color: #fff; }
.mc-seg-btn.on { background: #f0f0f0; color: #0a0a0a; }
.mc-seg-btn:disabled { cursor: default; }

/* raspon lotova: od – do u jednom polju */
.mc-range { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 6px; align-items: center; }
.mc-range .mc-in { padding: 0 8px; text-align: center; }
.mc-range-sep { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.4); }

/* flightovi: broj bira njegov, pored se upisuje naziv grupe */
.mc-flights { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.mc-flight { display: flex; align-items: center; gap: 4px; min-width: 0; height: var(--h); box-sizing: border-box; padding: 3px; background: var(--t-s2); border: 1px solid var(--t-border); border-radius: var(--r); transition: border-color 0.15s, background 0.15s; }
.mc-flight:focus-within:not(.on) { border-color: var(--t-border-hi); }
.mc-flight.on { border-color: rgba(255,255,255,0.45); background: var(--t-s3); }
.mc-flight-no { flex-shrink: 0; width: 36px; height: 100%; border: 0; border-radius: var(--t-r-sm); background: var(--t-s3); color: rgba(255,255,255,0.55); font-family: var(--fm); font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: background 0.15s, color 0.15s; }
.mc-flight-no:not(:disabled):hover { color: #fff; }
.mc-flight.on .mc-flight-no { background: #f0f0f0; color: #0a0a0a; }
.mc-flight-no:disabled { cursor: default; }
.mc-flight-name { flex: 1; min-width: 0; height: 100%; padding: 0 8px; border: 0; background: transparent; color: #f0f0f0; font-family: var(--fm); font-size: 0.8rem; font-weight: 700; outline: none; text-overflow: ellipsis; }
.mc-flight-name::placeholder { color: rgba(255,255,255,0.28); font-weight: 500; }

/* ── izračunate vrijednosti ── */
.mc-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.mc-stat { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 14px 16px; background: var(--t-s2); border: 1px solid var(--t-border); border-radius: var(--t-r); }
.mc-stat-val { font-family: var(--fd); font-size: 1.75rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.mc-stat-sub { font-size: 0.58rem; color: rgba(255,255,255,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-stat-accent { background: linear-gradient(160deg, rgba(239,53,53,0.3), rgba(239,53,53,0.08)); border-color: rgba(239,53,53,0.55); }
.mc-stat-accent .mc-lbl, .mc-stat-accent .mc-stat-sub { color: #fca5a5; }
.mc-hint { margin: 14px 0 0; font-size: 0.66rem; line-height: 1.6; color: rgba(255,255,255,0.5); }
.mc-empty { padding: 26px 16px; text-align: center; font-size: 0.74rem; color: rgba(255,255,255,0.55); background: var(--t-s2); border: 1px dashed var(--t-border-hi); border-radius: var(--t-r); }

/* ── kartice po disciplini ── */
.mc-card { --lc: #f0f0f0; display: flex; flex-direction: column; gap: 12px; min-width: 0; padding: 14px; background: var(--t-s2); border: 1px solid var(--t-border); border-radius: var(--t-r); }
.mc-card .mc-in { background: var(--t-s1); }
.mc-card-head { display: flex; align-items: center; gap: 9px; min-height: 28px; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.16em; color: var(--lc); }
.mc-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: var(--lc); box-shadow: 0 0 10px color-mix(in srgb, var(--lc) 55%, transparent); }
.mc-icon-btn { margin-left: auto; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--t-r-sm); border: 1px solid transparent; background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.15s; }
.mc-icon-btn:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.08); }
.mc-best { margin-left: auto; font-family: var(--fd); font-size: 0.95rem; letter-spacing: 0; color: #f0f0f0; }

.mc-att { display: grid; grid-template-columns: 18px repeat(3, minmax(0, 1fr)); gap: 6px; align-items: center; }
.mc-wu { display: grid; grid-template-columns: 44px repeat(2, minmax(0, 1fr)); gap: 6px; align-items: center; }
.mc-col-h { font-size: 0.52rem; font-weight: 700; letter-spacing: 0.14em; text-align: center; color: rgba(255,255,255,0.45); }
.mc-col-plan { color: var(--lc); }
.mc-row-n { font-size: 0.56rem; font-weight: 800; letter-spacing: 0.06em; color: rgba(255,255,255,0.45); }
.mc-att .mc-in, .mc-wu .mc-in, .mc-res .mc-in { height: 40px; padding: 0 6px; text-align: center; font-size: 0.86rem; }
.mc-card .mc-in.mc-in-plan { background: color-mix(in srgb, var(--lc) 11%, var(--t-s1)); border-color: color-mix(in srgb, var(--lc) 45%, transparent); }
.mc-card .mc-in.mc-in-warn { border-color: #f59e0b; color: #fbbf24; }
.mc-card-foot { display: flex; align-items: center; gap: 14px; margin-top: auto; padding-top: 11px; border-top: 1px solid var(--t-border); font-size: 0.6rem; color: rgba(255,255,255,0.45); }
.mc-card-foot .mc-lbl { margin-right: auto; }
.mc-card-foot b { margin-left: 6px; font-family: var(--fd); font-size: 0.86rem; color: #f0f0f0; font-variant-numeric: tabular-nums; }

.mc-total { margin-top: 12px; }
.mc-total-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mc-total-cell { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 13px 15px; background: var(--t-s1); border: 1px solid var(--t-border); border-radius: var(--t-r); }
.mc-total-val { font-family: var(--fd); font-size: 1.65rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.mc-total-range { font-size: 0.62rem; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-total-target { background: linear-gradient(160deg, rgba(239,53,53,0.26), rgba(239,53,53,0.06)); border-color: rgba(239,53,53,0.5); }
.mc-total-target .mc-lbl, .mc-total-target .mc-total-range { color: #fca5a5; }

.mc-warns { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.mc-warn { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: var(--r); background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; font-size: 0.7rem; line-height: 1.4; }
.mc-warn svg { flex-shrink: 0; }

.mc-res { display: flex; flex-direction: column; gap: 6px; }
.mc-res-row { display: grid; grid-template-columns: 18px minmax(0, 1fr) 40px 40px; gap: 6px; align-items: center; }
.mc-res-btn { height: 40px; display: grid; place-items: center; border-radius: var(--r); border: 1px solid var(--t-border); background: var(--t-s1); color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.15s; }
.mc-res-btn:hover { border-color: var(--t-border-hi); color: #fff; }
.mc-res-btn.ok.on { background: rgba(34,197,94,0.16); border-color: #22c55e; color: #4ade80; }
.mc-res-btn.no.on { background: rgba(248,113,113,0.14); border-color: #f87171; color: #f87171; }
.mc-res-row.good .mc-in { border-color: rgba(34,197,94,0.45); color: #4ade80; }
.mc-res-row.bad .mc-in { border-color: rgba(248,113,113,0.4); color: #f87171; text-decoration: line-through; }

/* ── nutrition ── */
.mc-kv { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--t-border); }
.mc-kv:first-child { padding-top: 0; }
.mc-kv:last-child { border-bottom: 0; padding-bottom: 0; }
.mc-kv span { font-size: 0.66rem; color: rgba(255,255,255,0.6); }
.mc-kv b { font-family: var(--fd); font-size: 1.08rem; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
.mc-kv-accent span, .mc-kv-accent b { color: #fca5a5; }
.mc-recipe { margin-top: 12px; padding: 14px 16px; border-radius: var(--t-r); background: var(--t-s2); border: 1px solid var(--t-border); border-left: 3px solid var(--acc); font-size: 0.8rem; font-weight: 600; line-height: 1.6; }
.mc-recipe .mc-lbl { display: block; margin-bottom: 6px; }

.mc-tl { position: relative; list-style: none; margin: 0; padding: 0; }
.mc-tl::before { content: ''; position: absolute; left: 99px; top: 18px; bottom: 18px; width: 2px; background: var(--t-border); }
.mc-tl-row { position: relative; display: grid; grid-template-columns: 76px 20px minmax(0, 1fr); column-gap: 14px; align-items: start; padding: 9px 0; }
.mc-tl-time { padding-top: 1px; font-size: 0.8rem; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.8); }
.mc-tl-dot { justify-self: center; margin-top: 4px; width: 12px; height: 12px; box-sizing: border-box; border-radius: 50%; border: 2px solid var(--t-border-hi); background: var(--t-s1); position: relative; z-index: 1; }
.mc-tl-text { font-size: 0.8rem; line-height: 1.55; color: rgba(255,255,255,0.78); }
.mc-tl-row.hi .mc-tl-dot { border-color: #f0f0f0; background: #f0f0f0; }
.mc-tl-row.hi .mc-tl-text { font-weight: 800; color: #fff; }
.mc-tl-row.last .mc-tl-time { color: #fca5a5; }
.mc-tl-row.last .mc-tl-dot { border-color: var(--acc); background: var(--acc); box-shadow: 0 0 12px rgba(239,53,53,0.6); }

.mc-dl { margin: 0; }
.mc-dl-row { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--t-border); }
.mc-dl-row:first-child { padding-top: 0; }
.mc-dl-row:last-child { border-bottom: 0; padding-bottom: 0; }
.mc-dl dt { padding-top: 2px; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.55); }
.mc-dl dd { margin: 0; font-size: 0.82rem; line-height: 1.55; color: rgba(255,255,255,0.82); }
.mc-dl-row.hi dd { font-weight: 800; color: #fff; }

/* ── spremanje: uvijek pri dnu ekrana ── */
.mc-savebar { position: sticky; bottom: 24px; z-index: 20; display: flex; align-items: center; gap: 14px; padding: 9px 9px 9px 18px; background: rgba(18,18,18,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid var(--t-border-hi); border-radius: var(--t-r); box-shadow: 0 12px 40px rgba(0,0,0,0.55); }
.mc-save-state { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; font-size: 0.68rem; color: rgba(255,255,255,0.6); }
.mc-save-state::before { content: ''; width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: #4ade80; }
.mc-save-state.dirty { color: #fcd34d; }
.mc-save-state.dirty::before { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.7); }
.mc-save-state.err { color: #f87171; }
.mc-save-state.err::before { background: #f87171; }
.mc-save { flex-shrink: 0; height: 40px; padding: 0 22px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: var(--t-r); background: #fff; color: #000; font-family: var(--fm); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.14em; cursor: pointer; transition: background 0.15s, color 0.15s; }
.mc-save:disabled { background: var(--t-s3); color: rgba(255,255,255,0.35); cursor: default; }
.mc-spin { animation: spin 1s linear infinite; }
.mc-alert { padding: 11px 14px; border-radius: var(--r); background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.35); color: #f87171; font-size: 0.72rem; }

/* ── responsive ── */
@media (max-width: 1300px) { .mc-savebar { margin-right: 62px; } }
@media (max-width: 960px) { .mc-cols3 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) {
  .mc-grid4, .mc-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mc-sec { padding: 16px 14px; }
  .mc-hero { padding: 18px; }
  .mc-dl-row { grid-template-columns: minmax(0, 1fr); gap: 4px; }
}
@media (max-width: 520px) {
  .mc-grid3 { grid-template-columns: minmax(0, 1fr); }
  .mc-span2 { grid-column: 1 / -1; }
  .mc-flights { grid-template-columns: minmax(0, 1fr); }
  .mc-stat { padding: 12px 13px; }
  .mc-stat-val { font-size: 1.45rem; }
  .mc-total-grid { gap: 6px; }
  .mc-total-cell { padding: 11px 10px; }
  .mc-total-val { font-size: 1.25rem; }
  .mc-tl::before { left: 73px; }
  .mc-tl-row { grid-template-columns: 56px 18px minmax(0, 1fr); column-gap: 10px; }
  .mc-tl-time { font-size: 0.72rem; }
}
`
