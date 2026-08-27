-- Stamp card reward: fixed product OR any one product from a category.
-- Run after migration-stamp-card.sql

alter table public.stamp_programs
  alter column reward_product_id drop not null;

alter table public.stamp_programs
  add column if not exists reward_category_id uuid
    references public.categories(id) on delete restrict;

alter table public.stamp_programs
  drop constraint if exists stamp_programs_reward_target_chk;

alter table public.stamp_programs
  add constraint stamp_programs_reward_target_chk
  check (
    (reward_product_id is not null and reward_category_id is null)
    or (reward_product_id is null and reward_category_id is not null)
  );

create or replace function public.grant_stamp_card_reward(
  p_user_id uuid,
  p_program public.stamp_programs
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_name text;
  v_category_name text;
  v_reward_id uuid;
  v_label text;
  v_config jsonb;
begin
  if p_program.reward_product_id is not null then
    select name into v_product_name
    from public.products
    where id = p_program.reward_product_id;

    v_label := coalesce(p_program.name, 'Stamp card')
      || ' — Free '
      || coalesce(v_product_name, 'item');

    v_config := jsonb_build_object(
      'kind', 'free_product',
      'product_id', p_program.reward_product_id,
      'covers', 'base_only',
      'label', v_label
    );
  elsif p_program.reward_category_id is not null then
    select name into v_category_name
    from public.categories
    where id = p_program.reward_category_id;

    v_label := coalesce(p_program.name, 'Stamp card')
      || ' — Free item from '
      || coalesce(v_category_name, 'category');

    v_config := jsonb_build_object(
      'kind', 'free_product',
      'category_id', p_program.reward_category_id,
      'category_name', v_category_name,
      'covers', 'base_only',
      'label', v_label
    );
  else
    raise exception 'Stamp program has no reward product or category';
  end if;

  insert into public.user_rewards (
    user_id, source, label, gift_kind, gift_config
  )
  values (
    p_user_id,
    'stamp_card',
    v_label,
    'free_product',
    v_config
  )
  returning id into v_reward_id;

  return v_reward_id;
end;
$$;

create or replace function public.get_stamp_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_program public.stamp_programs;
  v_stamps int := 0;
  v_qualify_label text;
  v_reward_product_name text;
  v_reward_category_name text;
  v_category_name text;
  v_product_name text;
begin
  v_user_id := auth.uid();

  select * into v_program
  from public.stamp_programs
  where is_active = true
  order by updated_at desc
  limit 1;

  if v_program.id is null then
    return jsonb_build_object('active', false);
  end if;

  if v_user_id is not null then
    select coalesce(stamps_count, 0)
    into v_stamps
    from public.user_stamp_progress
    where user_id = v_user_id and program_id = v_program.id;
  end if;

  if v_program.reward_product_id is not null then
    select name into v_reward_product_name
    from public.products
    where id = v_program.reward_product_id;
  end if;

  if v_program.reward_category_id is not null then
    select name into v_reward_category_name
    from public.categories
    where id = v_program.reward_category_id;
  end if;

  if v_program.qualify_type = 'overall' then
    v_qualify_label := 'Any order';
  elsif v_program.qualify_type = 'category' then
    select name into v_category_name
    from public.categories
    where id = v_program.qualify_category_id;
    v_qualify_label := coalesce(v_category_name, 'Category') || ' items';
  else
    select name into v_product_name
    from public.products
    where id = v_program.qualify_product_id;
    v_qualify_label := coalesce(v_product_name, 'Product');
  end if;

  return jsonb_build_object(
    'active', true,
    'program_id', v_program.id,
    'name', v_program.name,
    'stamps_required', v_program.stamps_required,
    'stamps_current', coalesce(v_stamps, 0),
    'stamps_remaining', greatest(v_program.stamps_required - coalesce(v_stamps, 0), 0),
    'qualify_type', v_program.qualify_type,
    'qualify_label', v_qualify_label,
    'reward_product_name', v_reward_product_name,
    'reward_category_name', v_reward_category_name
  );
end;
$$;

grant execute on function public.get_stamp_status() to authenticated;
grant execute on function public.get_stamp_status() to anon;
