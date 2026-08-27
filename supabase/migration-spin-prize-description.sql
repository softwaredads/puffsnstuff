-- Optional details shown in the app prizes info popup.
-- Run on existing Supabase projects after migration-spin.sql.

alter table public.spin_prizes
  add column if not exists description text;
