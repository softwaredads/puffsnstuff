-- Run this ONLY if you already created tables from the older schema.sql
-- (before group templates were added). Safe to run multiple times.

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

create table if not exists product_group_templates (
  product_id   uuid not null references products(id) on delete cascade,
  template_id  uuid not null references group_templates(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (product_id, template_id)
);

create index if not exists idx_product_group_templates_product on product_group_templates(product_id);
create index if not exists idx_product_group_templates_template on product_group_templates(template_id);

alter table group_templates enable row level security;
alter table template_options enable row level security;
alter table product_group_templates enable row level security;

do $$ begin
  create policy "dev_all_group_templates" on group_templates for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_template_options" on template_options for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_product_group_templates" on product_group_templates for all using (true) with check (true);
exception when duplicate_object then null;
end $$;
