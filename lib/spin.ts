import { getSupabase } from "@/lib/supabase";
import type { SpinPrize, SpinPrizeDraft } from "@/types/spin";

const PRIZE_SELECT = `
  id,
  label,
  prize_type,
  points_value,
  gift_kind,
  product_id,
  category_id,
  group_template_id,
  template_option_id,
  customization_group_id,
  customization_option_id,
  max_option_price_kr,
  credit_amount_kr,
  percent_value,
  covers_base_only,
  color,
  weight,
  sort_order,
  is_active,
  created_at,
  products ( id, name ),
  categories ( id, name ),
  group_templates ( id, name ),
  template_options ( id, name, price )
`;

function normalizePrize(row: Record<string, unknown>): SpinPrize {
  return row as unknown as SpinPrize;
}

function validateDraft(draft: SpinPrizeDraft): SpinPrizeDraft {
  const label = draft.label.trim();
  if (!label) throw new Error("Prize label is required");
  if (draft.weight <= 0) throw new Error("Weight must be greater than 0");

  if (draft.prize_type === "points" && draft.points_value <= 0) {
    throw new Error("Points prizes need a value greater than 0");
  }

  if (draft.prize_type === "gift") {
    if (!draft.gift_kind) throw new Error("Select a gift type");

    if (draft.gift_kind === "free_product" && !draft.product_id) {
      throw new Error("Select a product for this gift");
    }

    if (draft.gift_kind === "free_option") {
      const hasTemplate = draft.group_template_id || draft.customization_group_id;
      if (!hasTemplate) {
        throw new Error("Select a group template or customization group");
      }
    }

    if (draft.gift_kind === "credit") {
      if (!draft.credit_amount_kr || draft.credit_amount_kr <= 0) {
        throw new Error("Credit gifts need an amount greater than 0");
      }
    }

    if (draft.gift_kind === "percent_off") {
      if (!draft.percent_value || draft.percent_value < 1 || draft.percent_value > 100) {
        throw new Error("Enter a discount between 1 and 100%");
      }
      if (draft.percent_target === "category" && !draft.category_id) {
        throw new Error("Select a category for this discount");
      }
      if (draft.percent_target === "product" && !draft.product_id) {
        throw new Error("Select a product for this discount");
      }
    }
  }

  const isPercentProduct =
    draft.gift_kind === "percent_off" && draft.percent_target === "product";

  return {
    ...draft,
    label,
    points_value: draft.prize_type === "points" ? draft.points_value : 0,
    gift_kind: draft.prize_type === "gift" ? draft.gift_kind : null,
    product_id:
      draft.gift_kind === "free_product" || isPercentProduct
        ? draft.product_id
        : null,
    category_id:
      draft.gift_kind === "percent_off" && draft.percent_target === "category"
        ? draft.category_id
        : null,
    group_template_id:
      draft.gift_kind === "free_option" ? draft.group_template_id : null,
    template_option_id:
      draft.gift_kind === "free_option" ? draft.template_option_id : null,
    customization_group_id:
      draft.gift_kind === "free_option" ? draft.customization_group_id : null,
    customization_option_id:
      draft.gift_kind === "free_option" ? draft.customization_option_id : null,
    max_option_price_kr:
      draft.gift_kind === "free_option" ? draft.max_option_price_kr : null,
    credit_amount_kr: draft.gift_kind === "credit" ? draft.credit_amount_kr : null,
    percent_value: draft.gift_kind === "percent_off" ? draft.percent_value : null,
  };
}

function toRow(draft: SpinPrizeDraft) {
  const v = validateDraft(draft);
  return {
    label: v.label,
    prize_type: v.prize_type,
    points_value: v.points_value,
    gift_kind: v.gift_kind,
    product_id: v.product_id,
    category_id: v.category_id,
    group_template_id: v.group_template_id,
    template_option_id: v.template_option_id,
    customization_group_id: v.customization_group_id,
    customization_option_id: v.customization_option_id,
    max_option_price_kr: v.max_option_price_kr,
    credit_amount_kr: v.credit_amount_kr,
    percent_value: v.percent_value,
    covers_base_only: v.covers_base_only,
    color: v.color,
    weight: v.weight,
    sort_order: v.sort_order,
    is_active: v.is_active,
  };
}

export async function fetchSpinPrizes(): Promise<SpinPrize[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("spin_prizes")
    .select(PRIZE_SELECT)
    .order("sort_order")
    .order("created_at");

  if (error) throw error;
  return (data ?? []).map((row) => normalizePrize(row as Record<string, unknown>));
}

export async function createSpinPrize(draft: SpinPrizeDraft): Promise<SpinPrize> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("spin_prizes")
    .insert(toRow(draft))
    .select(PRIZE_SELECT)
    .single();

  if (error) throw error;
  return normalizePrize(data as Record<string, unknown>);
}

export async function updateSpinPrize(
  id: string,
  draft: Partial<SpinPrizeDraft>
): Promise<SpinPrize> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const patch: Record<string, unknown> = {};
  if (draft.label !== undefined) patch.label = draft.label.trim();
  if (draft.prize_type !== undefined) patch.prize_type = draft.prize_type;
  if (draft.points_value !== undefined) patch.points_value = draft.points_value;
  if (draft.gift_kind !== undefined) patch.gift_kind = draft.gift_kind;
  if (draft.product_id !== undefined) patch.product_id = draft.product_id;
  if (draft.category_id !== undefined) patch.category_id = draft.category_id;
  if (draft.group_template_id !== undefined) {
    patch.group_template_id = draft.group_template_id;
  }
  if (draft.template_option_id !== undefined) {
    patch.template_option_id = draft.template_option_id;
  }
  if (draft.customization_group_id !== undefined) {
    patch.customization_group_id = draft.customization_group_id;
  }
  if (draft.customization_option_id !== undefined) {
    patch.customization_option_id = draft.customization_option_id;
  }
  if (draft.max_option_price_kr !== undefined) {
    patch.max_option_price_kr = draft.max_option_price_kr;
  }
  if (draft.credit_amount_kr !== undefined) {
    patch.credit_amount_kr = draft.credit_amount_kr;
  }
  if (draft.percent_value !== undefined) patch.percent_value = draft.percent_value;
  if (draft.covers_base_only !== undefined) {
    patch.covers_base_only = draft.covers_base_only;
  }
  if (draft.color !== undefined) patch.color = draft.color;
  if (draft.weight !== undefined) patch.weight = draft.weight;
  if (draft.sort_order !== undefined) patch.sort_order = draft.sort_order;
  if (draft.is_active !== undefined) patch.is_active = draft.is_active;

  const { data, error } = await supabase
    .from("spin_prizes")
    .update(patch)
    .eq("id", id)
    .select(PRIZE_SELECT)
    .single();

  if (error) throw error;
  return normalizePrize(data as Record<string, unknown>);
}

export type DeleteSpinPrizeResult =
  | { action: "deleted" }
  | { action: "deactivated"; prize: SpinPrize };

function isForeignKeyViolation(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "23503" ||
    message.includes("foreign key") ||
    message.includes("spin_history")
  );
}

export async function deleteSpinPrize(
  id: string
): Promise<DeleteSpinPrizeResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("spin_prizes").delete().eq("id", id);
  if (!error) return { action: "deleted" };

  if (isForeignKeyViolation(error)) {
    const prize = await updateSpinPrize(id, { is_active: false });
    return { action: "deactivated", prize };
  }

  throw error;
}
