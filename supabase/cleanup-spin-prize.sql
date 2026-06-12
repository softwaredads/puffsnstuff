-- Dev only: fully remove a spin prize that has spin history
-- Replace the UUID below, then run in Supabase SQL Editor.

-- delete from public.spin_prizes where id = 'b6f7bd83-8402-4f8c-98cd-6e5e87efc849';

do $$
declare
  v_prize_id uuid := 'b6f7bd83-8402-4f8c-98cd-6e5e87efc849';
begin
  delete from public.spin_history where prize_id = v_prize_id;
  delete from public.spin_prizes where id = v_prize_id;
end $$;
