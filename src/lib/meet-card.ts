/**
 * Meet card i Nutrition — svi izračuni kao čiste funkcije.
 *
 * Referenca je klupska Excel tablica (tabovi "Meet card" i "Nutrition"): formule,
 * zadane vrijednosti i tekstovi ovdje se ponašaju kao u njoj. Bez Reacta i bez
 * baze, pa se isto ponašanje testira u tests/meet-card.test.mjs.
 *
 * Vremena su minute od ponoći (07:30 → 450). Prazno polje je null, nikad 0 —
 * osim gdje Excel prazninu računa kao 0 (broj liftera u grupi), što je navedeno.
 *
 * Napomena za Node test runner: datoteka koristi samo sintaksu koju Node može
 * "skinuti" bez kompajlera (bez enuma, bez importa), pa testovi rade bez paketa.
 */

export type Lift = 'squat' | 'bench' | 'deadlift'
export const LIFTS: Lift[] = ['squat', 'bench', 'deadlift']
export type Flight = 'A' | 'B' | 'C'
export type CutType = 'No cut' | 'Gut cut' | 'Water cut' | 'Water + carb cut'
export const CUT_TYPES: CutType[] = ['No cut', 'Gut cut', 'Water cut', 'Water + carb cut']

export const DEFAULTS = {
  minutesPerAttempt: 1,
  warmupLead: 40,
  weighInDuration: 90,
  lastWarmupBefore: 10,
  gearChecklist: 'Belt · Sleeves · Wraps · Singlet · Shoes · Shirt · Deadlift Socks',
  cutType: 'No cut' as CutType,
}

// ── brojevi ───────────────────────────────────────────────────────

/**
 * Excelov ROUND: polovica ide od nule (1.45 → 1.5, −1.45 → −1.5). Math.round na
 * binarnom zapisu zna dati 1.4 jer je 1.45 zapravo 1.4499999…; zapis kroz
 * eksponent ("1.45e1") to zaobilazi.
 */
export function xround(value: number, digits = 0): number {
  const sign = value < 0 ? -1 : 1
  const shifted = Math.round(Number(`${Math.abs(value)}e${digits}`))
  return sign * Number(`${shifted}e-${digits}`)
}

/** Uklanja binarni šum zbrajanja (0.30000000000000004 → 0.3). */
const clean = (v: number) => Math.round(v * 1e9) / 1e9

/** "207,5" / "207.5" / " 207 " → broj; prazno ili neispravno → null. */
export function parseNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Prikaz kao u tablici: jedna decimala, decimalni zarez ("185,0", "1,5"). */
export const fmt1 = (v: number | null | undefined) =>
  v == null ? '' : xround(v, 1).toFixed(1).replace('.', ',')

/** Cijeli broj (mg, g). */
export const fmt0 = (v: number | null | undefined) => (v == null ? '' : String(xround(v, 0)))

/** Skok s predznakom: "+12,5", "−5,0" se piše kao "-5,0", nula kao "+0,0". */
export const fmtJump = (v: number | null | undefined) => (v == null ? '' : (v >= 0 ? '+' : '') + fmt1(v))

// ── vrijeme ───────────────────────────────────────────────────────

