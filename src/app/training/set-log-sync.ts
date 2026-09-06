'use client'

// ─── ZAŠTITA UPISA KILAŽE ─────────────────────────────────────────
// Bug koji ovo rješava: trener upiše 207.5, a polje se vrati na 20.
//
// Zašto se događalo:
//  1) Tipkanje se sprema debounceom (400 ms). Ako u tipkanju napraviš pauzu
//     ("20" … pauza … "7.5"), krenu DVA odvojena async upisa za isto polje.
//     Išli su paralelno i s retryjem, pa je stariji ("20") znao sletjeti u bazu
//     POSLIJE novijeg ("207.5") — baza završi na 20.
//  2) Realtime echo tog starijeg upisa stigne nakon što polje izgubi fokus i
//     pregazi ono što je trener utipkao (fokus-guard tad više ne štiti).
//
// Rješenje ovdje:
//  • zadnja NAMJERA po polju se pamti (seq + vrijednost + je li potvrđena) i
//    preživi refresh preko localStoragea,
//  • upisi za isti set idu kroz serijski red — nikad paralelno,
//  • upis nadglasan novijom namjerom se preskače prije nego ode na mrežu,
//  • dolazne vrijednosti (realtime / ponovno učitavanje) koje se ne slažu s
//    nespremljenom ili tek utipkanom namjerom se ignoriraju umjesto da pregaze polje.

export type FieldVal = string | number | boolean | null

type Intent = { v: FieldVal; seq: number; ts: number; saved: boolean }
type ScopeMap = Record<string, Intent>

const PREFIX     = 'lwl:setlog:v1:'
const ECHO_MS    = 20_000            // koliko dugo svježe utipkana vrijednost pobjeđuje dolaznu
const RESEND_MS  = 10 * 60_000       // nespremljena namjera se ovoliko dugo smije poslati ponovo
const PRUNE_MS   = 24 * 3_600_000    // starije od ovoga se briše iz localStoragea

const mem: Record<string, ScopeMap> = {}
const queues: Record<string, Promise<unknown>> = {}
let lastSeq = 0

// Monotono i preko refresha (sat + brojač), pa stara namjera ne može nadglasati novu.
const nextSeq = () => { lastSeq = Math.max(Date.now(), lastSeq + 1); return lastSeq }

export const scopeKey = (weId: string, athleteId: string) => `${weId}:${athleteId}`
export const fieldKey = (setNum: number, field: string) => `${setNum}_${field}`

// Usporedba "20" vs 20 vs 20.0 — brojevi se uspoređuju kao brojevi, ostalo kao tekst.
const norm = (v: unknown): string | number | boolean | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : s
}
export const sameVal = (a: unknown, b: unknown) => norm(a) === norm(b)

// Strogo parsiranje decimale: "207,5" → 207.5, "20 7" / "abc" / "1e3" → null.
// (Number() bi od smeća napravio NaN i tiho upisao null u bazu.)
export function parseDecimal(raw: string): number | null {
  const s = String(raw ?? '').trim().replace(',', '.')
  if (s === '') return null
  // "207." je dopusteno jer se debounce zna okinuti usred tipkanja decimale.
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Jednom po sesiji pomete ključeve starih vježbi da se localStorage ne gomila.
let swept = false
function sweep() {
  if (swept || typeof window === 'undefined') return
  swept = true
  try {
    const now = Date.now()
    for (const k of Object.keys(window.localStorage)) {
      if (!k.startsWith(PREFIX)) continue
      const data = JSON.parse(window.localStorage.getItem(k) ?? '{}') as ScopeMap
      const alive = Object.values(data).some(e => e && now - e.ts <= PRUNE_MS)
      if (!alive) window.localStorage.removeItem(k)
    }
  } catch { /* nedostupan storage */ }
}

function read(scope: string): ScopeMap {
  if (mem[scope]) return mem[scope]
  sweep()
  let data: ScopeMap = {}
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(PREFIX + scope)
      if (raw) data = JSON.parse(raw) as ScopeMap
    } catch { data = {} }
  }
  const now = Date.now()
  for (const k of Object.keys(data)) {
    const e = data[k]
    if (!e || typeof e.ts !== 'number' || now - e.ts > PRUNE_MS) delete data[k]
  }
  mem[scope] = data
  return data
}

