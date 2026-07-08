---
name: frontend
description: Frontend development for this project (Next.js App Router, React, TypeScript). Use when building or editing pages, components, client-side data loading, caching, realtime, forms, i18n, or performance. Triggers - frontend, komponenta, stranica, page, React, UI logika, učitavanje podataka, cache, realtime.
---

# Frontend — Next.js / React obrasci projekta

## Stack i struktura

- **Next.js 16 App Router** + React 18 + TypeScript. Sve stranice su `'use client'` (osim layouta); server komponente se ne koriste za feature stranice.
- **Nema Tailwinda u praksi** (postoji u devDeps, ali se ne koristi) — stilovi su inline `style={{}}` + scoped CSS fajlovi (`admin-os.css`) + `<style>{``}</style>` blokovi na dnu stranice. Vidi skill `design`.
- Ikone: `lucide-react`. Fontovi: `next/font/google` u `layout.tsx` (Space Grotesk `--font-sg`, Bricolage `--font-bg`, JetBrains Mono `--font-jb`).
- Mobilna aplikacija: **Capacitor iOS wrapper** oko istog weba (`CapacitorDetect` u layoutu) — ne koristi API-je koji ne rade u WebViewu bez provjere.

```
src/app/            → stranice (page.tsx po ruti) + feature komponente uz njih
src/app/admin/      → admin OS (admin-os.tsx shell, admin-os-dashboard.tsx, athlete-panels.tsx)
src/app/training/   → lifterov trening (training-hub, training-setplan, training-meet…)
src/app/api/admin/  → service-role API rute (vidi skill backend)
src/lib/supabase/   → client.ts (browser), server.ts (SSR cookies)
src/context/        → LanguageContext (i18n)
src/proxy.ts        → auth middleware (gating /training, /admin, /trainer)
```

## Supabase klijent na frontendu

- Jednom po modulu, na vrhu fajla: `const supabase = createClient()` iz `@/lib/supabase/client`. Ne kreiraj klijent unutar komponente.
- Upiti idu **direktno s klijenta uz RLS** — API ruta se koristi samo kad treba service role (vidi `backend`).

## Obrasci učitavanja podataka (slijedi ih!)

**1. Paralelno učitavanje** — nikad sekvencijalni await lanac:
```ts
const [woRes, setsRes, bwRes] = await Promise.all([
  supabase.from('workouts').select('…').eq('athlete_id', id).limit(500),
  supabase.from('set_logs').select('…').eq('athlete_id', id).limit(6000),
  supabase.from('pr_logs').select('…').eq('athlete_id', id).limit(400),
])
```

**2. localStorage cache s TTL + background refresh** — UI se renderira odmah iz keša, mreža osvježava u pozadini:
```ts
const CACHE_KEY = 'adminos:dash:v2:' + athleteId   // ⚠ verzioniraj ključ!
const TTL = 90_000
// pri loadu: ako je cache svjež → setState(cache) pa setTimeout(() => load(true), 0)
// nakon fetcha: localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), raw }))
```
**Pravilo:** kad promijeniš oblik keširanih podataka (novi field u selectu), **bumpaj verziju u ključu** (`v2` → `v3`), inače stari keš renderira krivi oblik.

**3. Optimistični update s tmp id-em i rollbackom** (vidi `addWeek`/`addWorkout` u athlete-panels):
```ts
const tmpId = `tmp_${Date.now()}`
setState(optimistički s tmpId)
const json = await fetch('/api/…')
json.data ? zamijeni tmpId stvarnim redom : ukloni tmpId (rollback)
```

**4. Realtime s debounceom** — kanal po entitetu, ping s 600 ms debounceom, obavezan cleanup:
```ts
const ch = supabase.channel(`dash-rt-${id}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'set_logs', filter: `athlete_id=eq.${id}` }, ping)
  .subscribe()
return () => { if (t) clearTimeout(t); supabase.removeChannel(ch) }
```

## Forme i spremanje

- **Save-on-blur** za edit gridove (Tim, statistike): `onChange` ažurira lokalni state, `onBlur` sprema u bazu. Nakon uspjeha kratki "Spremljeno" flash (`saved-flash` klasa, 1400 ms timeout).
- **Greške se NIKAD ne gutaju.** Svaki upis provjeri `error` i prikaži ga: `alert('Greška pri spremanju: ' + error.message)` ili inline `err` state u modalu. Tihi neuspjeh je bug (naučeno na predlošcima).
- Modali: kontrolirani `useState`, `onClick={onClose}` na scrimu + `e.stopPropagation()` na kartici, jednokratni prikaz osjetljivih podataka (lozinke) s uputom "prepiši prije zatvaranja".

## Performanse

- Teške komponente code-splitaj: `dynamic(() => import('./x').then(m => ({ default: m.X })), { ssr: false, loading: SectionLoader })`.
- Limitiraj selecte (`.limit(…)`) i biraj samo kolone koje trebaš — ravni join umjesto dubokog nestinga gdje je payload velik.
- `preconnect`/`dns-prefetch` na Supabase u `layout.tsx` već postoji — ne diraj.

## i18n i jezik

- Javne stranice: `const { t } = useLanguage()` + ključevi u `src/lib/i18n.ts` (hr/en). Novi javni tekst ide u i18n, ne hardkodiran.
- Admin/trener panel: **hrvatski hardkodiran** (Kategorija, Spremljeno, Odustani, Obriši, Greška pri…). UI labele u mono-eyebrow stilu su VELIKIM SLOVIMA.
- Datumi: `fmtDate` helper (`'2026-07-05' → '05.07.'`), inicijali: `initials(name)`.

## Provjera prije predaje

Nema `node_modules` u checkoutu — **ne pokreći** `npm run build`/`tsc`. Sintaksu provjeri:
```
npx -y esbuild src/app/…/file.tsx --loader:.tsx=tsx --jsx=automatic --outfile=<scratch>/check.js
```
Detalji o deployu i verifikaciji: skill `workflow`.
