-- Run in Supabase SQL Editor after schema.sql and migration-profiles.sql
-- Spin wheel, points, and gift rewards

do $$ begin
  create type spin_prize_type as enum ('points', 'gift', 'none');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type gift_kind as enum ('free_product', 'free_option', 'credit');
exception when duplicate_object then null;
end $$;

-- Wheel segments (admin-managed)
create table if not exists public.spin_prizes (
  id                      uuid primary key default gen_random_uuid(),
  label                   text not null,
  prize_type              spin_prize_type not null,
  points_value            int not null default 0 check (points_value >= 0),
  gift_kind               gift_kind,
  product_id              uuid references public.products(id) on delete set null,
  group_template_id       uuid references public.group_templates(id) on delete set null,
  template_option_id      uuid references public.template_options(id) on delete set null,
  customization_group_id  uuid references public.customization_groups(id) on delete set null,
  customization_option_id uuid references public.customization_options(id) on delete set null,
  max_option_price_kr     numeric(10,2) check (max_option_price_kr is null or max_option_price_kr >= 0),
  credit_amount_kr        numeric(10,2) check (credit_amount_kr is null or credit_amount_kr >= 0),
  covers_base_only        boolean not null default true,
  color                   text not null default '#ff6b6b',
  weight                  int not null default 10 check (weight > 0),
  sort_order              int not null default 0,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);

create index if not exists idx_spin_prizes_active on public.spin_prizes(is_active, sort_order);

-- User points balance
create table if not exists public.user_points (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  points_balance  int not null default 0 check (points_balance >= 0),
  updated_at      timestamptz not null default now()
);

-- Points ledger
create table if not exists public.points_history (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  amount           int not null,
  reason           text not null,
  spin_history_id  uuid,
  created_at       timestamptz not null default now()
);

create index if not exists idx_points_history_user on public.points_history(user_id, created_at desc);

-- Gift vouchers won from spin (or other sources later)
create table if not exists public.user_rewards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  source           text not null default 'spin',
  spin_history_id  uuid,
  label            text not null,
  gift_kind        gift_kind not null,
  gift_config      jsonb not null default '{}',
  status           text not null default 'available'
                     check (status in ('available', 'redeemed', 'expired')),
  expires_at       timestamptz,
  redeemed_at      timestamptz,
  order_ref        text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_user_rewards_user_status on public.user_rewards(user_id, status);

