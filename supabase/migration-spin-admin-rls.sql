-- Let admin API (anon + dev policies) read spin_history for management
-- Run in Supabase SQL Editor

do $$ begin
  create policy "dev_all_spin_history" on public.spin_history
    for all using (true) with check (true);
exception when duplicate_object then null;
end $$;
