import { getSupabase } from "@/lib/supabase";
import type { GroupDraft, GroupTemplate, TemplateDraft } from "@/types/menu";

const TEMPLATE_SELECT = `
  id,
  name,
  selection_type,
  is_required,
  is_active,
  created_at,
  template_options ( id, name, price )
`;

export async function fetchGroupTemplates(): Promise<GroupTemplate[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("group_templates")
    .select(TEMPLATE_SELECT)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []) as unknown as GroupTemplate[];
}

export async function createGroupTemplate(
  draft: TemplateDraft
): Promise<GroupTemplate> {
  if (!draft || typeof draft !== "object") {
    throw new Error("Template data is required");
  }

  const name = typeof draft.name === "string" ? draft.name.trim() : "";
  if (!name) throw new Error("Template name is required");

  if (draft.selection_type !== "single" && draft.selection_type !== "multi") {
    throw new Error("Template must use single or multi selection");
  }

  if (typeof draft.is_required !== "boolean") {
    throw new Error("Template has an invalid required value");
  }

  if (!Array.isArray(draft.options) || draft.options.length === 0) {
    throw new Error("Add at least one option to the template");
  }

  const options = draft.options.map((option, index) => {
    if (!option || typeof option !== "object") {
      throw new Error(`Template option ${index + 1} is invalid`);
    }

    const optionName =
      typeof option.name === "string" ? option.name.trim() : "";
    if (!optionName) {
      throw new Error(`Template option ${index + 1} needs a name`);
    }

    if (typeof option.price !== "string" || !option.price.trim()) {
      throw new Error(`Template option ${index + 1} needs a price`);
    }

    const price = Number(option.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(
        `Template option ${index + 1} needs a finite price of 0 or more`
      );
    }

    return { name: optionName, price };
  });

  // Everything is validated before either the template or its options are written.
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: template, error: templateError } = await supabase
    .from("group_templates")
    .insert({
      name,
      selection_type: draft.selection_type,
      is_required: draft.is_required,
    })
    .select("id")
    .single();

  if (templateError) throw templateError;

  const { error: optionsError } = await supabase.from("template_options").insert(
    options.map((option) => ({
      template_id: template.id,
      name: option.name,
      price: option.price,
    }))
  );

  if (optionsError) throw optionsError;

  const { data, error } = await supabase
    .from("group_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", template.id)
    .single();

  if (error) throw error;
  return data as unknown as GroupTemplate;
}

export function templateToGroupDraft(template: GroupTemplate): GroupDraft {
  return {
    key: template.id,
    name: template.name,
    selection_type: template.selection_type,
    is_required: template.is_required,
    options: template.template_options.map((o) => ({
      key: o.id,
      name: o.name,
      price: String(o.price),
    })),
  };
}
