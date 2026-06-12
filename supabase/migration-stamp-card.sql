-- Stamp card: collect stamps on completed orders, earn a free product gift
-- Run after migration-orders.sql

do $$ begin
  create type public.stamp_qualify_type as enum ('overall', 'category', 'product');
exception when duplicate_object then null;
end $$;

create table if not exists public.stamp_programs (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  is_active             boolean not null default false,
  stamps_required       int not null check (stamps_required between 1 and 20),
  qualify_type          public.stamp_qualify_type not null default 'overall',
  qualify_category_id   uuid references public.categories(id) on delete set null,
  qualify_product_id    uuid references public.products(id) on delete set null,
  reward_product_id     uuid not null references public.products(id) on delete restrict,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.user_stamp_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  program_id    uuid not null references public.stamp_programs(id) on delete cascade,
  stamps_count  int not null default 0 check (stamps_count >= 0),
  updated_at    timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table if not exists public.stamp_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  program_id    uuid not null references public.stamp_programs(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  event_type    text not null check (event_type in ('stamp_earned', 'reward_granted')),
  stamps_after  int,
  created_at    timestamptz not null default now()
);

create index if not exists idx_stamp_history_user
  on public.stamp_history (user_id, created_at desc);

-- Each order counts once per program (never re-used for the next card cycle)
create table if not exists public.stamp_orders_counted (
  program_id  uuid not null references public.stamp_programs(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (program_id, order_id)
);

create index if not exists idx_stamp_orders_counted_user
  on public.stamp_orders_counted (user_id, program_id);

alter table public.stamp_orders_counted enable row level security;

do $$ begin
  create policy "dev_all_stamp_orders_counted" on public.stamp_orders_counted
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "stamp_orders_counted_select_own" on public.stamp_orders_counted
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

alter table public.stamp_programs enable row level security;
alter table public.user_stamp_progress enable row level security;
alter table public.stamp_history enable row level security;

do $$ begin
  create policy "dev_all_stamp_programs" on public.stamp_programs
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "stamp_programs_select_active" on public.stamp_programs
    for select using (is_active = true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_stamp_progress_select_own" on public.user_stamp_progress
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "stamp_history_select_own" on public.stamp_history
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_user_stamp_progress" on public.user_stamp_progress
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_stamp_history" on public.stamp_history
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create or replace function public.touch_stamp_programs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stamp_programs_updated_at on public.stamp_programs;
create trigger stamp_programs_updated_at
  before update on public.stamp_programs
  for each row execute function public.touch_stamp_programs_updated_at();

create or replace function public.order_qualifies_for_stamp(
  p_order_id uuid,
  p_qualify_type public.stamp_qualify_type,
  p_category_id uuid,
  p_product_id uuid
)
returns boolean
language sql
stable
as $$
  select case
    when p_qualify_type = 'overall' then true
    when p_qualify_type = 'category' then exists (
      select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = p_order_id
        and p.category_id = p_category_id
    )
    when p_qualify_type = 'product' then exists (
      select 1
      from public.order_items oi
      where oi.order_id = p_order_id
        and oi.product_id = p_product_id
    )
    else false
  end;
$$;

create or replace function public.grant_stamp_card_reward(
  p_user_id uuid,
  p_program public.stamp_programs
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_name text;
  v_reward_id uuid;
  v_label text;
begin
  select name into v_product_name from public.products where id = p_program.reward_product_id;
  v_label := coalesce(p_program.name, 'Stamp card') || ' — Free ' || coalesce(v_product_name, 'item');

  insert into public.user_rewards (
    user_id, source, label, gift_kind, gift_config
  )
  values (
    p_user_id,
    'stamp_card',
    v_label,
    'free_product',
    jsonb_build_object(
      'kind', 'free_product',
      'product_id', p_program.reward_product_id,
      'covers', 'base_only',
      'label', v_label
    )
  )
  returning id into v_reward_id;

  return v_reward_id;
end;
$$;

create or replace function public.process_stamp_cards_on_order_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.stamp_programs;
  v_stamps int;
  v_reward_id uuid;
  v_inserted int;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  for v_program in
    select * from public.stamp_programs where is_active = true
  loop
    if not public.order_qualifies_for_stamp(
      new.id,
      v_program.qualify_type,
      v_program.qualify_category_id,
      v_program.qualify_product_id
    ) then
      continue;
    end if;

    insert into public.stamp_orders_counted (program_id, order_id, user_id)
    values (v_program.id, new.id, new.user_id)
    on conflict do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      continue;
    end if;

    insert into public.user_stamp_progress (user_id, program_id, stamps_count)
    values (new.user_id, v_program.id, 1)
    on conflict (user_id, program_id) do update
      set stamps_count = public.user_stamp_progress.stamps_count + 1,
          updated_at = now()
    returning stamps_count into v_stamps;

    insert into public.stamp_history (user_id, program_id, order_id, event_type, stamps_after)
    values (new.user_id, v_program.id, new.id, 'stamp_earned', v_stamps);

    if v_stamps >= v_program.stamps_required then
      v_reward_id := public.grant_stamp_card_reward(new.user_id, v_program);

      update public.user_stamp_progress
      set stamps_count = 0, updated_at = now()
      where user_id = new.user_id and program_id = v_program.id;

      insert into public.stamp_history (user_id, program_id, order_id, event_type, stamps_after)
      values (new.user_id, v_program.id, new.id, 'reward_granted', 0);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_stamp_cards on public.orders;

create trigger orders_stamp_cards
  after update of status on public.orders
  for each row
  execute function public.process_stamp_cards_on_order_complete();

create or replace function public.get_stamp_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_program public.stamp_programs;
  v_stamps int := 0;
  v_qualify_label text;
  v_reward_name text;
  v_category_name text;
  v_product_name text;
begin
  v_user_id := auth.uid();

  select * into v_program
  from public.stamp_programs
  where is_active = true
  order by updated_at desc
  limit 1;

  if v_program.id is null then
    return jsonb_build_object('active', false);
  end if;

  if v_user_id is not null then
    select coalesce(stamps_count, 0)
    into v_stamps
    from public.user_stamp_progress
    where user_id = v_user_id and program_id = v_program.id;
  end if;

  select name into v_reward_name from public.products where id = v_program.reward_product_id;

  if v_program.qualify_type = 'overall' then
    v_qualify_label := 'Any order';
  elsif v_program.qualify_type = 'category' then
    select name into v_category_name from public.categories where id = v_program.qualify_category_id;
    v_qualify_label := coalesce(v_category_name, 'Category') || ' items';
  else
    select name into v_product_name from public.products where id = v_program.qualify_product_id;
    v_qualify_label := coalesce(v_product_name, 'Product');
  end if;

  return jsonb_build_object(
    'active', true,
    'program_id', v_program.id,
    'name', v_program.name,
    'stamps_required', v_program.stamps_required,
    'stamps_current', coalesce(v_stamps, 0),
    'stamps_remaining', greatest(v_program.stamps_required - coalesce(v_stamps, 0), 0),
    'qualify_type', v_program.qualify_type,
    'qualify_label', v_qualify_label,
    'reward_product_name', v_reward_name
  );
end;
$$;

grant execute on function public.get_stamp_status() to authenticated;
grant execute on function public.get_stamp_status() to anon;
