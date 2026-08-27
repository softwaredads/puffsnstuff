-- Per-location weekly opening hours (incl. overnight: close <= open => next day).
-- weekday: 0 = Sunday … 6 = Saturday (JS Date#getDay)

alter table public.pickup_locations
  add column if not exists weekly_hours jsonb;

-- Seed from existing open_time / close_time for all 7 days when empty.
update public.pickup_locations
set weekly_hours = (
  select jsonb_agg(
    jsonb_build_object(
      'weekday', d,
      'is_closed', false,
      'open_time', to_char(open_time, 'HH24:MI'),
      'close_time', to_char(close_time, 'HH24:MI')
    )
    order by d
  )
  from generate_series(0, 6) as d
)
where weekly_hours is null;
