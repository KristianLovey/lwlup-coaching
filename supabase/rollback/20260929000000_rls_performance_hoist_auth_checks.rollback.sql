-- ============================================================================
-- NE POKRETATI U NORMALNOM TIJEKU.
--
-- Ovo je UNDO za migraciju 20260929000000. Pokreni ga SAMO ako nakon migracije
-- nesto pukne i zelis vratiti stare policyje (i staru sporost).
-- Pokretanje ovoga odmah nakon migracije ponistava cijeli performance fix.
-- ============================================================================

alter function public.is_admin() volatile;
alter function public.is_coach_of(uuid) volatile;

drop policy if exists "access blocks" on public.blocks;
create policy "access blocks" on public.blocks for all to authenticated
using      (is_admin() or auth.uid() = athlete_id or is_coach_of(athlete_id))
with check (is_admin() or auth.uid() = athlete_id or is_coach_of(athlete_id));

drop policy if exists "access workouts" on public.workouts;
create policy "access workouts" on public.workouts for all to authenticated
using      (is_admin() or auth.uid() = athlete_id or is_coach_of(athlete_id))
with check (is_admin() or auth.uid() = athlete_id or is_coach_of(athlete_id));

drop policy if exists "access weeks" on public.weeks;
create policy "access weeks" on public.weeks for all to authenticated
using      (exists (select 1 from blocks b where b.id = weeks.block_id and (is_admin() or auth.uid() = b.athlete_id or is_coach_of(b.athlete_id))))
with check (exists (select 1 from blocks b where b.id = weeks.block_id and (is_admin() or auth.uid() = b.athlete_id or is_coach_of(b.athlete_id))));

drop policy if exists "access workout_exercises" on public.workout_exercises;
create policy "access workout_exercises" on public.workout_exercises for all to authenticated
using      (exists (select 1 from workouts wo where wo.id = workout_exercises.workout_id and (is_admin() or auth.uid() = wo.athlete_id or is_coach_of(wo.athlete_id))))
with check (exists (select 1 from workouts wo where wo.id = workout_exercises.workout_id and (is_admin() or auth.uid() = wo.athlete_id or is_coach_of(wo.athlete_id))));

drop policy if exists set_logs_select on public.set_logs;
drop policy if exists set_logs_insert on public.set_logs;
drop policy if exists set_logs_update on public.set_logs;
drop policy if exists set_logs_delete on public.set_logs;
create policy admin_all_set_logs on public.set_logs for all to authenticated
  using (get_my_role() = 'admin') with check (get_my_role() = 'admin');
create policy trener_all_set_logs on public.set_logs for all to authenticated
  using (get_my_role() = 'trener') with check (get_my_role() = 'trener');
create policy lifter_read_own_set_logs   on public.set_logs for select to public using (athlete_id = auth.uid());
create policy lifter_insert_own_set_logs on public.set_logs for insert to public with check (athlete_id = auth.uid());
create policy lifter_update_own_set_logs on public.set_logs for update to public using (athlete_id = auth.uid());
create policy lifter_delete_own_set_logs on public.set_logs for delete to public using (athlete_id = auth.uid());

drop policy if exists pr_logs_select on public.pr_logs;
drop policy if exists pr_logs_insert on public.pr_logs;
drop policy if exists pr_logs_update on public.pr_logs;
drop policy if exists pr_logs_delete on public.pr_logs;
create policy admin_all_prs on public.pr_logs for all to public using (get_my_role() = 'admin');
create policy coach_read_prs on public.pr_logs for select to public using (is_coach_of(athlete_id));
create policy lifter_read_own_prs   on public.pr_logs for select to public using (athlete_id = auth.uid());
create policy lifter_insert_own_prs on public.pr_logs for insert to public with check (athlete_id = auth.uid());
create policy lifter_update_own_prs on public.pr_logs for update to public using (athlete_id = auth.uid());
create policy lifter_delete_own_prs on public.pr_logs for delete to public using (athlete_id = auth.uid());

drop policy if exists "Anyone logged in can read exercises" on public.exercises;
create policy "Anyone logged in can read exercises" on public.exercises for select to public
using (auth.role() = 'authenticated');

-- Helperi i indeks su aditivni; po zelji:
-- drop function if exists public.my_workout_ids();
-- drop function if exists public.my_block_ids();
-- drop function if exists public.my_athlete_ids();
-- drop index if exists public.idx_set_logs_athlete_id;
