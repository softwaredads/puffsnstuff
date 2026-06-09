import { getSupabase } from "@/lib/supabase";
import type {
  Category,
  DisplayGroup,
  GroupDraft,
  GroupTemplate,
  Product,
} from "@/types/menu";

const PRODUCT_SELECT = `
  id,
  name,
  description,
  image_url,
  base_price,
  is_active,
  created_at,
  categories ( id, name ),
  product_group_templates (
    group_templates (
      id,
      name,
      selection_type,
      is_required,
      is_active,
      template_options ( id, name, price )
    )
  ),
  customization_groups (
    id,
    name,
    selection_type,
    is_required,
    customization_options ( id, name, price )
  )
`;

export async function fetchCategories(): Promise<Category[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export interface CreateProductInput {
  categoryMode: "existing" | "new";
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  selectedTemplateIds: string[];
  groups: GroupDraft[];
}

export async function createProductWithCustomizations(
  input: CreateProductInput
): Promise<Product> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  let categoryId = input.categoryId;

  if (input.categoryMode === "new") {
    const trimmed = input.categoryName.trim();
    if (!trimmed) throw new Error("Category name is required");

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .insert({ name: trimmed })
      .select("id")
      .single();

    if (categoryError) throw categoryError;
    categoryId = category.id;
  }

  if (!categoryId) throw new Error("Please select or create a category");

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      category_id: categoryId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      image_url: input.imageUrl.trim() || null,
      base_price: input.basePrice,
    })
    .select("id")
    .single();

  if (productError) throw productError;

  if (input.selectedTemplateIds.length > 0) {
    const { error: linkError } = await supabase
      .from("product_group_templates")
      .insert(
        input.selectedTemplateIds.map((templateId) => ({
          product_id: product.id,
          template_id: templateId,
        }))
      );

    if (linkError) throw linkError;
  }

  for (const group of input.groups) {
    const groupName = group.name.trim();
    if (!groupName) continue;

    const validOptions = group.options.filter((o) => o.name.trim());
    if (validOptions.length === 0) continue;

    const { data: insertedGroup, error: groupError } = await supabase
      .from("customization_groups")
      .insert({
        product_id: product.id,
        name: groupName,
        selection_type: group.selection_type,
        is_required: group.is_required,
      })
      .select("id")
      .single();

    if (groupError) throw groupError;

    const { error: optionsError } = await supabase
      .from("customization_options")
      .insert(
        validOptions.map((option) => ({
          group_id: insertedGroup.id,
          name: option.name.trim(),
          price: Number(option.price) || 0,
        }))
      );

    if (optionsError) throw optionsError;
  }

  const { data: fullProduct, error: fetchError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", product.id)
    .single();

  if (fetchError) throw fetchError;
  return fullProduct as unknown as Product;
}

export function getProductDisplayGroups(product: Product): DisplayGroup[] {
  const templateGroups: DisplayGroup[] = (
    product.product_group_templates ?? []
  )
    .map((link) => link.group_templates)
    .filter(Boolean)
    .map((template) => ({
      id: template.id,
      name: template.name,
      selection_type: template.selection_type,
      is_required: template.is_required,
      source: "template" as const,
      options: template.template_options ?? [],
    }));

  const customGroups: DisplayGroup[] = (product.customization_groups ?? []).map(
    (group) => ({
      id: group.id,
      name: group.name,
      selection_type: group.selection_type,
      is_required: group.is_required,
      source: "custom" as const,
      options: group.customization_options ?? [],
    })
  );

  return [...templateGroups, ...customGroups];
}

export function formatPrice(amount: number): string {
  return `${amount.toFixed(0)} kr`;
}

function sumGroupPrices(groups: GroupDraft[]): number {
  let total = 0;

  for (const group of groups) {
    const priced = group.options
      .filter((o) => o.name.trim())
      .map((o) => Number(o.price) || 0);

    if (group.selection_type === "single" && priced.length > 0) {
      total += Math.min(...priced);
    } else {
      total += priced.reduce((sum, p) => sum + p, 0);
    }
  }

  return total;
}

export function calculateExampleTotal(
  basePrice: number,
  groups: GroupDraft[]
): number {
  return basePrice + sumGroupPrices(groups);
}

export function calculateExampleTotalHybrid(
  basePrice: number,
  templates: GroupTemplate[],
  selectedTemplateIds: string[],
  customGroups: GroupDraft[]
): number {
  const selectedTemplates = templates.filter((t) =>
    selectedTemplateIds.includes(t.id)
  );
  const templateAsDrafts = selectedTemplates.map((t) => ({
    key: t.id,
    name: t.name,
    selection_type: t.selection_type,
    is_required: t.is_required,
    options: (t.template_options ?? []).map((o) => ({
      key: o.id,
      name: o.name,
      price: String(o.price),
    })),
  }));

  return basePrice + sumGroupPrices([...templateAsDrafts, ...customGroups]);
}
