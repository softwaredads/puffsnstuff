-- Remove dev policies that expose one user's data to all users.
-- Run in Supabase SQL Editor after other migrations.
-- Admin panel uses SUPABASE_SERVICE_ROLE_KEY (server-only) for cross-user reads.

drop policy if exists "dev_all_orders" on public.orders;
drop policy if exists "dev_all_order_items" on public.order_items;
drop policy if exists "dev_all_order_events" on public.order_events;

drop policy if exists "dev_all_profiles" on public.profiles;
drop policy if exists "dev_all_user_favorites" on public.user_favorites;

drop policy if exists "dev_all_spin_history" on public.spin_history;

drop policy if exists "dev_all_stamp_orders_counted" on public.stamp_orders_counted;
drop policy if exists "dev_all_user_stamp_progress" on public.user_stamp_progress;
drop policy if exists "dev_all_stamp_history" on public.stamp_history;
