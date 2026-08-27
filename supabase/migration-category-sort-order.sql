-- Category display order in the app (filter buttons + list).
-- Lower number = shown first.

alter table public.categories
  add column if not exists sort_order int not null default 0;
