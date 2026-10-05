-- Drugi top set primarnog lifta u planeru bloka (npr. trojke pa fatigue single).
-- Planira se kao prvi: { enabled, reps, startKg, endKg, before }.
-- Dodatni liftovi NE trebaju novu kolonu — njihov drugi top set ide u postojeci
-- extra_lifts jsonb, pod kljucem "top2".
-- Primijenjeno na produkciju 2026-10-05 (apply_migration block_projections_primary_top2).
alter table public.block_projections
  add column if not exists primary_top2 jsonb;
