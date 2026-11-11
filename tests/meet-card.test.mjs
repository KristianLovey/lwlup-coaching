// Testovi za src/lib/meet-card.ts — pokretanje: npm test
// Nodeov ugrađeni test runner; Node (22.6+) sam skida TypeScript tipove pri
// importu .ts datoteke, pa ne treba nijedan paket.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  scheduleTimes, totals, jumps, attemptWarnings, keyNumbers, timeline, duringMeet,
  expFromWeightClass, isMorningSession, parseTime, formatTime, fmtJump, fmt1, xround,
  liftersBefore, legacyLiftersAhead, weighInFromLot, lotOrder, flightNo,
} from '../src/lib/meet-card.ts'

const T = parseTime

// ── primjer iz tablice: Marko Laketić ─────────────────────────────
const marko = {
  weightClass: '-105', bw: 101, cut: 'No cut',
  schedule: {
    weighInStart: T('07:00'), compStart: T('09:00'), flight: 'A',
    minutesPerAttempt: 1, liftersAhead: null, warmupLead: 40, announcedSquat: T('09:30'),
  },
  caffeine: { waking: 0, preSquat: 150, afterBench: 100 },
  plans: {
    squat:    { a1Plan: 185,   a2Min: 192.5, a2Plan: 197.5, a2Max: 202.5, a3Min: 205,   a3Plan: 210, a3Max: 215 },
    bench:    { a1Plan: 137.5, a2Min: 142.5, a2Plan: 145,   a2Max: 147.5, a3Min: 147.5, a3Plan: 150, a3Max: 152.5 },
    deadlift: { a1Plan: 200,   a2Min: 215,   a2Plan: 220,   a2Max: 225,   a3Min: 225,   a3Plan: 232, a3Max: 240 },
  },
}

test('Marko: raspored', () => {
  const s = scheduleTimes(marko.schedule)
  assert.equal(formatTime(s.weighInCloses), '08:30')
  assert.equal(formatTime(s.estimate), '09:00')
  assert.equal(formatTime(s.squatStarts), '09:30')
  assert.equal(formatTime(s.warmUpFrom), '08:50')
  assert.equal(formatTime(s.lastWarmUp), '09:20')
})

test('Marko: totali', () => {
  const t = totals(marko.plans)
  assert.equal(t.a1.plan, 522.5)
  assert.deepEqual(t.a2, { min: 550, plan: 562.5, max: 575 })
  assert.deepEqual(t.a3, { min: 577.5, plan: 592, max: 607.5 })
})

test('Marko: skokovi', () => {
  const j = jumps(marko.plans)
  assert.equal(fmtJump(j.total.j12), '+40,0')
  assert.equal(fmtJump(j.total.j23), '+29,5')
  assert.equal(fmtJump(j.squat.j12), '+12,5')
  assert.equal(fmtJump(j.squat.j23), '+12,5')
  assert.equal(fmtJump(j.bench.j12), '+7,5')
  assert.equal(fmtJump(j.bench.j23), '+5,0')
  assert.equal(fmtJump(j.deadlift.j12), '+20,0')
  assert.equal(fmtJump(j.deadlift.j23), '+12,0')
})

test('Marko: jedino upozorenje je DL 3rd plan 232 (nije višekratnik od 2,5)', () => {
  const w = attemptWarnings(marko.plans)
  assert.equal(w.length, 1)
  assert.equal(w[0].lift, 'deadlift')
  assert.equal(w[0].field, 'a3Plan')
})

test('Marko: nutrition ključne brojke', () => {
  const exp = expFromWeightClass(marko.weightClass)
  assert.equal(exp, 105)
  assert.equal(isMorningSession(marko.schedule.weighInStart), true)
  const k = keyNumbers(marko.bw, exp, marko.cut)
  assert.equal(k.fluid, 1.5)
  assert.equal(k.firstDrink, 0.5)
  assert.equal(k.thenSip, 1)
  assert.equal(k.targetBw, 101)
  assert.equal(k.rice, 120)
  assert.equal(k.pasta, 130)
  assert.equal(k.bananas, '2')
  assert.equal(k.carbsPerHour, 60)
  assert.equal(k.salt, null)
  assert.equal(k.dextrose, null)
  assert.equal(k.glycerol, null)
  assert.equal(k.sodium, null)
  assert.equal(k.recipe, 'No shake needed: water or a sports drink. Salt your food well.')
})

