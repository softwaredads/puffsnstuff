-- User blocking for admin + app realtime logout
-- Run after migration-profiles.sql

alter table public.profiles
  add column if not exists is_blocked boolean not null default false;

alter table public.profiles
  add column if not exists blocked_at timestamptz;

create index if not exists idx_profiles_blocked
  on public.profiles (is_blocked, created_at desc);

-- Admin API access (dev — tighten before production)
do $$ begin
  create policy "dev_all_profiles" on public.profiles
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Realtime: instant logout when admin blocks a logged-in user
alter table public.profiles replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create or replace function public.set_profile_blocked(
  p_user_id uuid,
  p_blocked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  update public.profiles
  set
    is_blocked = p_blocked,
    blocked_at = case when p_blocked then now() else null end,
    updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'user_not_found';
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'is_blocked', v_profile.is_blocked,
    'blocked_at', v_profile.blocked_at
  );
end;
$$;

grant execute on function public.set_profile_blocked(uuid, boolean) to authenticated;
grant execute on function public.set_profile_blocked(uuid, boolean) to anon;
