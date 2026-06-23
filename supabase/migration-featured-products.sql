-- Home screen featured products (admin picks from existing catalog)
-- Run in Supabase SQL Editor

create table if not exists public.featured_products (
  product_id  uuid primary key references public.products(id) on delete cascade,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_featured_products_sort
  on public.featured_products (sort_order);

alter table public.featured_products enable row level security;

do $$ begin
  create policy "dev_all_featured_products" on public.featured_products
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;
