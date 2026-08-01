-- Viva payment verification fields (run once in Supabase SQL Editor)

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists viva_order_code bigint,
  add column if not exists viva_transaction_id uuid,
  add column if not exists paid_at timestamptz;

do $$ begin
  alter table public.orders
    add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'paid'));
exception when duplicate_object then null;
end $$;

create unique index if not exists idx_orders_viva_order_code
  on public.orders (viva_order_code)
  where viva_order_code is not null;

create unique index if not exists idx_orders_viva_transaction_id
  on public.orders (viva_transaction_id)
  where viva_transaction_id is not null;

