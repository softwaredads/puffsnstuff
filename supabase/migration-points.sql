-- Points earn on completed orders + redeem at checkout
-- Run after migration-orders.sql

create table if not exists public.loyalty_settings (
  key             text primary key,
  value_numeric   numeric(10,2) not null,
  description     text
);

insert into public.loyalty_settings (key, value_numeric, description)
values
  ('points_per_kr_earn', 1, 'PuffPoints earned per 1 kr paid when order is completed'),
  ('points_per_kr_redeem', 10, 'PuffPoints required per 1 kr discount at checkout')
on conflict (key) do nothing;

alter table public.orders
  add column if not exists reward_discount numeric(10,2) not null default 0
    check (reward_discount >= 0);

alter table public.orders
  add column if not exists points_redeemed int not null default 0
    check (points_redeemed >= 0);

alter table public.orders
  add column if not exists points_awarded int not null default 0
    check (points_awarded >= 0);

alter table public.orders
  add column if not exists points_discount numeric(10,2) not null default 0
    check (points_discount >= 0);

alter table public.points_history
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index if not exists idx_points_history_order
  on public.points_history (order_id);

-- Backfill reward_discount for existing orders
update public.orders
set reward_discount = discount
where reward_discount = 0 and discount > 0;

create or replace function public.get_loyalty_setting(p_key text)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select value_numeric from public.loyalty_settings where key = p_key),
    0
  );
$$;

create or replace function public.get_loyalty_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance int := 0;
  v_earn_rate numeric;
  v_redeem_rate numeric;
begin
  v_user_id := auth.uid();
  v_earn_rate := public.get_loyalty_setting('points_per_kr_earn');
  v_redeem_rate := public.get_loyalty_setting('points_per_kr_redeem');

  if v_redeem_rate <= 0 then
    v_redeem_rate := 10;
  end if;

  if v_user_id is not null then
    select coalesce(points_balance, 0)
    into v_balance
    from public.user_points
    where user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'points_per_kr_earn', v_earn_rate,
    'points_per_kr_redeem', v_redeem_rate,
    'points_balance', v_balance
  );
end;
$$;

grant execute on function public.get_loyalty_settings() to authenticated;
grant execute on function public.get_loyalty_settings() to anon;

drop function if exists public.create_order(text, numeric, text, text, jsonb);

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

create or replace function public.award_order_completion_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earn_rate numeric;
  v_points int;
begin
  if new.status = 'completed'
     and (old.status is distinct from 'completed')
     and coalesce(new.points_awarded, 0) = 0 then

    v_earn_rate := public.get_loyalty_setting('points_per_kr_earn');
    if v_earn_rate <= 0 then
      v_earn_rate := 1;
    end if;

    v_points := floor(new.total * v_earn_rate);

    if v_points > 0 then
      insert into public.user_points (user_id, points_balance)
      values (new.user_id, v_points)
      on conflict (user_id) do update
        set points_balance = public.user_points.points_balance + excluded.points_balance,
            updated_at = now();

      insert into public.points_history (user_id, amount, reason, order_id)
      values (new.user_id, v_points, 'order_complete', new.id);

      new.points_awarded := v_points;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_award_points on public.orders;

create trigger orders_award_points
  before update of status on public.orders
  for each row
  execute function public.award_order_completion_points();

-- Next: run migration-order-history.sql for admin timeline + points_discount column.
