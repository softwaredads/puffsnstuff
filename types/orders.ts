export type OrderStatus = "pending" | "ready" | "completed" | "cancelled";

export type OrderEventType =
  | "order_placed"
  | "status_changed"
  | "points_awarded"
  | string;

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: OrderEventType;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  title: string;
  quantity: number;
  unit_price: number;
  base_price: number;
  options: Array<{
    groupId?: string;
    groupName?: string;
    optionId?: string;
    optionName?: string;
    price?: number;
  }>;
  applied_reward_id: string | null;
  reward_label: string | null;
  sort_order: number;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  status: OrderStatus;
  pickup_time: string;
  pickup_location?: string | null;
  subtotal: number;
  discount: number;
  reward_discount?: number;
  points_discount?: number;
  points_redeemed?: number;
  points_awarded?: number;
  delivery_fee: number;
  total: number;
  promo_code: string | null;
  reward_label: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_events?: OrderEvent[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}