test('Marko: raspored nakon vage', () => {
  const s = scheduleTimes(marko.schedule)
  const rows = timeline({
    cut: marko.cut, bw: marko.bw, exp: 105, weighedInAt: marko.schedule.weighInStart, morning: true,
    caffeineWaking: marko.caffeine.waking, caffeinePreSquat: marko.caffeine.preSquat,
    squatStarts: s.squatStarts, warmUpFrom: s.warmUpFrom,
  })
  assert.equal(rows[0].label, 'Wake up')
  assert.equal(rows[0].text, 'Wake up early enough to eat a light breakfast.')
  assert.deepEqual(rows.slice(1).map(r => formatTime(r.time)),
    ['07:00', '07:05', '07:20', '07:35', '07:45', '08:00', '08:15', '08:30', '08:50', '09:30'])
  assert.equal(rows[1].text, 'Drink 0,5 L water or sports drink. Slowly, do not chug.')
  assert.equal(rows[3].text, 'MEAL: 120 g rice or 130 g pasta (uncooked), well salted + 2 bananas. From home, low fat, no veg.')
  assert.equal(rows[3].highlight, true)
  assert.equal(rows[4].text, 'Walk 10 to 15 min. Sip, about 1,5 L in total before your first squat.')
  assert.equal(rows[8].text, 'Drink 0.5 L + 150 mg caffeine.')
  assert.equal(rows[10].text, 'FIRST SQUAT. Keep drinking through the whole meet.')
  assert.equal(rows[10].highlight, true)
})

test('Marko: tijekom natjecanja', () => {
  const d = duringMeet({ cut: 'No cut', caffeineAfterBench: 100, handler: 'Ivan', coach: 'Walter' })
  assert.equal(d[1].text, '60 g carbs: rice cakes with honey or jam, bananas, sweets, dates.')
  assert.equal(d[3].text, '100 mg caffeine so it kicks in for deadlifts.')
  assert.equal(d.at(-1).text, 'DRINK YOUR FLUIDS.')
})

// ── rubni slučajevi formula ───────────────────────────────────────

test('procjena po grupi: flight 2 čeka cijeli 1, flight 3 čeka 1 i 2', () => {
  const base = { weighInStart: null, compStart: T('09:00'), minutesPerAttempt: 1, warmupLead: 40, announcedSquat: null }
  assert.equal(formatTime(scheduleTimes({ ...base, flight: 'B', liftersAhead: 13 }).estimate), '09:39')
  assert.equal(formatTime(scheduleTimes({ ...base, flight: 'C', liftersAhead: 25 }).estimate), '10:15')
  assert.equal(formatTime(scheduleTimes({ ...base, flight: 'A', liftersAhead: 25 }).estimate), '09:00') // prvi flight ne čeka nikoga
  assert.equal(scheduleTimes({ ...base, flight: null, liftersAhead: 13 }).estimate, null)
  assert.equal(scheduleTimes({ ...base, compStart: null, flight: 'A', liftersAhead: null }).estimate, null)
  assert.equal(liftersBefore('B', null), 0) // prazan broj liftera = 0, kao u Excelu
})

test('stare kartice: broj liftera po flightu A/B → lifteri ispred', () => {
  assert.equal(legacyLiftersAhead('B', 13, 12), 13)
  assert.equal(legacyLiftersAhead('C', 13, 12), 25)
  assert.equal(legacyLiftersAhead('C', null, 12), 12)
  assert.equal(legacyLiftersAhead('C', null, null), null)
  assert.equal(legacyLiftersAhead('A', 13, 12), null)
  assert.equal(legacyLiftersAhead(null, 13, 12), null)
})

test('flight se prikazuje kao broj', () => {
  assert.deepEqual(['A', 'B', 'C'].map(flightNo), [1, 2, 3])
})

test('najavljeni početak ima prednost pred procjenom', () => {
  const s = scheduleTimes({ weighInStart: null, compStart: T('09:00'), flight: 'B', minutesPerAttempt: 1, liftersAhead: 13, warmupLead: 30, announcedSquat: T('10:05') })
  assert.equal(formatTime(s.squatStarts), '10:05')
  assert.equal(formatTime(s.warmUpFrom), '09:35')
})

