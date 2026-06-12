-- User product favorites (Expo app)
-- Run in Supabase SQL Editor

create table if not exists public.user_favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_user_favorites_user
  on public.user_favorites (user_id, created_at desc);

alter table public.user_favorites enable row level security;

do $$ begin
  create policy "user_favorites_select_own" on public.user_favorites
    for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_favorites_insert_own" on public.user_favorites
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_favorites_delete_own" on public.user_favorites
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Dev/admin read (optional)
do $$ begin
  create policy "dev_all_user_favorites" on public.user_favorites
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create or replace function public.toggle_favorite(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_favorite boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception 'product_not_found';
  end if;

  if exists (
    select 1 from public.user_favorites
    where user_id = v_user_id and product_id = p_product_id
  ) then
    delete from public.user_favorites
    where user_id = v_user_id and product_id = p_product_id;
    v_is_favorite := false;
  else
    insert into public.user_favorites (user_id, product_id)
    values (v_user_id, p_product_id);
    v_is_favorite := true;
  end if;

  return jsonb_build_object(
    'product_id', p_product_id,
    'is_favorite', v_is_favorite
  );
end;
$$;

grant execute on function public.toggle_favorite(uuid) to authenticated;
