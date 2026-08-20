import { getSupabase } from "@/lib/supabase";
import { resolveName, type AppLang } from "@/lib/i18n/resolveName";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  CustomizationGroup,
  DisplayGroup,
  GroupDraft,
  GroupTemplate,
  Product,
  SelectionType,
} from "@/types/menu";

const PRODUCT_SELECT = `
  id,
  name,
  name_da,
  name_en,
  description,
  image_url,
  base_price,
  is_active,
  created_at,
  categories ( id, name, name_da, name_en ),
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

function localizeCategory(category: Category, lang: AppLang): Category {
  return {
    ...category,
    name: resolveName(category, lang),
  };
}

function localizeProduct(product: Product, lang: AppLang): Product {
  return {
    ...product,
    name: resolveName(product, lang),
    categories: product.categories
      ? {
          ...product.categories,
          name: resolveName(product.categories, lang),
        }
      : null,
  };
}

export async function fetchCategories(lang: AppLang = "da"): Promise<Category[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_da, name_en, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((category) =>
    localizeCategory(category as Category, lang)
  );
}

export type CategoryDraft = {
  name_da?: string;
  name_en?: string;
};

function validateCategoryDraft(input: CategoryDraft) {
  const nameEn = typeof input.name_en === "string" ? input.name_en.trim() : "";
  const nameDa = typeof input.name_da === "string" ? input.name_da.trim() : "";
  if (!nameEn && !nameDa) {
    throw new Error("Enter a category name");
  }
  return {
    name: nameEn || nameDa,
    name_en: nameEn || nameDa,
    name_da: nameDa || nameEn,
  };
}

export async function createCategory(
  input: CategoryDraft,
  lang: AppLang = "da"
): Promise<Category> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const payload = validateCategoryDraft(input);
  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id, name, name_da, name_en, is_active, created_at")
    .single();

  if (error) throw error;
  return localizeCategory(data as Category, lang);
}

export async function updateCategory(
  id: string,
  input: CategoryDraft,
  lang: AppLang = "da"
): Promise<Category> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const categoryId = trimmed(id);
  if (!categoryId) throw new Error("Category id is required");

  const payload = validateCategoryDraft(input);
  const { data, error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", categoryId)
    .select("id, name, name_da, name_en, is_active, created_at")
    .single();

  if (error) throw error;
  return localizeCategory(data as Category, lang);
}

/** Soft-delete so products that still reference the category stay valid. */
export async function deleteCategory(id: string): Promise<Category> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const categoryId = trimmed(id);
  if (!categoryId) throw new Error("Category id is required");

  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", categoryId)
    .select("id, name, name_da, name_en, is_active, created_at")
    .single();

  if (error) throw error;
  return data as Category;
}

export async function fetchProducts(lang: AppLang = "da"): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Product[]).map((product) =>
    localizeProduct(product, lang)
  );
}

export async function fetchProductById(
  id: string,
  lang: AppLang = "da"
): Promise<Product> {
  const productId = trimmed(id);
  if (!productId) throw new Error("Product id is required");

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .single();

  if (error) throw error;
  return localizeProduct(data as unknown as Product, lang);
}

export interface CreateProductInput {
  categoryMode: "existing" | "new";
  categoryId: string;
  categoryName: string;
  categoryNameDa: string;
  categoryNameEn: string;
  name: string;
  nameDa: string;
  nameEn: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  selectedTemplateIds: string[];
  groups: GroupDraft[];
}

interface ValidatedOption {
  key: string;
  name: string;
  price: number;
}

interface ValidatedGroup {
  key: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  options: ValidatedOption[];
}

interface ValidatedProductInput {
  categoryMode: "existing" | "new";
  categoryId: string;
  categoryNameDa: string;
  categoryNameEn: string;
  nameDa: string;
  nameEn: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  selectedTemplateIds: string[];
  groups: ValidatedGroup[];
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isSelectionType(value: unknown): value is SelectionType {
  return value === "single" || value === "multi";
}

function validateProductInput(
  input: CreateProductInput
): ValidatedProductInput {
  if (!input || typeof input !== "object") {
    throw new Error("Product data is required");
  }

  if (input.categoryMode !== "existing" && input.categoryMode !== "new") {
    throw new Error("Choose an existing or new category");
  }

  const categoryId = trimmed(input.categoryId);
  const legacyCategoryName = trimmed(input.categoryName);
  const enteredCategoryNameDa = trimmed(input.categoryNameDa);
  const enteredCategoryNameEn = trimmed(input.categoryNameEn);

  if (input.categoryMode === "existing" && !categoryId) {
    throw new Error("Please select a category");
  }

  if (
    input.categoryMode === "new" &&
    !legacyCategoryName &&
    !enteredCategoryNameDa &&
    !enteredCategoryNameEn
  ) {
    throw new Error("Category name is required");
  }

  const legacyProductName = trimmed(input.name);
  const enteredNameDa = trimmed(input.nameDa);
  const enteredNameEn = trimmed(input.nameEn);
  if (!legacyProductName && !enteredNameDa && !enteredNameEn) {
    throw new Error("Product name is required");
  }

  if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
    throw new Error("Base price must be a finite number of 0 or more");
  }

  if (!Array.isArray(input.selectedTemplateIds)) {
    throw new Error("Selected templates must be a list");
  }

  const selectedTemplateIds = input.selectedTemplateIds.map((id, index) => {
    const templateId = trimmed(id);
    if (!templateId) {
      throw new Error(`Selected template ${index + 1} is invalid`);
    }
    return templateId;
  });

  if (!Array.isArray(input.groups)) {
    throw new Error("Custom groups must be a list");
  }

  const groups = input.groups.map((group, groupIndex): ValidatedGroup => {
    const position = groupIndex + 1;
    if (!group || typeof group !== "object") {
      throw new Error(`Custom group ${position} is invalid`);
    }

    const groupName = trimmed(group.name);
    if (!groupName) {
      throw new Error(`Custom group ${position} needs a name`);
    }

    if (!isSelectionType(group.selection_type)) {
      throw new Error(
        `Custom group ${position} must use single or multi selection`
      );
    }

    if (typeof group.is_required !== "boolean") {
      throw new Error(`Custom group ${position} has an invalid required value`);
    }

    if (!Array.isArray(group.options) || group.options.length === 0) {
      throw new Error(`Custom group ${position} needs at least one option`);
    }

    const seenOptionKeys = new Set<string>();
    const options = group.options.map((option, optionIndex): ValidatedOption => {
      const optionPosition = optionIndex + 1;
      if (!option || typeof option !== "object") {
        throw new Error(
          `Custom group ${position}, option ${optionPosition} is invalid`
        );
      }

      const optionName = trimmed(option.name);
      if (!optionName) {
        throw new Error(
          `Custom group ${position}, option ${optionPosition} needs a name`
        );
      }

      if (typeof option.price !== "string" || !option.price.trim()) {
        throw new Error(
          `Custom group ${position}, option ${optionPosition} needs a price`
        );
      }

      const price = Number(option.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(
          `Custom group ${position}, option ${optionPosition} needs a finite price of 0 or more`
        );
      }

      const key = trimmed(option.key);
      if (key && seenOptionKeys.has(key)) {
        throw new Error(
          `Custom group ${position} contains the same option more than once`
        );
      }
      if (key) seenOptionKeys.add(key);

      return { key, name: optionName, price };
    });

    return {
      key: trimmed(group.key),
      name: groupName,
      selection_type: group.selection_type,
      is_required: group.is_required,
      options,
    };
  });

  const seenGroupKeys = new Set<string>();
  for (const group of groups) {
    if (group.key && seenGroupKeys.has(group.key)) {
      throw new Error("The same custom group was provided more than once");
    }
    if (group.key) seenGroupKeys.add(group.key);
  }

  return {
    categoryMode: input.categoryMode,
    categoryId,
    categoryNameDa:
      enteredCategoryNameDa || legacyCategoryName || enteredCategoryNameEn,
    categoryNameEn:
      enteredCategoryNameEn || legacyCategoryName || enteredCategoryNameDa,
    nameDa: enteredNameDa || legacyProductName || enteredNameEn,
    nameEn: enteredNameEn || legacyProductName || enteredNameDa,
    description: trimmed(input.description),
    imageUrl: trimmed(input.imageUrl),
    basePrice: input.basePrice,
    selectedTemplateIds: [...new Set(selectedTemplateIds)],
    groups,
  };
}

async function resolveCategoryId(
  supabase: SupabaseClient,
  input: ValidatedProductInput
): Promise<string> {
  if (input.categoryMode === "existing") return input.categoryId;

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      name: input.categoryNameEn,
      name_da: input.categoryNameDa,
      name_en: input.categoryNameEn,
    })
    .select("id")
    .single();

  if (error) throw error;
  return category.id;
}

async function insertCustomGroups(
  supabase: SupabaseClient,
  productId: string,
  groups: ValidatedGroup[]
) {
  for (const group of groups) {
    const { data: insertedGroup, error: groupError } = await supabase
      .from("customization_groups")
      .insert({
        product_id: productId,
        name: group.name,
        selection_type: group.selection_type,
        is_required: group.is_required,
      })
      .select("id")
      .single();

    if (groupError) throw groupError;

    const { error: optionsError } = await supabase
      .from("customization_options")
      .insert(
        group.options.map((option) => ({
          group_id: insertedGroup.id,
          name: option.name,
          price: option.price,
        }))
      );

    if (optionsError) throw optionsError;
  }
}

async function replaceTemplateLinks(
  supabase: SupabaseClient,
  productId: string,
  templateIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("product_group_templates")
    .delete()
    .eq("product_id", productId);

  if (deleteError) throw deleteError;

  if (templateIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("product_group_templates")
    .insert(
      templateIds.map((templateId) => ({
        product_id: productId,
        template_id: templateId,
      }))
    );

  if (insertError) throw insertError;
}

async function syncCustomGroups(
  supabase: SupabaseClient,
  productId: string,
  currentGroups: CustomizationGroup[],
  groups: ValidatedGroup[]
) {
  const currentById = new Map(currentGroups.map((group) => [group.id, group]));
  const retainedGroupIds = new Set<string>();

  for (const group of groups) {
    const currentGroup = currentById.get(group.key);
    if (!currentGroup) {
      await insertCustomGroups(supabase, productId, [group]);
      continue;
    }

    retainedGroupIds.add(currentGroup.id);
    const { error: groupError } = await supabase
      .from("customization_groups")
      .update({
        name: group.name,
        selection_type: group.selection_type,
        is_required: group.is_required,
      })
      .eq("id", currentGroup.id)
      .eq("product_id", productId);

    if (groupError) throw groupError;

    const currentOptionsById = new Map(
      (currentGroup.customization_options ?? []).map((option) => [
        option.id,
        option,
      ])
    );
    const retainedOptionIds = new Set<string>();

    for (const option of group.options) {
      const currentOption = currentOptionsById.get(option.key);
      if (!currentOption) {
        const { error } = await supabase.from("customization_options").insert({
          group_id: currentGroup.id,
          name: option.name,
          price: option.price,
        });
        if (error) throw error;
        continue;
      }

      retainedOptionIds.add(currentOption.id);
      const { error } = await supabase
        .from("customization_options")
        .update({ name: option.name, price: option.price })
        .eq("id", currentOption.id)
        .eq("group_id", currentGroup.id);
      if (error) throw error;
    }

    const removedOptionIds = [...currentOptionsById.keys()].filter(
      (id) => !retainedOptionIds.has(id)
    );
    if (removedOptionIds.length > 0) {
      const { error } = await supabase
        .from("customization_options")
        .delete()
        .in("id", removedOptionIds)
        .eq("group_id", currentGroup.id);
      if (error) throw error;
    }
  }

  const removedGroupIds = [...currentById.keys()].filter(
    (id) => !retainedGroupIds.has(id)
  );
  if (removedGroupIds.length > 0) {
    const { error } = await supabase
      .from("customization_groups")
      .delete()
      .in("id", removedGroupIds)
      .eq("product_id", productId);
    if (error) throw error;
  }
}

export async function createProductWithCustomizations(
  input: CreateProductInput
): Promise<Product> {
  const validated = validateProductInput(input);
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const categoryId = await resolveCategoryId(supabase, validated);

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      category_id: categoryId,
      name: validated.nameEn,
      name_da: validated.nameDa,
      name_en: validated.nameEn,
      description: validated.description || null,
      image_url: validated.imageUrl || null,
      base_price: validated.basePrice,
    })
    .select("id")
    .single();

  if (productError) throw productError;

  if (validated.selectedTemplateIds.length > 0) {
    const { error: linkError } = await supabase
      .from("product_group_templates")
      .insert(
        validated.selectedTemplateIds.map((templateId) => ({
          product_id: product.id,
          template_id: templateId,
        }))
      );

    if (linkError) throw linkError;
  }

  await insertCustomGroups(supabase, product.id, validated.groups);

  const { data: fullProduct, error: fetchError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", product.id)
    .single();

  if (fetchError) throw fetchError;
  return fullProduct as unknown as Product;
}

export async function updateProductWithCustomizations(
  id: string,
  input: CreateProductInput
): Promise<Product> {
  const productId = trimmed(id);
  if (!productId) throw new Error("Product id is required");
  const validated = validateProductInput(input);

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  // Read first so invalid product ids cannot leave behind a newly-created category.
  const currentProduct = await fetchProductById(productId);
  const categoryId = await resolveCategoryId(supabase, validated);

  const { error: productError } = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name: validated.nameEn,
      name_da: validated.nameDa,
      name_en: validated.nameEn,
      description: validated.description || null,
      image_url: validated.imageUrl || null,
      base_price: validated.basePrice,
    })
    .eq("id", productId);

  if (productError) throw productError;

  await replaceTemplateLinks(
    supabase,
    productId,
    validated.selectedTemplateIds
  );
  await syncCustomGroups(
    supabase,
    productId,
    currentProduct.customization_groups ?? [],
    validated.groups
  );

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .single();

  if (error) throw error;
  return data as unknown as Product;
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  const productId = trimmed(id);
  if (!productId) throw new Error("Product id is required");

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .select("id")
    .maybeSingle();

  if (error?.code === "23503") {
    throw new Error(
      "Product is used as a stamp-card reward. Change that program first."
    );
  }
  if (error) throw error;
  if (!data) throw new Error("Product not found");

  return { id: data.id };
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
