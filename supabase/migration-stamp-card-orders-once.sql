-- Each order counts at most once per stamp program (never re-used on next card)
-- Run after migration-stamp-card.sql

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

-- Backfill from existing stamp history so old orders are not counted again
insert into public.stamp_orders_counted (program_id, order_id, user_id)
select distinct program_id, order_id, user_id
from public.stamp_history
where event_type = 'stamp_earned' and order_id is not null
on conflict do nothing;

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

    -- One stamp per order per program — never count the same order again
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
