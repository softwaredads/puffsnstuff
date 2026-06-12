export type SpinPrizeType = "points" | "gift" | "none";
export type GiftKind =
  | "free_product"
  | "free_option"
  | "credit"
  | "percent_off";

export interface SpinPrize {
  id: string;
  label: string;
  prize_type: SpinPrizeType;
  points_value: number;
  gift_kind: GiftKind | null;
  product_id: string | null;
  group_template_id: string | null;
  template_option_id: string | null;
  customization_group_id: string | null;
  customization_option_id: string | null;
  max_option_price_kr: number | null;
  credit_amount_kr: number | null;
  percent_value: number | null;
  category_id: string | null;
  covers_base_only: boolean;
  color: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  products?: { id: string; name: string } | null;
  categories?: { id: string; name: string } | null;
  group_templates?: { id: string; name: string } | null;
  template_options?: { id: string; name: string; price: number } | null;
}

export interface SpinPrizeDraft {
  label: string;
  prize_type: SpinPrizeType;
  points_value: number;
  gift_kind: GiftKind | null;
  product_id: string | null;
  group_template_id: string | null;
  template_option_id: string | null;
  customization_group_id: string | null;
  customization_option_id: string | null;
  max_option_price_kr: number | null;
  credit_amount_kr: number | null;
  percent_value: number | null;
  category_id: string | null;
  covers_base_only: boolean;
  color: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  percent_target?: "product" | "category";
}
