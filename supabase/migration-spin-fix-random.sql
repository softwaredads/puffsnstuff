-- Fix: spin always returning the same prize
-- pick_weighted_spin_prize was STABLE so PostgreSQL could cache random() per session.
-- Run this in Supabase SQL Editor.

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
