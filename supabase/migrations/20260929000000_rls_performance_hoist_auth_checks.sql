-- ============================================================================
-- RLS performance fix
--
-- Semantika pristupa ostaje IDENTICNA (provjereno: identican broj redaka za
-- svih 14 korisnika, sve role, na blocks/workouts/weeks/workout_exercises/
-- set_logs/pr_logs). Mijenja se samo KOLIKO PUTA se auth provjera izvrsi:
-- bilo je jednom PO RETKU, sad je jednom PO UPITU (InitPlan).
--
-- Izmjereno na produkcijskim podacima, workout_exercises za jednog liftera:
--   staro: 153 ms, 27.005 buffera, subplan loops=4647
--   novo:    2,6 ms,    198 buffera, InitPlan 1x
-- ============================================================================

-- 1. VOLATILE -> STABLE. VOLATILE funkciju planner ne smije izvuci iz petlje po
--    retku, pa se svaka od njih vrtila 4647 puta. Obje samo citaju.
--    Rollback: alter function ... volatile;
alter function public.is_admin() stable;
alter function public.is_coach_of(uuid) stable;

-- 2. Set-returning helperi. SECURITY DEFINER znaci da unutarnji SELECT ne
--    pokrece RLS ciljne tablice jos jednom (prije se ista provjera radila
--    dvaput -- vidljivo u planu kao "(is_admin() OR ...) AND (is_admin() OR ...)").
create or replace function public.my_athlete_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select (select auth.uid())
  union
  select lifter_id from public.coach_assignments where coach_id = (select auth.uid())
$$;

create or replace function public.my_block_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.blocks
  where (select public.is_admin()) or athlete_id in (select public.my_athlete_ids())
$$;

create or replace function public.my_workout_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.workouts
  where (select public.is_admin()) or athlete_id in (select public.my_athlete_ids())
$$;

grant execute on function public.my_athlete_ids() to authenticated;
grant execute on function public.my_block_ids()   to authenticated;
grant execute on function public.my_workout_ids() to authenticated;

-- 3. blocks / workouts -- ista logika (admin sve, vlastito, trenerovo), hoistana.
drop policy if exists "access blocks" on public.blocks;
create policy "access blocks" on public.blocks for all to authenticated
using      ((select public.is_admin()) or athlete_id in (select public.my_athlete_ids()))
with check ((select public.is_admin()) or athlete_id in (select public.my_athlete_ids()));

drop policy if exists "access workouts" on public.workouts;
create policy "access workouts" on public.workouts for all to authenticated
using      ((select public.is_admin()) or athlete_id in (select public.my_athlete_ids()))
with check ((select public.is_admin()) or athlete_id in (select public.my_athlete_ids()));

-- 4. weeks / workout_exercises -- EXISTS(...) po retku -> IN (hashani set, 1x).
drop policy if exists "access weeks" on public.weeks;
create policy "access weeks" on public.weeks for all to authenticated
using      (block_id in (select public.my_block_ids()))
with check (block_id in (select public.my_block_ids()));

drop policy if exists "access workout_exercises" on public.workout_exercises;
create policy "access workout_exercises" on public.workout_exercises for all to authenticated
using      (workout_id in (select public.my_workout_ids()))
with check (workout_id in (select public.my_workout_ids()));

-- 5. set_logs: 6 policyja -> 4, jedan po komandi. Prije su se za svaki SELECT
--    OR-ala tri permissive policyja i svaki je zvao get_my_role() po retku.
--    Pristup ostaje isti: admin i trener sve, lifter svoje.
drop policy if exists admin_all_set_logs         on public.set_logs;
drop policy if exists trener_all_set_logs        on public.set_logs;
drop policy if exists lifter_read_own_set_logs   on public.set_logs;
drop policy if exists lifter_insert_own_set_logs on public.set_logs;
drop policy if exists lifter_update_own_set_logs on public.set_logs;
drop policy if exists lifter_delete_own_set_logs on public.set_logs;

create policy set_logs_select on public.set_logs for select to public
using ((select public.get_my_role()) in ('admin','trener') or athlete_id = (select auth.uid()));

create policy set_logs_insert on public.set_logs for insert to public
with check ((select public.get_my_role()) in ('admin','trener') or athlete_id = (select auth.uid()));

create policy set_logs_update on public.set_logs for update to public
using      ((select public.get_my_role()) in ('admin','trener') or athlete_id = (select auth.uid()))
with check ((select public.get_my_role()) in ('admin','trener') or athlete_id = (select auth.uid()));

create policy set_logs_delete on public.set_logs for delete to public
using ((select public.get_my_role()) in ('admin','trener') or athlete_id = (select auth.uid()));

-- 6. Indeks koji je nedostajao: set_logs se filtrira po athlete_id na svakom
--    otvaranju treninga, a radio je seq scan preko svih 8769 redaka.
create index if not exists idx_set_logs_athlete_id on public.set_logs (athlete_id);

-- 7. pr_logs: 3 preklapajuca SELECT policyja -> 1 po komandi.
drop policy if exists admin_all_prs         on public.pr_logs;
drop policy if exists coach_read_prs        on public.pr_logs;
drop policy if exists lifter_read_own_prs   on public.pr_logs;
drop policy if exists lifter_insert_own_prs on public.pr_logs;
drop policy if exists lifter_update_own_prs on public.pr_logs;
drop policy if exists lifter_delete_own_prs on public.pr_logs;

create policy pr_logs_select on public.pr_logs for select to public
using ((select public.get_my_role()) = 'admin'
       or athlete_id = (select auth.uid())
       or athlete_id in (select public.my_athlete_ids()));

create policy pr_logs_insert on public.pr_logs for insert to public
with check ((select public.get_my_role()) = 'admin' or athlete_id = (select auth.uid()));

create policy pr_logs_update on public.pr_logs for update to public
using      ((select public.get_my_role()) = 'admin' or athlete_id = (select auth.uid()))
with check ((select public.get_my_role()) = 'admin' or athlete_id = (select auth.uid()));

create policy pr_logs_delete on public.pr_logs for delete to public
using ((select public.get_my_role()) = 'admin' or athlete_id = (select auth.uid()));

-- 8. exercises: auth.role() se evaluirao po retku -> jednom.
drop policy if exists "Anyone logged in can read exercises" on public.exercises;
create policy "Anyone logged in can read exercises" on public.exercises for select to public
using ((select auth.role()) = 'authenticated');
