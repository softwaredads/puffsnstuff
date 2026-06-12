export type StampQualifyType = "overall" | "category" | "product";

export interface StampProgram {
  id: string;
  name: string;
  is_active: boolean;
  stamps_required: number;
  qualify_type: StampQualifyType;
  qualify_category_id: string | null;
  qualify_product_id: string | null;
  reward_product_id: string;
  created_at: string;
  updated_at: string;
  qualify_category?: { id: string; name: string } | null;
  qualify_product?: { id: string; name: string } | null;
  reward_product?: { id: string; name: string } | null;
}

export interface StampProgramDraft {
  name: string;
  is_active: boolean;
  stamps_required: number;
  qualify_type: StampQualifyType;
  qualify_category_id: string | null;
  qualify_product_id: string | null;
  reward_product_id: string;
}
