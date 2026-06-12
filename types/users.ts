export interface AdminUser {
  id: string;
  phone: string | null;
  full_name: string | null;
  email: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBlockUpdate {
  is_blocked: boolean;
}
