import { getSupabase } from "@/lib/supabase";
import type {
  DayHours,
  PickupLocation,
  PickupLocationDraft,
} from "@/types/pickup-locations";

const SELECT_COLUMNS =
  "id, name, address, open_time, close_time, slot_interval_minutes, weekly_hours, created_at";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function normalizeTime(value: string, fallback: string): string {
  const trimmed = (value ?? "").trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return fallback;
  return trimmed;
}

export function defaultWeeklyHours(
  openTime = "10:00",
  closeTime = "21:00"
): DayHours[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    is_closed: false,
    open_time: openTime,
    close_time: closeTime,
  }));
}

function normalizeWeeklyHours(
  input: DayHours[] | null | undefined,
  fallbackOpen: string,
  fallbackClose: string
): DayHours[] {
  const byDay = new Map<number, DayHours>();
  for (const row of input ?? []) {
    const weekday = Number(row.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    byDay.set(weekday, {
      weekday,
      is_closed: Boolean(row.is_closed),
      open_time: normalizeTime(row.open_time, fallbackOpen),
      close_time: normalizeTime(row.close_time, fallbackClose),
    });
  }

  return WEEKDAYS.map((weekday) => {
    const existing = byDay.get(weekday);
    if (existing) return existing;
    return {
      weekday,
      is_closed: false,
      open_time: fallbackOpen,
      close_time: fallbackClose,
    };
  });
}

function mapLocation(row: Record<string, unknown>): PickupLocation {
  const open = normalizeTime(String(row.open_time ?? "10:00"), "10:00");
  const close = normalizeTime(String(row.close_time ?? "21:00"), "21:00");
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    open_time: open,
    close_time: close,
    slot_interval_minutes: Number(row.slot_interval_minutes) || 15,
    weekly_hours: normalizeWeeklyHours(
      row.weekly_hours as DayHours[] | null,
      open,
      close
    ),
    created_at: String(row.created_at),
  };
}

function validateDraft(draft: PickupLocationDraft) {
  const name = draft.name.trim();
  const address = draft.address.trim();
  const openTime = normalizeTime(draft.open_time, "10:00");
  const closeTime = normalizeTime(draft.close_time, "21:00");
  const interval = Math.round(Number(draft.slot_interval_minutes));
  const weeklyHours = normalizeWeeklyHours(
    draft.weekly_hours,
    openTime,
    closeTime
  );

  if (!name) throw new Error("Name is required");
  if (!address) throw new Error("Address is required");
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error("Interval must be a positive number");
  }

  for (const day of weeklyHours) {
    if (day.is_closed) continue;
    if (day.open_time === day.close_time) {
      throw new Error("Open and close time cannot be the same");
    }
  }

  // Keep legacy columns in sync with Monday (or first open day) for older clients.
  const syncDay =
    weeklyHours.find((d) => d.weekday === 1 && !d.is_closed) ??
    weeklyHours.find((d) => !d.is_closed) ??
    weeklyHours[0];

  return {
    name,
    address,
    open_time: syncDay.open_time,
    close_time: syncDay.close_time,
    slot_interval_minutes: interval,
    weekly_hours: weeklyHours,
  };
}

export async function fetchPickupLocations(): Promise<PickupLocation[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("pickup_locations")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapLocation);
}

export async function createPickupLocation(
  draft: PickupLocationDraft
): Promise<PickupLocation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const payload = validateDraft(draft);
  const { data, error } = await supabase
    .from("pickup_locations")
    .insert(payload)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return mapLocation(data as Record<string, unknown>);
}

export async function updatePickupLocation(
  id: string,
  draft: PickupLocationDraft
): Promise<PickupLocation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const locationId = (id ?? "").trim();
  if (!locationId) throw new Error("Location id is required");

  const payload = validateDraft(draft);
  const { data, error } = await supabase
    .from("pickup_locations")
    .update(payload)
    .eq("id", locationId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return mapLocation(data as Record<string, unknown>);
}

export async function deletePickupLocation(id: string): Promise<PickupLocation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const locationId = (id ?? "").trim();
  if (!locationId) throw new Error("Location id is required");

  const { data, error } = await supabase
    .from("pickup_locations")
    .delete()
    .eq("id", locationId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return mapLocation(data as Record<string, unknown>);
}
