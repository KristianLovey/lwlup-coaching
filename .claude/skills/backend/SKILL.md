---
name: backend
description: Backend patterns for this project - Next.js API routes with Supabase service role, auth and role gating, email. Use when creating or editing API routes, auth flows, admin operations, permissions, or server-side logic. Triggers - backend, API ruta, service role, auth, autentikacija, role, admin operacija, email, Resend.
---

# Backend — API rute, auth i service role

## Arhitektura: kad ide direktno, a kad kroz API rutu

- **Default:** klijent razgovara **direktno sa Supabaseom uz RLS** (anon key). Ne radi API rutu za nešto što RLS već dopušta.
- **API ruta (service role) samo kad:** operacija mora zaobići/nadjačati RLS ili dirati `auth.admin` — kreiranje korisnika, promjena lozinke, kopiranje blokova među lifterima, kaskadna brisanja, slanje mailova. Postojeće rute: `create-lifter`, `reset-password`, `copy-block`, `delete-block`, `add-week`, `add-workout`, `update-exercise`, `add-exercise`, `upsert-set-log`, `survey`.

## Kanonski predložak API rute (kopiraj ovaj oblik)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// NIKAD ne izlaži SUPABASE_SERVICE_ROLE_KEY na frontendu
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    // 1. JWT iz Authorization headera
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Provjera role iz lifters (admin, ili admin+trener — ovisno o operaciji)
    const { data: profile } = await adminClient.from('lifters').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 3. Validacija bodyja — hrvatske poruke grešaka
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Nedostaje korisnik' }, { status: 400 })

    // 4. Posao + odgovor
    return NextResponse.json({ data: {} })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

Pravila uz predložak:
- **Uvijek koraci 1+2.** Service role zaobilazi RLS, pa je provjera role u ruti JEDINA zaštita.
- Trener smije samo tamo gdje je izričito dopušteno (`role === 'admin' || role === 'trener'`, npr. copy-block).
- Štiti eskalaciju: admin ne smije mijenjati/brisati drugog admina (vidi reset-password).
- Poruke grešaka na hrvatskom, uvijek `{ error }` + ispravan HTTP status.

## Pozivanje s klijenta

```ts
async function postApi(path: string, body: unknown) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({}))
}
// ⚠ UVIJEK provjeri rezultat — tihi neuspjeh je bug:
const res = await postApi('/api/admin/…', {...})
if (res?.error) { alert(`Greška: ${res.error}`); return }
```

## Auth tok aplikacije

- `src/proxy.ts` (middleware): refresha sesiju (`supabase.auth.getUser()` PRIJE redirect provjera), pa gejta:
  - `/training` → samo prijavljeni (inače `/auth`); `/auth` → prijavljeni na `/training`
  - `/admin` → role `admin`; `/trainer` → role `trener` ili `admin` (inače `/403`)
- Server klijent: `src/lib/supabase/server.ts` (`@supabase/ssr` + cookies). Browser: `src/lib/supabase/client.ts`.
- Role žive u `lifters.role` ∈ `admin | trener | lifter`. Nova auth korisnika prati trigger koji kreira red u `lifters` — zato `upsert` profila u create-lifter, ne `insert`.

## Email

- **Resend** (`resend` paket) za transakcijske mailove (survey ruta). Domena još nije verificirana → šalje se s `onboarding@resend.dev`.
- **Supabase Auth SMTP je pokvaren** (Gmail 535 BadCredentials) — recovery mailovi padaju. Ne oslanjaj se na auth mailove; za lozinke postoji admin reset (`/api/admin/reset-password` + ključ-gumb u Lifteri → Upravljaj).

## Env varijable

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (javne), `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (samo server, žive u Vercelu). Nikad ih ne logiraj i ne šalji klijentu.

Za RLS, sheme i SQL gotchas → skill `database`. Za deploy i verifikaciju → `workflow`.
