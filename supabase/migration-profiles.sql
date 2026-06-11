-- Run in Supabase SQL Editor after schema.sql
-- Customer profiles for Expo phone auth

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  create policy "profiles_select_own" on public.profiles
    for select using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles_insert_own" on public.profiles
    for insert with check (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles_update_own" on public.profiles
    for update using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