test('total samo kad su sve tri discipline upisane', () => {
  const p = structuredClone(marko.plans)
  p.bench.a2Min = null
  const t = totals(p)
  assert.equal(t.a2.min, null)
  assert.equal(t.a2.plan, 562.5)
})

test('upozorenje za MIN > PLAN i PLAN > MAX', () => {
  const p = structuredClone(marko.plans)
  p.deadlift.a3Plan = 230
  p.squat.a2Min = 200 // veći od plana 197.5
  p.bench.a3Max = 147.5 // manji od plana 150
  const msgs = attemptWarnings(p).map(w => `${w.lift}:${w.field}`)
  assert.deepEqual(msgs.sort(), ['bench:a3Max', 'squat:a2Min'])
})

test('kategorija → očekivana kilaža na vagi', () => {
  assert.equal(expFromWeightClass('-105'), 105)
  assert.equal(expFromWeightClass('-83 kg'), 83)
  assert.equal(expFromWeightClass('Open -83 kg'), 83)
  assert.equal(expFromWeightClass('+120'), null)
  assert.equal(expFromWeightClass(''), null)
})

test('jutarnja sesija: vaganje prije 12:00', () => {
  assert.equal(isMorningSession(T('11:59')), true)
  assert.equal(isMorningSession(T('12:00')), false)
  assert.equal(isMorningSession(null), null)
})

test('sve prazno dok nema tjelesne mase', () => {
  assert.equal(keyNumbers(null, 105, 'No cut'), null)
})

test('water cut: tekućina, sol, dekstroza, glicerol, recept', () => {
  // BW 108, kategorija 105: x = 108 − 105 − min(1.5, max(1, 1.62)) = 1.5 → FLUID = max(1, min(3.2, 2.0)) = 2.0
  const k = keyNumbers(108, 105, 'Water cut')
  assert.equal(k.fluid, 2)
  assert.equal(k.firstDrink, 0.6)
  assert.equal(k.thenSip, 1.4)
  assert.equal(k.targetBw, 107)
  assert.equal(k.salt, 3.1)            // round(1.4 × 2.2, 1) = 3.1
  assert.equal(k.dextrose, 63)         // round(1.4 × 45) = 63
  assert.equal(k.glycerol, 63)         // (108−105)/108 = 2.8 % ≥ 2 % → min(108, 63)
  assert.equal(Math.round(k.sodium), 1218) // 3.1 × 393
  assert.equal(k.carbsPerHour, 90)
  assert.equal(k.recipe, 'SHAKE: 1,4 L water + 3,1 g salt (1218 mg sodium, or the same sodium from electrolytes) + 63 g dextrose + 63 g glycerol + 1 scoop stimulant free pump. Mix it the night before. No creatine.')
})

test('water + carb cut oduzima još 1 kg i daje 120 g ugljikohidrata na sat', () => {
  const k = keyNumbers(108, 105, 'Water + carb cut')
  assert.equal(k.fluid, 1)   // x = 0.5 → round(1.0) = 1.0
  assert.equal(k.carbsPerHour, 120)
})

test('glicerol samo kad je rez barem 2 % mase', () => {
  const k = keyNumbers(106, 105, 'Water cut') // 0.94 % → nema glicerola
  assert.equal(k.glycerol, null)
})

test('Excelovo zaokruživanje polovice prema gore', () => {
  assert.equal(xround(1.45, 1), 1.5)
  assert.equal(xround(1.005, 2), 1.01)
  assert.equal(xround(2.5), 3)
  assert.equal(fmt1(1.45), '1,5')
})

test('popodnevna sesija i kofein ujutro', () => {
  const base = { cut: 'No cut', bw: 80, exp: 83, weighedInAt: T('14:00'), caffeineWaking: 0, caffeinePreSquat: 0, squatStarts: T('16:00'), warmUpFrom: T('15:20') }
  assert.equal(timeline({ ...base, morning: false })[0].text, 'Afternoon session: eat and drink normally until weigh-in.')
  assert.equal(timeline({ ...base, morning: true, caffeineWaking: 100 })[0].text, '100 mg caffeine right after waking up.')
  // +60 (15:00) i +75 (15:15) padaju u/nakon pića prije čučnja (15:00) → izbačeni
  const rows = timeline({ ...base, morning: true })
  assert.deepEqual(rows.slice(1).map(r => formatTime(r.time)), ['14:00', '14:05', '14:20', '14:35', '14:45', '15:00', '15:20', '16:00'])
  assert.equal(rows[6].text, 'Drink 0.5 L.')
})

