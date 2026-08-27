export interface DayHours {
  weekday: number; // 0 = Sunday … 6 = Saturday
  is_closed: boolean;
  open_time: string; // HH:MM
  close_time: string; // HH:MM (if <= open_time → closes next day)
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  open_time: string;
  close_time: string;
  slot_interval_minutes: number;
  weekly_hours: DayHours[];
  created_at: string;
}

export interface PickupLocationDraft {
  name: string;
  address: string;
  open_time: string;
  close_time: string;
  slot_interval_minutes: number;
  weekly_hours?: DayHours[];
}