function persist(scope: string) {
  if (typeof window === 'undefined') return
  const data = mem[scope] ?? {}
  try {
    if (Object.keys(data).length === 0) window.localStorage.removeItem(PREFIX + scope)
    else window.localStorage.setItem(PREFIX + scope, JSON.stringify(data))
  } catch { /* quota / private mode — sync i dalje radi u memoriji */ }
}

/** Zapamti što je korisnik zadnje utipkao u to polje. Vraća seq za provjeru nadglasavanja. */
export function markIntent(scope: string, key: string, v: FieldVal): number {
  const data = read(scope)
  const seq = nextSeq()
  data[key] = { v, seq, ts: Date.now(), saved: false }
  persist(scope)
  return seq
}

/** Upis je potvrđen — od sad vrijedi samo kratki echo-grace period. */
export function markSaved(scope: string, key: string, seq: number) {
  const e = read(scope)[key]
  if (!e || e.seq !== seq) return // u međuvremenu je utipkano nešto novije
  e.saved = true
  persist(scope)
}

/** Je li ovaj upis u međuvremenu nadglasan novijim? Ako je — ne šalji ga uopće. */
export function isSuperseded(scope: string, key: string, seq: number): boolean {
  const e = read(scope)[key]
  return !!e && e.seq > seq
}

export function clearIntent(scope: string, key: string) {
  const data = read(scope)
  if (!(key in data)) return
  delete data[key]
  persist(scope)
}

/** Pobjeđuje li lokalno utipkana vrijednost dolaznu (realtime / refetch)? */
export function localWins(scope: string, key: string, incoming: unknown): boolean {
  const e = read(scope)[key]
  if (!e) return false
  if (sameVal(e.v, incoming)) return false
  const age = Date.now() - e.ts
  if (!e.saved) return age < RESEND_MS   // naš upis još nije potvrđen — ne daj da ga pregaze
  return age < ECHO_MS                   // zakašnjeli echo starije vrijednosti
}

/**
 * Pri učitavanju usporedi bazu s lokalno zapamćenim namjerama.
 *  • slaže se → namjera se briše (potvrđena je),
 *  • ne slaže se, a naš upis nikad nije potvrđen → vrati lokalnu vrijednost u polje
 *    i javi pozivatelju da je pošalje ponovo,
 *  • ne slaže se, ali je potvrđena i svježa → zadrži lokalnu (echo je još u letu).
 */
export function reconcileLogs<T extends { set_number: number }>(
  scope: string, logs: T[], fields: readonly string[],
): { logs: T[]; resend: { setNum: number; field: string; v: FieldVal }[] } {
  const data = read(scope)
  if (Object.keys(data).length === 0) return { logs, resend: [] }
  const resend: { setNum: number; field: string; v: FieldVal }[] = []
  const now = Date.now()
  let dirty = false

  const patched = logs.map(l => {
    let row = l as unknown as Record<string, unknown>
    for (const field of fields) {
      const key = fieldKey(l.set_number, field)
      const e = data[key]
      if (!e) continue
      if (sameVal(e.v, row[field])) { delete data[key]; dirty = true; continue }
      const age = now - e.ts
      if (!e.saved && age < RESEND_MS) {
        row = { ...row, [field]: e.v }
        resend.push({ setNum: l.set_number, field, v: e.v })
      } else if (e.saved && age < ECHO_MS) {
        row = { ...row, [field]: e.v }
      } else {
        delete data[key]; dirty = true // prestaro — baza je mjerodavna
      }
    }
    return row as unknown as T
  })

  if (dirty) persist(scope)
  return { logs: patched, resend }
}

/** Serijski red po setu — upisi za isti set se ne mogu preteći. */
export function enqueue<T>(scope: string, lane: string, fn: () => Promise<T>): Promise<T> {
  const k = `${scope}|${lane}`
  const next = (queues[k] ?? Promise.resolve()).then(fn, fn)
  queues[k] = next.catch(() => {})
  return next
}