-- Spin audit log
create table if not exists public.spin_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  prize_id       uuid not null references public.spin_prizes(id) on delete restrict,
  prize_type     spin_prize_type not null,
  prize_label    text not null,
  points_awarded int not null default 0,
  reward_id      uuid references public.user_rewards(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_spin_history_user_day on public.spin_history(user_id, created_at desc);

alter table public.points_history
  drop constraint if exists points_history_spin_history_id_fkey;

alter table public.points_history
  add constraint points_history_spin_history_id_fkey
  foreign key (spin_history_id) references public.spin_history(id) on delete set null;

alter table public.user_rewards
  drop constraint if exists user_rewards_spin_history_id_fkey;

alter table public.user_rewards
  add constraint user_rewards_spin_history_id_fkey
  foreign key (spin_history_id) references public.spin_history(id) on delete set null;

-- RLS
alter table public.spin_prizes enable row level security;
alter table public.user_points enable row level security;
alter table public.points_history enable row level security;
alter table public.user_rewards enable row level security;
alter table public.spin_history enable row level security;

-- Admin dev policies (match menu tables pattern)
do $$ begin
  create policy "dev_all_spin_prizes" on public.spin_prizes for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Authenticated users can read active prizes
do $$ begin
  create policy "spin_prizes_select_active" on public.spin_prizes
    for select using (is_active = true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_points_select_own" on public.user_points
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "points_history_select_own" on public.points_history
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_rewards_select_own" on public.user_rewards
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "spin_history_select_own" on public.spin_history
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_spin_history" on public.spin_history
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Weighted random helper
create or replace function public.pick_weighted_spin_prize()
returns uuid
language plpgsql
volatile
as $$
declare
  total_weight int;
  roll int;
  running int := 0;
  rec record;
begin
  select coalesce(sum(weight), 0) into total_weight
  from public.spin_prizes
  where is_active = true;

  if total_weight = 0 then
    raise exception 'no_active_prizes';
  end if;

  roll := floor(random() * total_weight)::int + 1;

  for rec in
    select id, weight
    from public.spin_prizes
    where is_active = true
    order by sort_order, created_at
  loop
    running := running + rec.weight;
    if roll <= running then
      return rec.id;
    end if;
  end loop;

  raise exception 'prize_pick_failed';
end;
$$;

-- Build gift_config JSON from prize row
create or replace function public.build_gift_config(p public.spin_prizes)
returns jsonb
language plpgsql
immutable
as $$
begin
  if p.gift_kind = 'free_product' then
    return jsonb_build_object(
      'kind', 'free_product',
      'product_id', p.product_id,
      'covers', case when p.covers_base_only then 'base_only' else 'base_and_listed_options' end,
      'label', p.label
    );
  elsif p.gift_kind = 'free_option' then
    return jsonb_build_object(
      'kind', 'free_option',
      'group_template_id', p.group_template_id,
      'template_option_id', p.template_option_id,
      'customization_group_id', p.customization_group_id,
      'customization_option_id', p.customization_option_id,
      'max_option_price_kr', p.max_option_price_kr,
      'label', p.label
    );
  elsif p.gift_kind = 'credit' then
    return jsonb_build_object(
      'kind', 'credit',
      'amount_kr', p.credit_amount_kr,
      'label', p.label
    );
  end if;
  return jsonb_build_object('kind', 'unknown', 'label', p.label);
end;
$$;

-- Main spin RPC (server decides prize)
create or replace function public.perform_spin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_today_start timestamptz;
  v_existing_spin uuid;
  v_prize_id uuid;
  v_prize public.spin_prizes;
  v_prize_ids uuid[];
  v_wheel_index int;
  v_spin_id uuid;
  v_reward_id uuid;
  v_gift_config jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- One spin per calendar day (Europe/Copenhagen)
  v_today_start := date_trunc('day', now() at time zone 'Europe/Copenhagen')
    at time zone 'Europe/Copenhagen';

  select id into v_existing_spin
  from public.spin_history
  where user_id = v_user_id
    and created_at >= v_today_start
  limit 1;

  if v_existing_spin is not null then
    raise exception 'already_spun_today';
  end if;

  v_prize_id := public.pick_weighted_spin_prize();
  select * into v_prize from public.spin_prizes where id = v_prize_id;

  select array_agg(id order by sort_order, created_at)
  into v_prize_ids
  from public.spin_prizes
  where is_active = true;

  select idx - 1 into v_wheel_index
  from unnest(v_prize_ids) with ordinality as t(id, idx)
  where id = v_prize.id;

  insert into public.spin_history (user_id, prize_id, prize_type, prize_label)
  values (v_user_id, v_prize.id, v_prize.prize_type, v_prize.label)
  returning id into v_spin_id;

  if v_prize.prize_type = 'points' and v_prize.points_value > 0 then
    insert into public.user_points (user_id, points_balance)
    values (v_user_id, v_prize.points_value)
    on conflict (user_id) do update
      set points_balance = public.user_points.points_balance + excluded.points_balance,
          updated_at = now();

    insert into public.points_history (user_id, amount, reason, spin_history_id)
    values (v_user_id, v_prize.points_value, 'spin_win', v_spin_id);

    update public.spin_history
    set points_awarded = v_prize.points_value
    where id = v_spin_id;
  elsif v_prize.prize_type = 'gift' and v_prize.gift_kind is not null then
    v_gift_config := public.build_gift_config(v_prize);

    insert into public.user_rewards (
      user_id, source, spin_history_id, label, gift_kind, gift_config,
      expires_at
    )
    values (
      v_user_id, 'spin', v_spin_id, v_prize.label, v_prize.gift_kind, v_gift_config,
      now() + interval '30 days'
    )
    returning id into v_reward_id;

    update public.spin_history set reward_id = v_reward_id where id = v_spin_id;
  end if;

  return jsonb_build_object(
    'spin_id', v_spin_id,
    'prize_id', v_prize.id,
    'prize_type', v_prize.prize_type,
    'label', v_prize.label,
    'points_value', v_prize.points_value,
    'gift_kind', v_prize.gift_kind,
    'reward_id', v_reward_id,
    'wheel_index', coalesce(v_wheel_index, 0),
    'color', v_prize.color
  );
end;
$$;

-- Check if user can spin today
create or replace function public.get_spin_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_today_start timestamptz;
  v_last_spin record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('can_spin', false, 'reason', 'not_authenticated');
  end if;

  v_today_start := date_trunc('day', now() at time zone 'Europe/Copenhagen')
    at time zone 'Europe/Copenhagen';

  select sh.*, sp.color
  into v_last_spin
  from public.spin_history sh
  join public.spin_prizes sp on sp.id = sh.prize_id
  where sh.user_id = v_user_id
    and sh.created_at >= v_today_start
  order by sh.created_at desc
  limit 1;

  if v_last_spin.id is not null then
    return jsonb_build_object(
      'can_spin', false,
      'reason', 'already_spun_today',
      'last_spin', jsonb_build_object(
        'label', v_last_spin.prize_label,
        'prize_type', v_last_spin.prize_type,
        'points_awarded', v_last_spin.points_awarded,
        'reward_id', v_last_spin.reward_id,
        'color', v_last_spin.color
      )
    );
  end if;

  return jsonb_build_object('can_spin', true);
end;
$$;

-- Redeem a gift reward when order is placed
create or replace function public.redeem_reward(
  p_reward_id uuid,
  p_order_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward public.user_rewards;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_reward
  from public.user_rewards
  where id = p_reward_id and user_id = v_user_id
  for update;

  if v_reward.id is null then
    raise exception 'reward_not_found';
  end if;

  if v_reward.status <> 'available' then
    raise exception 'reward_not_available';
  end if;

  if v_reward.expires_at is not null and v_reward.expires_at < now() then
    update public.user_rewards set status = 'expired' where id = p_reward_id;
    raise exception 'reward_expired';
  end if;

  update public.user_rewards
  set status = 'redeemed',
      redeemed_at = now(),
      order_ref = p_order_ref
  where id = p_reward_id;

  return jsonb_build_object('success', true, 'reward_id', p_reward_id);
end;
$$;

grant execute on function public.perform_spin() to authenticated;
grant execute on function public.get_spin_status() to authenticated;
grant execute on function public.redeem_reward(uuid, text) to authenticated;

-- Seed default wheel segments (safe to re-run: only if table empty)
insert into public.spin_prizes (label, prize_type, points_value, color, weight, sort_order)
select * from (values
  ('10 Points',   'points'::spin_prize_type, 10,  '#ff6b6b', 25, 0),
  ('25 Points',   'points'::spin_prize_type, 25,  '#4ecdc4', 20, 1),
  ('50 Points',   'points'::spin_prize_type, 50,  '#45b7d1', 12, 2),
  ('Try Again',   'none'::spin_prize_type,   0,   '#96ceb4', 18, 3),
  ('100 Points',  'points'::spin_prize_type, 100, '#ffeaa7', 5,  4),
  ('5 Points',    'points'::spin_prize_type, 5,   '#dda0dd', 20, 5)
) as v(label, prize_type, points_value, color, weight, sort_order)
where not exists (select 1 from public.spin_prizes limit 1);
