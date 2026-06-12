-- Order audit history (financial snapshot + status timeline)
-- Run after migration-points.sql

alter table public.orders
  add column if not exists points_discount numeric(10,2) not null default 0
    check (points_discount >= 0);

update public.orders
set points_discount = greatest(discount - reward_discount, 0)
where points_discount = 0 and discount > reward_discount;

create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_type  text not null,
  summary     text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_order_events_order_created
  on public.order_events (order_id, created_at asc);

alter table public.order_events enable row level security;

do $$ begin
  create policy "dev_all_order_events" on public.order_events
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create or replace function public.log_order_event(
  p_order_id uuid,
  p_event_type text,
  p_summary text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_events (order_id, event_type, summary, details)
  values (p_order_id, p_event_type, p_summary, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.trg_order_placed_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_order_event(
    new.id,
    'order_placed',
    format('Order #%s placed — customer pays %s kr', new.order_number, new.total),
    jsonb_build_object(
      'order_number', new.order_number,
      'subtotal', new.subtotal,
      'reward_discount', new.reward_discount,
      'reward_label', new.reward_label,
      'points_redeemed', new.points_redeemed,
      'points_discount', new.points_discount,
      'delivery_fee', new.delivery_fee,
      'total_discount', new.discount,
      'total', new.total,
      'pickup_time', new.pickup_time
    )
  );
  return new;
end;
$$;

drop trigger if exists orders_placed_event on public.orders;

create trigger orders_placed_event
  after insert on public.orders
  for each row
  execute function public.trg_order_placed_event();

create or replace function public.trg_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    perform public.log_order_event(
      new.id,
      'status_changed',
      format('Status: %s → %s', old.status, new.status),
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status
      )
    );
  end if;

  if coalesce(new.points_awarded, 0) > coalesce(old.points_awarded, 0) then
    perform public.log_order_event(
      new.id,
      'points_awarded',
      format('+%s PuffPoints earned on completion', new.points_awarded),
      jsonb_build_object(
        'points_awarded', new.points_awarded,
        'order_total', new.total
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists orders_status_event on public.orders;

create trigger orders_status_event
  after update of status, points_awarded on public.orders
  for each row
  execute function public.trg_order_status_event();

-- Store points_discount on new orders
create or replace function public.create_order(
  p_pickup_time text,
  p_reward_discount numeric default 0,
  p_points_to_redeem int default 0,
  p_promo_code text default null,
  p_reward_label text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number int;
  v_subtotal numeric(10,2) := 0;
  v_delivery_fee numeric(10,2);
  v_reward_discount numeric(10,2);
  v_redeem_rate numeric;
  v_points_discount numeric(10,2);
  v_total_discount numeric(10,2);
  v_total numeric(10,2);
  v_balance int := 0;
  v_item jsonb;
  v_sort int := 0;
  v_customer_name text;
  v_customer_phone text;
  v_points int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_pickup_time is null or trim(p_pickup_time) = '' then
    raise exception 'pickup_time_required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order_items_required';
  end if;

  v_points := greatest(coalesce(p_points_to_redeem, 0), 0);
  v_reward_discount := greatest(coalesce(p_reward_discount, 0), 0);
  v_redeem_rate := public.get_loyalty_setting('points_per_kr_redeem');
  if v_redeem_rate <= 0 then
    v_redeem_rate := 10;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal + (
      (v_item->>'unit_price')::numeric * (v_item->>'quantity')::int
    );
  end loop;

  v_delivery_fee := case when v_subtotal > 200 then 0 else 25 end;
  v_points_discount := floor(v_points / v_redeem_rate);

  if v_points > 0 then
    if v_points_discount <= 0 then
      raise exception 'points_below_minimum';
    end if;

    select coalesce(points_balance, 0)
    into v_balance
    from public.user_points
    where user_id = v_user_id;

    if v_balance < v_points then
      raise exception 'insufficient_points';
    end if;

    if v_points_discount > (v_subtotal - v_reward_discount + v_delivery_fee) then
      raise exception 'points_exceed_order_total';
    end if;
  else
    v_points_discount := 0;
    v_points := 0;
  end if;

  v_total_discount := v_reward_discount + v_points_discount;
  v_total := greatest(0, v_subtotal - v_total_discount + v_delivery_fee);

  select p.full_name, p.phone
  into v_customer_name, v_customer_phone
  from public.profiles p
  where p.id = v_user_id;

  insert into public.orders (
    user_id,
    pickup_time,
    subtotal,
    reward_discount,
    points_discount,
    discount,
    points_redeemed,
    delivery_fee,
    total,
    promo_code,
    reward_label,
    customer_name,
    customer_phone
  )
  values (
    v_user_id,
    trim(p_pickup_time),
    v_subtotal,
    v_reward_discount,
    v_points_discount,
    v_total_discount,
    v_points,
    v_delivery_fee,
    v_total,
    nullif(trim(p_promo_code), ''),
    nullif(trim(p_reward_label), ''),
    nullif(trim(v_customer_name), ''),
    nullif(trim(v_customer_phone), '')
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      title,
      quantity,
      unit_price,
      base_price,
      options,
      applied_reward_id,
      reward_label,
      sort_order
    )
    values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'title',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      (v_item->>'base_price')::numeric,
      coalesce(v_item->'options', '[]'::jsonb),
      nullif(v_item->>'applied_reward_id', '')::uuid,
      nullif(v_item->>'reward_label', ''),
      v_sort
    );
    v_sort := v_sort + 1;
  end loop;

  if v_points > 0 then
    update public.user_points
    set points_balance = points_balance - v_points,
        updated_at = now()
    where user_id = v_user_id;

    if not found then
      raise exception 'insufficient_points';
    end if;

    insert into public.points_history (user_id, amount, reason, order_id)
    values (v_user_id, -v_points, 'order_redeem', v_order_id);
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'status', 'pending',
    'pickup_time', trim(p_pickup_time),
    'subtotal', v_subtotal,
    'reward_discount', v_reward_discount,
    'discount', v_total_discount,
    'points_redeemed', v_points,
    'points_discount', v_points_discount,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'promo_code', nullif(trim(p_promo_code), ''),
    'reward_label', nullif(trim(p_reward_label), ''),
    'created_at', now()
  );
end;
$$;

grant execute on function public.create_order(text, numeric, int, text, text, jsonb) to authenticated;

-- Backfill timeline for orders created before this migration
insert into public.order_events (order_id, event_type, summary, details, created_at)
select
  o.id,
  'order_placed',
  format('Order #%s placed — customer pays %s kr', o.order_number, o.total),
  jsonb_build_object(
    'order_number', o.order_number,
    'subtotal', o.subtotal,
    'reward_discount', o.reward_discount,
    'reward_label', o.reward_label,
    'points_redeemed', o.points_redeemed,
    'points_discount', o.points_discount,
    'delivery_fee', o.delivery_fee,
    'total_discount', o.discount,
    'total', o.total,
    'pickup_time', o.pickup_time,
    'backfilled', true
  ),
  o.created_at
from public.orders o
where not exists (
  select 1 from public.order_events e
  where e.order_id = o.id and e.event_type = 'order_placed'
);
