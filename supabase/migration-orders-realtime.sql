-- Enable realtime status updates for the mobile Orders screen
-- Run in Supabase SQL Editor after migration-orders.sql

alter table public.orders replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
