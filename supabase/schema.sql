-- Run this in Supabase SQL Editor before using the admin products page.
-- If you already ran an older version, also run: supabase/migration-templates.sql

do $$ begin
  create type selection_type as enum ('single', 'multi');
exception when duplicate_object then null;
end $$;

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id) on delete restrict,
  name          text not null,
  description   text,
  image_url     text,
  base_price    numeric(10,2) not null check (base_price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_products_category_id on products(category_id);

-- Reusable group templates (shared across products)
create table if not exists group_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  selection_type  selection_type not null default 'multi',
  is_required     boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists template_options (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references group_templates(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null default 0 check (price >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists idx_template_options_template_id on template_options(template_id);

-- Link products to shared templates (many-to-many)
create table if not exists product_group_templates (
  product_id   uuid not null references products(id) on delete cascade,
  template_id  uuid not null references group_templates(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (product_id, template_id)
);

create index if not exists idx_product_group_templates_product on product_group_templates(product_id);
create index if not exists idx_product_group_templates_template on product_group_templates(template_id);

-- Product-specific custom groups (hybrid: per-product only)
create table if not exists customization_groups (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  name            text not null,
  selection_type  selection_type not null default 'multi',
  is_required     boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_customization_groups_product_id on customization_groups(product_id);

create table if not exists customization_options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references customization_groups(id) on delete cascade,
  name        text not null,
  price       numeric(10,2) not null default 0 check (price >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists idx_customization_options_group_id on customization_options(group_id);

-- Dev policies (tighten before production)
alter table categories enable row level security;
alter table products enable row level security;
alter table group_templates enable row level security;
alter table template_options enable row level security;
alter table product_group_templates enable row level security;
alter table customization_groups enable row level security;
alter table customization_options enable row level security;

do $$ begin create policy "dev_all_categories" on categories for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_products" on products for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_group_templates" on group_templates for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_template_options" on template_options for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_product_group_templates" on product_group_templates for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_groups" on customization_groups for all using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "dev_all_options" on customization_options for all using (true) with check (true); exception when duplicate_object then null; end $$;
