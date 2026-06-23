-- Pickup locations for checkout branch selection

create table if not exists public.pickup_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  created_at  timestamptz not null default now()
);

alter table public.pickup_locations
  add column if not exists open_time time not null default '10:00',
  add column if not exists close_time time not null default '21:00',
  add column if not exists slot_interval_minutes int not null default 15;

alter table public.pickup_locations enable row level security;

do $$ begin
  create policy "dev_all_pickup_locations"
    on public.pickup_locations for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists pickup_location text;

drop function if exists public.create_order(text, numeric, int, text, text, jsonb);

create or replace function public.create_order(
  p_pickup_time text,
  p_location_id uuid,
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
  v_location_name text;
  v_location_address text;
  v_pickup_location text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_pickup_time is null or trim(p_pickup_time) = '' then
    raise exception 'pickup_time_required';
  end if;

  if p_location_id is null then
    raise exception 'pickup_location_required';
  end if;

  select l.name, l.address
  into v_location_name, v_location_address
  from public.pickup_locations l
  where l.id = p_location_id;

  if v_location_name is null then
    raise exception 'pickup_location_not_found';
  end if;

  v_pickup_location := trim(v_location_name) || ' — ' || trim(v_location_address);

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

  v_delivery_fee := 0;
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
    pickup_location,
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
    v_pickup_location,
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
    'pickup_location', v_pickup_location,
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

grant execute on function public.create_order(text, uuid, numeric, int, text, text, jsonb) to authenticated;
