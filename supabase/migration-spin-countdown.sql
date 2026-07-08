-- Run in Supabase SQL Editor after migration-spin.sql
-- Adds `next_spin_at` to get_spin_status so the app can show a countdown
-- until the next free spin (the start of the next calendar day in Copenhagen).

create or replace function public.get_spin_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_today_start timestamptz;
  v_next_spin_at timestamptz;
  v_last_spin record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('can_spin', false, 'reason', 'not_authenticated');
  end if;

  v_today_start := date_trunc('day', now() at time zone 'Europe/Copenhagen')
    at time zone 'Europe/Copenhagen';
  v_next_spin_at := v_today_start + interval '1 day';

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
      'next_spin_at', v_next_spin_at,
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

grant execute on function public.get_spin_status() to authenticated;
