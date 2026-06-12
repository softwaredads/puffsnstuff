-- Dev/testing only: spin again without daily limit
-- Run in Supabase SQL Editor when testing the mobile app

create or replace function public.perform_spin_dev()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
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
    values (v_user_id, v_prize.points_value, 'spin_win_dev', v_spin_id);

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

grant execute on function public.perform_spin_dev() to authenticated;
