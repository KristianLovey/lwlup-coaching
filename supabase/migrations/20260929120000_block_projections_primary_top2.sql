-- Drugi top set primarnog lifta u planeru bloka (npr. serija ponavljanja pa
-- fatigue single). Kilaza se racuna kao postotak prvog top seta, pa se ovdje
-- cuva samo konfiguracija: { enabled, reps, pct, before }.
--
-- Dodatni liftovi NE trebaju novu kolonu — njihov drugi top set ide u postojeci
-- extra_lifts jsonb, pod kljucem "top2".
alter table public.block_projections
  add column if not exists primary_top2 jsonb;
