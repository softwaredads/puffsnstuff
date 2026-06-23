import { getSupabase } from "@/lib/supabase";
import type {
  PickupLocation,
  PickupLocationDraft,
} from "@/types/pickup-locations";

const SELECT_COLUMNS =
  "id, name, address, open_time, close_time, slot_interval_minutes, created_at";

function normalizeTime(value: string, fallback: string): string {
  const trimmed = (value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return fallback;
  return trimmed;
}

export async function fetchPickupLocations(): Promise<PickupLocation[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("pickup_locations")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PickupLocation[];
}

export async function createPickupLocation(
  draft: PickupLocationDraft
): Promise<PickupLocation> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const name = draft.name.trim();
  const address = draft.address.trim();
  const openTime = normalizeTime(draft.open_time, "10:00");
  const closeTime = normalizeTime(draft.close_time, "21:00");
  const interval = Math.round(Number(draft.slot_interval_minutes));

  if (!name) throw new Error("Name is required");
  if (!address) throw new Error("Address is required");
  if (closeTime <= openTime) {
    throw new Error("Close time must be after open time");
  }
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error("Interval must be a positive number");
  }

  const { data, error } = await supabase
    .from("pickup_locations")
    .insert({
      name,
      address,
      open_time: openTime,
      close_time: closeTime,
      slot_interval_minutes: interval,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data as PickupLocation;
}
