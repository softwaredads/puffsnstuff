export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  open_time: string;
  close_time: string;
  slot_interval_minutes: number;
  created_at: string;
}

export interface PickupLocationDraft {
  name: string;
  address: string;
  open_time: string;
  close_time: string;
  slot_interval_minutes: number;
}