/** "07:00" / "7:00" / "07.00" → 420. Neispravno → null. */
export function parseTime(v: string | null | undefined): number | null {
  if (!v) return null
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})$/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** 420 → "07:00". Preko ponoći se vrti u krug (1470 → "00:30"). */
export function formatTime(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return ''
  const t = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

const add = (t: number | null, d: number) => (t == null ? null : t + d)

// ── MEET CARD: raspored ───────────────────────────────────────────

export type ScheduleInput = {
  weighInStart: number | null
  compStart: number | null
  flight: Flight | null
  /** zadano 1 */
  minutesPerAttempt: number | null
  liftersA: number | null
  liftersB: number | null
  /** zadano 40 */
  warmupLead: number | null
  announcedSquat: number | null
}

export type ScheduleTimes = {
  weighInCloses: number | null
  estimate: number | null
  squatStarts: number | null
  warmUpFrom: number | null
  lastWarmUp: number | null
}

/** Koliko liftera čučne prije njegove grupe. Prazan broj liftera računa se kao 0, kao u Excelu. */
export function liftersBefore(flight: Flight | null, a: number | null, b: number | null): number | null {
  if (!flight) return null
  if (flight === 'A') return 0
  if (flight === 'B') return a ?? 0
  return (a ?? 0) + (b ?? 0)
}

export function scheduleTimes(s: ScheduleInput): ScheduleTimes {
  const mpa = s.minutesPerAttempt ?? DEFAULTS.minutesPerAttempt
  const lead = s.warmupLead ?? DEFAULTS.warmupLead
  const before = liftersBefore(s.flight, s.liftersA, s.liftersB)
  const estimate = s.compStart != null && before != null ? s.compStart + before * 3 * mpa : null
  const squatStarts = s.announcedSquat ?? estimate
  return {
    weighInCloses: add(s.weighInStart, DEFAULTS.weighInDuration),
    estimate,
    squatStarts,
    warmUpFrom: add(squatStarts, -lead),
    lastWarmUp: add(squatStarts, -DEFAULTS.lastWarmupBefore),
  }
}

// ── MEET CARD: pokušaji ───────────────────────────────────────────

/** 1. pokušaj ima samo PLAN; 2. i 3. imaju MIN, PLAN i MAX. */
export type LiftPlan = {
  a1Plan: number | null
  a2Min: number | null; a2Plan: number | null; a2Max: number | null
  a3Min: number | null; a3Plan: number | null; a3Max: number | null
}
export type Plans = Record<Lift, LiftPlan>

export const emptyLiftPlan = (): LiftPlan =>
  ({ a1Plan: null, a2Min: null, a2Plan: null, a2Max: null, a3Min: null, a3Plan: null, a3Max: null })

export type Totals = {
  a1: { plan: number | null }
  a2: { min: number | null; plan: number | null; max: number | null }
  a3: { min: number | null; plan: number | null; max: number | null }
}

/** Zbroj triju disciplina u istom stupcu — samo ako su sve tri upisane. */
const sum3 = (p: Plans, k: keyof LiftPlan): number | null => {
  const v = LIFTS.map(l => p[l][k])
  return v.every(x => x != null) ? clean((v as number[]).reduce((a, b) => a + b, 0)) : null
}

export function totals(p: Plans): Totals {
  return {
    a1: { plan: sum3(p, 'a1Plan') },
    a2: { min: sum3(p, 'a2Min'), plan: sum3(p, 'a2Plan'), max: sum3(p, 'a2Max') },
    a3: { min: sum3(p, 'a3Min'), plan: sum3(p, 'a3Plan'), max: sum3(p, 'a3Max') },
  }
}

const diff = (to: number | null, from: number | null) => (to != null && from != null ? clean(to - from) : null)

export type Jumps = Record<Lift | 'total', { j12: number | null; j23: number | null }>

/** Skokovi između PLAN vrijednosti, po disciplini i za total. */
export function jumps(p: Plans): Jumps {
  const t = totals(p)
  const out = {} as Jumps
  for (const l of LIFTS) out[l] = { j12: diff(p[l].a2Plan, p[l].a1Plan), j23: diff(p[l].a3Plan, p[l].a2Plan) }
  out.total = { j12: diff(t.a2.plan, t.a1.plan), j23: diff(t.a3.plan, t.a2.plan) }
  return out
}

export type AttemptWarning = { lift: Lift; field: keyof LiftPlan; message: string }

const FIELD_LABEL: Record<keyof LiftPlan, string> = {
  a1Plan: '1st plan', a2Min: '2nd min', a2Plan: '2nd plan', a2Max: '2nd max',
  a3Min: '3rd min', a3Plan: '3rd plan', a3Max: '3rd max',
}

export const isPlateMultiple = (v: number) => Math.abs(xround(v * 10, 0) % 25) === 0

/** Upozorenja (ne blokiraju): kilaža nije višekratnik od 2.5 ili nije MIN ≤ PLAN ≤ MAX. */
export function attemptWarnings(p: Plans): AttemptWarning[] {
  const out: AttemptWarning[] = []
  for (const lift of LIFTS) {
    const r = p[lift]
    for (const k of Object.keys(FIELD_LABEL) as (keyof LiftPlan)[]) {
      const v = r[k]
      if (v != null && !isPlateMultiple(v)) out.push({ lift, field: k, message: `${FIELD_LABEL[k]}: ${fmt1(v)} kg nije višekratnik od 2,5 kg` })
    }
    for (const [min, plan, max, n] of [[r.a2Min, r.a2Plan, r.a2Max, '2nd'], [r.a3Min, r.a3Plan, r.a3Max, '3rd']] as const) {
      if (min != null && plan != null && min > plan) out.push({ lift, field: n === '2nd' ? 'a2Min' : 'a3Min', message: `${n}: MIN je veći od PLAN` })
      if (plan != null && max != null && plan > max) out.push({ lift, field: n === '2nd' ? 'a2Max' : 'a3Max', message: `${n}: PLAN je veći od MAX` })
      if (min != null && max != null && plan == null && min > max) out.push({ lift, field: n === '2nd' ? 'a2Min' : 'a3Min', message: `${n}: MIN je veći od MAX` })
    }
  }
  return out
}

// ── NUTRITION: unos ───────────────────────────────────────────────

/**
 * Očekivana kilaža na vagi iz kategorije: "-105" → 105, "Open -83 kg" → 83,
 * "105" → 105. Kategorija s "+" nema gornju granicu → null (traži ručni unos).
 */
export function expFromWeightClass(wc: string | null | undefined): number | null {
  if (!wc) return null
  if (wc.includes('+')) return null
  const m = wc.match(/(\d+(?:[.,]\d+)?)/)
  return m ? parseNum(m[1]) : null
}

/** Jutarnja sesija = vaganje prije 12:00. */
export const isMorningSession = (wi: number | null): boolean | null => (wi == null ? null : wi < 12 * 60)

export const isWaterCut = (c: CutType) => c === 'Water cut' || c === 'Water + carb cut'

// ── NUTRITION: ključne brojke ─────────────────────────────────────

export type KeyNumbers = {
  fluid: number; firstDrink: number; thenSip: number; targetBw: number | null
  rice: number; pasta: number; bananas: string; carbsPerHour: number
  /** null = "None" */
  salt: number | null; dextrose: number | null; glycerol: number | null; sodium: number | null
  recipe: string
}

export const riceFor = (bw: number) => (bw < 55 ? 50 : bw < 65 ? 65 : bw < 75 ? 75 : bw < 85 ? 90 : bw < 95 ? 100 : 120)
export const pastaFor = (bw: number) => (bw < 55 ? 55 : bw < 65 ? 70 : bw < 75 ? 85 : bw < 85 ? 100 : bw < 95 ? 110 : 130)
export const bananasFor = (bw: number) => (bw < 75 ? '1' : bw < 85 ? '1 to 2' : '2')

/** Sve prazno (null) dok nema tjelesne mase. */
export function keyNumbers(bw: number | null, exp: number | null, cut: CutType): KeyNumbers | null {
  if (bw == null) return null
  const water = isWaterCut(cut)

  let fluid: number
  if (water && exp != null) {
    const x = bw - exp - Math.min(1.5, Math.max(1, bw * 0.015)) - (cut === 'Water + carb cut' ? 1 : 0)
    fluid = Math.max(1, Math.min(xround(bw * 0.03, 1), xround(Math.max(0, x) + 0.5, 1)))
  } else {
    fluid = Math.max(1, xround(bw * 0.015, 1))
  }
  const firstDrink = water ? 0.6 : 0.5
  const thenSip = clean(Math.max(0, fluid - firstDrink))
  const targetBw = exp != null ? clean(Math.min(bw, exp + fluid)) : null

  const salt = water ? xround(thenSip * 2.2, 1) : null
  const dextrose = water ? xround(thenSip * 45) : null
  const glycerol = water && exp != null && (bw - exp) / bw >= 0.02 ? Math.min(xround(bw), xround(thenSip * 45)) : null
  const sodium = salt != null ? clean(salt * 393) : null

  const recipe = water
    ? `SHAKE: ${fmt1(thenSip)} L water + ${fmt1(salt)} g salt (${fmt0(sodium)} mg sodium, or the same sodium from electrolytes) + ${fmt0(dextrose)} g dextrose${glycerol != null ? ` + ${fmt0(glycerol)} g glycerol` : ''} + 1 scoop stimulant free pump. Mix it the night before. No creatine.`
    : 'No shake needed: water or a sports drink. Salt your food well.'

  return {
    fluid, firstDrink, thenSip, targetBw,
    rice: riceFor(bw), pasta: pastaFor(bw), bananas: bananasFor(bw),
    carbsPerHour: cut === 'Water + carb cut' ? 120 : cut === 'Water cut' ? 90 : 60,
    salt, dextrose, glycerol, sodium, recipe,
  }
}

// ── NUTRITION: raspored nakon vage ────────────────────────────────

export type TimelineRow = { time: number | null; label?: string; text: string; highlight?: boolean }

export type TimelineInput = {
  cut: CutType
  bw: number | null
  exp: number | null
  /** vrijeme vaganja (WI) */
  weighedInAt: number | null
  morning: boolean | null
  caffeineWaking: number | null
  caffeinePreSquat: number | null
  squatStarts: number | null
  warmUpFrom: number | null
}

/**
 * Redoslijed je fiksan kao u tablici. Vremena se računaju od vaganja (WI) i od
 * početka čučnja; kad neko vrijeme nedostaje, redak ostaje s praznim vremenom.
 */
export function timeline(t: TimelineInput): TimelineRow[] {
  const k = keyNumbers(t.bw, t.exp, t.cut)
  const water = isWaterCut(t.cut)
  const wi = t.weighedInAt
  const cw = t.caffeineWaking ?? 0
  const cps = t.caffeinePreSquat ?? 0

  const wake = t.morning === false
    ? 'Afternoon session: eat and drink normally until weigh-in.'
    : cw > 0 ? `${fmt0(cw)} mg caffeine right after waking up.` : 'Wake up early enough to eat a light breakfast.'

  const bananaWord = k?.bananas === '1' ? 'banana' : 'bananas'

  return [
    { time: null, label: 'Wake up', text: wake },
    { time: add(wi, 0), text: water
      ? `Drink ${fmt1(k?.firstDrink)} L of WATER (not the shake) within 15 min + a small snack (banana, honey).`
      : `Drink ${fmt1(k?.firstDrink)} L water or sports drink. Slowly, do not chug.` },
    { time: add(wi, 5), text: 'Walk slowly for 5 to 10 minutes.' + (water ? ' Then start sipping the shake: small sips, no chugging.' : '') },
    { time: add(wi, 20), highlight: true,
      text: `MEAL: ${fmt0(k?.rice)} g rice or ${fmt0(k?.pasta)} g pasta (uncooked), well salted + ${k?.bananas ?? ''} ${bananaWord}. From home, low fat, no veg.` },
    { time: add(wi, 35), text: water
      ? 'Walk 10 to 15 min. Keep sipping the shake. Stomach discomfort up to about 6/10 is fine, above that pause and walk.'
      : t.cut === 'Gut cut'
        ? 'Walk 10 to 15 min. Do not force fluids, drink until your belt fits normally.'
        : `Walk 10 to 15 min. Sip, about ${fmt1(k?.fluid)} L in total before your first squat.` },
    { time: add(wi, 45), text: water
      ? 'PUMP 1 (10 min): squats 2x15, push ups 2x10 to 15, band pull aparts 2x20 to 30, band rows 2x12 to 15.'
      : 'Light mobility, nothing hard.' },
    { time: add(wi, 60), text: water && t.bw != null && t.exp != null
      ? `Weigh yourself: aim for about ${fmt1(k?.targetBw)} kg by the first squat, not your full ${fmt1(t.bw)} kg. Gut and glycogen weight comes back with food during the meet.`
      : 'Keep sipping. Snack if hungry.' },
    { time: add(wi, 75), text: water ? 'PUMP 2 (10 min). Keep sipping.' : 'Rest and stay warm.' },
    { time: add(t.squatStarts, -60), text: (water ? 'Finish the shake' : 'Drink 0.5 L') + (cps > 0 ? ` + ${fmt0(cps)} mg caffeine.` : '.') },
    { time: t.warmUpFrom, text: 'Start warming up. Sip between sets.' },
    { time: t.squatStarts, highlight: true, text: 'FIRST SQUAT. Keep drinking through the whole meet.' },
  ]
}

// ── NUTRITION: tijekom natjecanja ─────────────────────────────────

export type DuringRow = { label: string; text: string; highlight?: boolean }

export function duringMeet(d: {
  cut: CutType; caffeineAfterBench: number | null; handler: string | null; coach: string | null
}): DuringRow[] {
  const carbs = d.cut === 'Water + carb cut' ? 120 : d.cut === 'Water cut' ? 90 : 60
  const cab = d.caffeineAfterBench ?? 0
  return [
    { label: 'Every lift', text: '0.5 to 1 L water through warm-ups and attempts.' },
    { label: 'Every hour', text: `${carbs} g carbs: rice cakes with honey or jam, bananas, sweets, dates.` },
    { label: 'After SQ and BP', text: '2 to 3 g salt, then eat by feel.' },
    { label: 'After bench', text: cab > 0 ? `${fmt0(cab)} mg caffeine so it kicks in for deadlifts.` : 'Keep eating and drinking to plan.' },
    { label: 'Cramps', text: 'Salt and magnesium with fluid, and tell your coach.' },
    { label: 'Handler', text: d.handler ?? '' },
    { label: 'Coach', text: d.coach ?? '' },
    { label: 'Always', text: 'DRINK YOUR FLUIDS.', highlight: true },
  ]
}
