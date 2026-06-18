import { getSupabaseAdmin } from "@/lib/supabase";
import type { AdminUser } from "@/types/users";

const USER_SELECT = `
  id,
  phone,
  full_name,
  email,
  is_blocked,
  blocked_at,
  created_at,
  updated_at
`;

export async function fetchUsers(limit = 200): Promise<AdminUser[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("profiles")
    .select(USER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function setUserBlocked(
  userId: string,
  isBlocked: boolean
): Promise<AdminUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.rpc("set_profile_blocked", {
    p_user_id: userId,
    p_blocked: isBlocked,
  });

  if (error) {
    if (error.message.includes("user_not_found")) {
      throw new Error("User not found");
    }
    throw error;
  }

  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select(USER_SELECT)
    .eq("id", userId)
    .single();

  if (fetchError) throw fetchError;
  return data as AdminUser;
}
