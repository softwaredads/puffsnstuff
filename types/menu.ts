export type SelectionType = "single" | "multi";

export interface Category {
  id: string;
  name: string;
  name_da?: string | null;
  name_en?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  customization_options: CustomizationOption[];
}

export interface GroupTemplate {
  id: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  template_options: CustomizationOption[];
}

export interface ProductTemplateLink {
  group_templates: GroupTemplate;
}

export interface Product {
  id: string;
  name: string;
  name_da?: string | null;
  name_en?: string | null;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_active: boolean;
  created_at: string;
  categories: Pick<Category, "id" | "name"> | null;
  customization_groups: CustomizationGroup[];
  product_group_templates: ProductTemplateLink[];
}

/** Unified shape for displaying template + custom groups together */
export interface DisplayGroup {
  id: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  source: "template" | "custom";
  options: CustomizationOption[];
}

export interface OptionDraft {
  key: string;
  name: string;
  price: string;
}

export interface GroupDraft {
  key: string;
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  options: OptionDraft[];
}

export interface TemplateDraft {
  name: string;
  selection_type: SelectionType;
  is_required: boolean;
  options: OptionDraft[];
}

export interface ProductDraft {
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
  basePrice: string;
  selectedTemplateIds: string[];
  groups: GroupDraft[];
}
