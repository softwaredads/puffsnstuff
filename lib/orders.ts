import { getSupabaseAdmin } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/types/orders";

const ORDER_LIST_SELECT = `
  id,
  order_number,
  user_id,
  status,
  pickup_time,
  subtotal,
  discount,
  reward_discount,
  points_discount,
  points_redeemed,
  points_awarded,
  delivery_fee,
  total,
  promo_code,
  reward_label,
  customer_name,
  customer_phone,
  created_at,
  updated_at
`;

const ORDER_DETAIL_SELECT = `
  ${ORDER_LIST_SELECT},
  order_items (
    id,
    product_id,
    title,
    quantity,
    unit_price,
    base_price,
    options,
    applied_reward_id,
    reward_label,
    sort_order
  ),
  order_events (
    id,
    order_id,
    event_type,
    summary,
    details,
    created_at
  )
`;

function normalizeOrder(row: Record<string, unknown>): Order {
  const order = row as unknown as Order;
  if (order.order_items) {
    order.order_items.sort((a, b) => a.sort_order - b.sort_order);
  }
  if (order.order_events) {
    order.order_events.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  return order;
}

export async function fetchOrders(limit = 100): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => normalizeOrder(row as Record<string, unknown>));
}

export async function fetchOrderById(id: string): Promise<Order> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalizeOrder(data as Record<string, unknown>);
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const current = existing.status as OrderStatus;
  if (current === status) {
    return fetchOrderById(id);
  }

  const allowed = VALID_TRANSITIONS[current] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(`Cannot change status from ${current} to ${status}`);
  }

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  return fetchOrderById(id);
}