// ── vaganje po lotu ───────────────────────────────────────────────

test('vaganje po lotu: početak + (lot − 1) × min po lifteru, prema dolje', () => {
  assert.equal(formatTime(weighInFromLot(T('07:00'), 1, 1.5)), '07:00')
  assert.equal(formatTime(weighInFromLot(T('07:00'), 12, 1.5)), '07:16') // 16,5 min → 16
  assert.equal(formatTime(weighInFromLot(T('07:00'), 12, 2)), '07:22')
  assert.equal(formatTime(weighInFromLot(T('07:00'), 12, null)), '07:16') // zadano 1,5
})

test('vaganje po lotu: broji se od prvog lota grupe', () => {
  assert.equal(formatTime(weighInFromLot(T('15:00'), 120, 1.5, 120)), '15:00')
  assert.equal(formatTime(weighInFromLot(T('15:00'), 129, 1.5, 120)), '15:13') // 13,5 min → 13
  assert.equal(formatTime(weighInFromLot(T('15:00'), 129, 1.5, null)), '16:30') // bez raspona: od 1, vaga se zatvara
  assert.equal(formatTime(weighInFromLot(T('15:00'), 110, 1.5, 120)), '15:00') // lot ispod raspona
})

test('redni broj na vagi unutar raspona lotova', () => {
  assert.deepEqual(lotOrder(129, 120, 140), { position: 10, count: 21, inRange: true })
  assert.deepEqual(lotOrder(129, null, null), { position: 129, count: null, inRange: true })
  assert.deepEqual(lotOrder(145, 120, 140), { position: 26, count: 21, inRange: false })
  assert.deepEqual(lotOrder(110, 120, null), { position: -9, count: null, inRange: false })
  assert.equal(lotOrder(null, 120, 140), null)
})

test('vaganje po lotu: bez lota početak vage, najkasnije zatvaranje vage', () => {
  assert.equal(formatTime(weighInFromLot(T('07:00'), null, 2)), '07:00')
  assert.equal(formatTime(weighInFromLot(T('07:00'), 0, 2)), '07:00')
  assert.equal(formatTime(weighInFromLot(T('07:00'), 80, 2)), '08:30')
  assert.equal(weighInFromLot(null, 12, 2), null)
})

test('kasni lot: koraci od vage nakon pića prije čučnja se izbacuju, obrok ostaje', () => {
  const s = scheduleTimes(marko.schedule) // čučanj 09:30, zagrijavanje 08:50
  const rows = timeline({
    cut: 'No cut', bw: 101, exp: 105, weighedInAt: weighInFromLot(T('07:00'), 12, 2), morning: true,
    caffeineWaking: 0, caffeinePreSquat: 150, squatStarts: s.squatStarts, warmUpFrom: s.warmUpFrom,
  })
  assert.deepEqual(rows.slice(1).map(r => formatTime(r.time)),
    ['07:22', '07:27', '07:42', '07:57', '08:07', '08:22', '08:30', '08:50', '09:30'])
  assert.ok(rows.some(r => r.text.startsWith('MEAL:')))
  assert.ok(!rows.some(r => r.text === 'Rest and stay warm.'))
})

test('vrlo kasni lot: piće, šetnja i obrok ostaju i slažu se po vremenu', () => {
  const rows = timeline({
    cut: 'No cut', bw: 101, exp: 105, weighedInAt: T('08:20'), morning: true,
    caffeineWaking: 0, caffeinePreSquat: 0, squatStarts: T('09:00'), warmUpFrom: T('08:20'),
  })
  // čučanj − 60 = 08:00: svi koraci od +35 nadalje izbačeni
  assert.deepEqual(rows.slice(1).map(r => formatTime(r.time)), ['08:00', '08:20', '08:20', '08:25', '08:40', '09:00'])
  assert.equal(rows[0].label, 'Wake up')
})
