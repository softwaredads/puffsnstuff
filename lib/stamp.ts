import { getSupabase } from "@/lib/supabase";
import type { StampProgram, StampProgramDraft } from "@/types/stamp";

const PROGRAM_SELECT = `
  id,
  name,
  is_active,
  stamps_required,
  qualify_type,
  qualify_category_id,
  qualify_product_id,
  reward_product_id,
  created_at,
  updated_at,
  qualify_category:categories!stamp_programs_qualify_category_id_fkey ( id, name ),
  qualify_product:products!stamp_programs_qualify_product_id_fkey ( id, name ),
  reward_product:products!stamp_programs_reward_product_id_fkey ( id, name )
`;

function normalizeProgram(row: Record<string, unknown>): StampProgram {
  const pick = (val: unknown) =>
    (Array.isArray(val) ? val[0] : val) as
      | { id: string; name: string }
      | null
      | undefined;
  return {
    id: row.id as string,
    name: row.name as string,
    is_active: row.is_active as boolean,
    stamps_required: row.stamps_required as number,
    qualify_type: row.qualify_type as StampProgram["qualify_type"],
    qualify_category_id: (row.qualify_category_id as string | null) ?? null,
    qualify_product_id: (row.qualify_product_id as string | null) ?? null,
    reward_product_id: row.reward_product_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    qualify_category: pick(row.qualify_category) ?? null,
    qualify_product: pick(row.qualify_product) ?? null,
    reward_product: pick(row.reward_product) ?? null,
  };
}

function validateDraft(draft: StampProgramDraft): StampProgramDraft {
  const name = draft.name.trim();
  if (!name) throw new Error("Program name is required");

  if (draft.stamps_required < 1 || draft.stamps_required > 20) {
    throw new Error("Stamps required must be between 1 and 20");
  }

  if (!draft.reward_product_id) {
    throw new Error("Select the free product customers earn");
  }

  if (draft.qualify_type === "category" && !draft.qualify_category_id) {
    throw new Error("Select a category for stamp eligibility");
  }

  if (draft.qualify_type === "product" && !draft.qualify_product_id) {
    throw new Error("Select a product for stamp eligibility");
  }

  return {
    ...draft,
    name,
    qualify_category_id:
      draft.qualify_type === "category" ? draft.qualify_category_id : null,
    qualify_product_id:
      draft.qualify_type === "product" ? draft.qualify_product_id : null,
  };
}

export async function fetchStampPrograms(): Promise<StampProgram[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("stamp_programs")
    .select(PROGRAM_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeProgram(row as Record<string, unknown>)
  );
}

export async function fetchStampProgramById(id: string): Promise<StampProgram> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("stamp_programs")
    .select(PROGRAM_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalizeProgram(data as Record<string, unknown>);
}

async function deactivateOtherPrograms(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  keepId?: string
) {
  let query = supabase
    .from("stamp_programs")
    .update({ is_active: false })
    .eq("is_active", true);

  if (keepId) {
    query = query.neq("id", keepId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function createStampProgram(
  draft: StampProgramDraft
): Promise<StampProgram> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const valid = validateDraft(draft);

  if (valid.is_active) {
    await deactivateOtherPrograms(supabase);
  }

  const { data, error } = await supabase
    .from("stamp_programs")
    .insert({
      name: valid.name,
      is_active: valid.is_active,
      stamps_required: valid.stamps_required,
      qualify_type: valid.qualify_type,
      qualify_category_id: valid.qualify_category_id,
      qualify_product_id: valid.qualify_product_id,
      reward_product_id: valid.reward_product_id,
    })
    .select(PROGRAM_SELECT)
    .single();

  if (error) throw error;
  return normalizeProgram(data as Record<string, unknown>);
}

export async function updateStampProgram(
  id: string,
  draft: Partial<StampProgramDraft>
): Promise<StampProgram> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const existing = await fetchStampProgramById(id);
  const merged: StampProgramDraft = {
    name: draft.name ?? existing.name,
    is_active: draft.is_active ?? existing.is_active,
    stamps_required: draft.stamps_required ?? existing.stamps_required,
    qualify_type: draft.qualify_type ?? existing.qualify_type,
    qualify_category_id:
      draft.qualify_category_id !== undefined
        ? draft.qualify_category_id
        : existing.qualify_category_id,
    qualify_product_id:
      draft.qualify_product_id !== undefined
        ? draft.qualify_product_id
        : existing.qualify_product_id,
    reward_product_id: draft.reward_product_id ?? existing.reward_product_id,
  };

  const valid = validateDraft(merged);

  if (valid.is_active) {
    await deactivateOtherPrograms(supabase, id);
  }

  const { data, error } = await supabase
    .from("stamp_programs")
    .update({
      name: valid.name,
      is_active: valid.is_active,
      stamps_required: valid.stamps_required,
      qualify_type: valid.qualify_type,
      qualify_category_id: valid.qualify_category_id,
      qualify_product_id: valid.qualify_product_id,
      reward_product_id: valid.reward_product_id,
    })
    .eq("id", id)
    .select(PROGRAM_SELECT)
    .single();

  if (error) throw error;
  return normalizeProgram(data as Record<string, unknown>);
}
