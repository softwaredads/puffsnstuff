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
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const name = draft.name.trim();
  if (!name) throw new Error("Template name is required");

  const validOptions = draft.options.filter((o) => o.name.trim());
  if (validOptions.length === 0) {
    throw new Error("Add at least one option to the template");
  }

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
    validOptions.map((option) => ({
      template_id: template.id,
      name: option.name.trim(),
      price: Number(option.price) || 0,
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
