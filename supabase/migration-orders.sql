-- Orders + order items (run in Supabase SQL Editor after migration-spin.sql)

do $$ begin
  create type public.order_status as enum (
    'pending',
    'ready',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create sequence if not exists public.order_number_seq start 1000;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        int not null default nextval('public.order_number_seq'),
  user_id             uuid not null references auth.users(id) on delete restrict,
  status              public.order_status not null default 'pending',
  pickup_time         text not null,
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  discount            numeric(10,2) not null default 0 check (discount >= 0),
  delivery_fee        numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total               numeric(10,2) not null check (total >= 0),
  promo_code          text,
  reward_label        text,
  customer_name       text,
  customer_phone      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_order_number_unique unique (order_number)
);

create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  product_id          uuid references public.products(id) on delete set null,
  title               text not null,
  quantity            int not null check (quantity > 0),
  unit_price          numeric(10,2) not null check (unit_price >= 0),
  base_price          numeric(10,2) not null check (base_price >= 0),
  options             jsonb not null default '[]'::jsonb,
  applied_reward_id   uuid references public.user_rewards(id) on delete set null,
  reward_label        text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists idx_orders_user_created
  on public.orders (user_id, created_at desc);

create index if not exists idx_orders_status_created
  on public.orders (status, created_at desc);

create index if not exists idx_order_items_order
  on public.order_items (order_id, sort_order);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$ begin
  create policy "orders_select_own" on public.orders
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "order_items_select_own" on public.order_items
    for select using (
      exists (
        select 1 from public.orders o
        where o.id = order_id and o.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

-- Dev/admin: full access via anon API (tighten before production)
do $$ begin
  create policy "dev_all_orders" on public.orders
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "dev_all_order_items" on public.order_items
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create or replace function public.touch_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on public.orders;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.touch_orders_updated_at();

-- Place order atomically (customer app)
create or replace function public.create_order(
  p_pickup_time text,
  p_discount numeric default 0,
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
  v_total numeric(10,2);
  v_item jsonb;
  v_sort int := 0;
  v_customer_name text;
  v_customer_phone text;
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

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal + (
      (v_item->>'unit_price')::numeric * (v_item->>'quantity')::int
    );
  end loop;

  v_delivery_fee := case when v_subtotal > 200 then 0 else 25 end;
  v_total := greatest(0, v_subtotal - coalesce(p_discount, 0) + v_delivery_fee);

  select p.full_name, p.phone
  into v_customer_name, v_customer_phone
  from public.profiles p
  where p.id = v_user_id;

  insert into public.orders (
    user_id,
    pickup_time,
    subtotal,
    discount,
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
    coalesce(p_discount, 0),
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

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'status', 'pending',
    'pickup_time', trim(p_pickup_time),
    'subtotal', v_subtotal,
    'discount', coalesce(p_discount, 0),
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'promo_code', nullif(trim(p_promo_code), ''),
    'reward_label', nullif(trim(p_reward_label), ''),
    'created_at', now()
  );
end;
$$;

grant execute on function public.create_order(text, numeric, text, text, jsonb) to authenticated;

-- Next: run migration-points.sql for PuffPoints redeem at checkout + earn on completion.
