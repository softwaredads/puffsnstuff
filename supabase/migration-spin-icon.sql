-- Run after migration-spin.sql on existing Supabase projects.
-- Icons are optional so existing wheel segments continue to work unchanged.

alter table public.spin_prizes
  add column if not exists icon_url text;
