---
name: workflow
description: Development workflow and automation for this project - verification without node_modules, git/Vercel deploy, cache versioning, debugging order, environment quirks. Use when finishing a change, committing, deploying, debugging a live issue, or setting up automation. Triggers - deploy, commit, push, Vercel, provjera, verifikacija, automatizacija, debug, ne radi na produkciji.
---

# Workflow — verifikacija, deploy i debugiranje

## Okolina (bitne posebnosti)

- **Windows 11 + PowerShell 5.1** (nema `&&`, `??`, ternarija — koristi `if ($?) { }`). Git Bash dostupan kroz Bash tool.
- **U checkoutu NEMA `node_modules`** → `npm run build`, `tsc`, `next dev` NE RADE lokalno. Ne pokušavaj ih pokretati i ne instaliraj dependencies bez pitanja.
- `gh` CLI nije instaliran.

## Verifikacija promjene (redoslijed)

1. **Sintaksa** — jedino dostupno lokalno:
   ```
   npx -y esbuild src/…/file.tsx --loader:.tsx=tsx --jsx=automatic --outfile=<scratchpad>/check.js
   ```
   (više fajlova: `--outdir`). Ovo hvata sintaksu, NE tipove — TS greške uhvatit će tek Vercel build (`npm run build`).
   **Zato ručno auditiraj tipove nakon svake izmjene** — najčešće greške koje esbuild propušta a `next build` ruši:
   - novi prop dodan u **tip** ali NE i u **destrukturiranje** `{ ...props }` → "Cannot find name 'x'". Uvijek dodaj na OBA mjesta.
   - `obj?.[i] != null` NE narrowa `obj` → kasniji `obj[i]` je "possibly undefined". Koristi `obj && obj[i] != null`.
   - novi `data.*` field korišten u JSX-u ali ne vraćen iz `useMemo`/loadera.
   - `strict` je uključen, ali `noUnusedLocals` NIJE — neiskorišteni importi/varijable ne ruše build.
2. **Pretpostavke o podacima** — provjeri SQL-om kroz Supabase MCP (`execute_sql`) da podaci stvarno izgledaju kako kod očekuje (NULL-ovi, preklapanja, prazne tablice).
3. **RLS** — svaki novi upit/embed s klijenta provjeri protiv politika (admin I trener putanja). Vidi skill `database`.
4. **Cache ključevi** — ako se promijenio oblik podataka koji se kešira u localStorage, **bumpaj verziju ključa**. Postojeći ključevi:
   `adminos:cards`, `adminos:athletes:v2`, `adminos:exercises:v1`, `adminos:dash:v2:<athleteId>`, `adminos:navCollapsed`, `adminos:railHidden`, `adminos:selectedAthleteId`, `adminos:section`.

## Deploy

- Tok: **commit → push na GitHub `main` → Vercel auto-deploy** (`KristianLovey/lwlup-coaching`, live na lwlup.com). Nema stagea — main je produkcija.
- Korisnik promjene često sam commita/pusha; **ne commitaj bez pitanja**. Kad commitaš: kratka hrvatska poruka u imperativu opisom učinka (npr. "Graf napretka: sesije po stvarnom bloku, filter po zadnjih N blokova"), ne "Update".
- Nakon pusha podsjeti: promjena je vidljiva tek nakon Vercel builda; hard-refresh + pazi na localStorage keš.

## Debugiranje "ne radi / ne prikazuje se" (redoslijed — štedi sate)

1. **Reproduciraj tvrdnju u bazi**: `execute_sql` SELECT koji odgovara upitu iz koda. Vrlo često je "bug" zapravo stanje podataka (NULL goal, preklapajući datumi blokova, prazna tablica).
2. **RLS**: isti upit prolazi li za rolu koja ga izvodi? (`pg_policy` provjera.)
3. **Supabase logovi**: `get_logs` service `api` (4xx/5xx na /rest/v1), `auth` (recovery/login problemi).
4. **Klijentski keš**: je li stari localStorage oblik? (verzija ključa!)
5. **Je li fix uopće deployan?** `git log origin/main -1` — promjene u radnom stablu nisu na produkciji.
6. Tek onda diraj kod — i pri fixu dodaj **vidljivu grešku** (alert/inline) tamo gdje je neuspjeh bio tih.

## Automatizacija i konvencije koda

- Prije novog helpera provjeri postoji li već (`fmtDate`, `initials`, `postApi`, `weekKey`, `estimate1RM`…) — ne dupliciraj.
- Novi admin endpoint = kopiraj kanonski predložak iz skilla `backend` (JWT + role check). Nova tablica = RLS checklist iz `database`.
- Komentari u kodu: hrvatski, samo za ne-očite invarijante ("zašto", ne "što").
- Poznata otvorena stavka: **Auth SMTP pokvaren** (Gmail 535) — auth mailovi ne rade; lozinke se resetiraju kroz admin panel (Lifteri → Upravljaj → ključ).

## Kad nešto završiš

Korisniku jasno reci: što je promijenjeno (s linkovima na fajl:liniju), je li provjereno (i kako), te da promjena čeka commit/push ako je tako. Bez preuveličavanja — ako nešto nije testirano end-to-end, reci to.
