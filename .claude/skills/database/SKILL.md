---
name: database
description: Database work for this project - Supabase Postgres schema, RLS policies, PostgREST query gotchas, migrations, debugging with SQL. Use when writing queries, changing schema, adding tables/policies, or investigating why data does not show. Triggers - baza, database, SQL, RLS, tablica, migracija, upit, policy, Supabase.
---

# Database — Supabase Postgres (projekt `spmcnigvsjrndoghqfdx`)

## Shema — mentalna mapa

```
lifters (id = auth.users.id)          ← profili; role: admin|trener|lifter; current_*_1rm, body_weight, weight_class, sex
blocks (athlete_id, goal, start/end)  ← trening blokovi; goal='__template__' = predložak (admin), NULL = normalan
 └─ weeks (block_id, week_number)
     └─ workouts (week_id, athlete_id, workout_date, completed, day_name)
         └─ workout_exercises (workout_id, exercise_id, planned_*, set_plan)
             └─ set_logs (athlete_id, weight_kg, reps, rpe, completed, is_top_set)
exercises (name, category)            ← kategorije: Squat/Bench/Deadlift (+ ' Variation')
coach_assignments (coach_id, lifter_id)
competitions, meet_attempts, athlete_competition_selection, athlete_training_phases
pr_logs (lift='other' + notes='Tjelesna težina' = unosi tjelesne težine!)
wellbeing_logs, nutrition_logs, notifications
lwlup_members                          ← JAVNA statistika tima (/team stranica); profile_id → lifters (nullable)
```

### Ključne invarijante (naučene na bugovima — poštuj ih!)

1. **Pripadnost sesije bloku ide ISKLJUČIVO relacijom** `workout → week → block`. `blocks.start_date/end_date` su nepouzdani (postavljaju se na "kreiranje + 84 dana" i međusobno se preklapaju) — NIKAD ne zaključuj pripadnost po datumu.
2. **Predlošci blokova**: `goal = '__template__'`; svi normalni blokovi imaju `goal = NULL`.
3. `lwlup_members` je odvojen od `lifters` — javni tim ima i ljude bez app računa. Ne miješaj njihove statistike (`squat/bench/deadlift/total/glp` vs `current_*_1rm`).
4. FK-ovi na `auth.users(id)` s `ON DELETE CASCADE` — brisanje korisnika briše sve podatke.

## PostgREST / supabase-js zamke

- **`.neq('col', x)` ISKLJUČUJE NULL redove** (SQL `NULL != x` nije istina). Za "sve osim x uključivo NULL": `.or('col.is.null,col.neq.' + x)`. Ovo je već jednom uzrokovalo "Nema blokova" bug.
- `.single()` baca grešku na 0 redova → koristi `.maybeSingle()` kad red smije ne postojati.
- `numeric` kolone stižu kao **stringovi** (`"202.50"`) — normaliziraj s `Number(v)`.
- Embed ide po FK-u: `workouts!inner(workout_date, weeks(block_id))` — m2o embed je objekt, o2m je niz. `!inner` filtrira roditelja, bez njega je LEFT JOIN.
- Uvijek postavi `.limit(n)` na velike tablice (set_logs → 6000) i selektuj samo potrebne kolone.
- `.order('created_at', { ascending: false })` za "najnovije prvo" liste; datumi se uspoređuju kao ISO stringovi (`>=` radi).

## RLS — postojeći sustav

Helper funkcije u bazi: `is_admin()`, `get_my_role()`, `is_coach_of(athlete_id)`.

Tipični obrasci politika:
```sql
-- vlasnički podaci (blocks): admin ILI vlasnik ILI njegov trener
using (is_admin() OR auth.uid() = athlete_id OR is_coach_of(athlete_id))
-- dijete-tablica (weeks): kroz roditelja
using (exists (select 1 from blocks b where b.id = weeks.block_id
       and (is_admin() OR auth.uid() = b.athlete_id OR is_coach_of(b.athlete_id))))
-- javno čitanje + admin pisanje (lwlup_members)
create policy public_read on t for select using (true);
create policy admin_manage on t for all using (get_my_role() = 'admin');
```

**Checklist za novu tablicu:** enable RLS → politika za admina → za vlasnika → za trenera ako treba → provjeri objema rolama. Provjera postojećih politika:
```sql
select polname, polcmd, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)
from pg_policy where polrelid = 'public.TABLICA'::regclass;
```
⚠ Novi klijentski upit/embed mora proći RLS za **admina I trenera** — trener koristi isti dashboard.

## Radni proces (MCP alati)

- **Prvo provjeri podatke, pa tek onda mijenjaj kod.** `execute_sql` za čitanje/dijagnostiku — npr. "zašto se X ne prikazuje" gotovo uvijek počinje SELECT-om, ne kodom.
- DDL ide kroz `apply_migration` (ne execute_sql), pa `get_advisors` (security + performance) nakon promjene sheme.
- Debugiranje grešaka: `get_logs` (service `api` za PostgREST statuse, `auth` za auth probleme).
- Destruktivne izmjene (DROP, DELETE bez WHERE, UPDATE preko cijele tablice) — potvrdi s korisnikom prije izvršavanja.
- Direktno pisanje po `auth.*` shemi izbjegavaj; iznimno `update auth.users set encrypted_password = crypt('…', gen_salt('bf'))` kao ručni reset lozinke.
