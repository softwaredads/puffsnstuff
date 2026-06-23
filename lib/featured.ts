import { getSupabase } from "@/lib/supabase";
import { parseLangParam, resolveName, type AppLang } from "@/lib/i18n/resolveName";
import type { Product } from "@/types/menu";

export const MAX_FEATURED = 8;

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
  categories ( id, name, name_da, name_en )
`;

export interface FeaturedRow {
  product_id: string;
  sort_order: number;
  products: Product | null;
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

export async function fetchFeaturedProducts(
  lang: AppLang = "da"
): Promise<Product[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("featured_products")
    .select(`sort_order, products (${PRODUCT_SELECT})`)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as FeaturedRow[])
    .map((row) => row.products)
    .filter((p): p is Product => Boolean(p?.is_active))
    .map((product) => localizeProduct(product, lang));
}

export async function fetchFeaturedAdmin(): Promise<FeaturedRow[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("featured_products")
    .select(`product_id, sort_order, products (${PRODUCT_SELECT})`)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as FeaturedRow[];
}

export async function addFeaturedProduct(productId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { count, error: countError } = await supabase
    .from("featured_products")
    .select("*", { count: "exact", head: true });

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_FEATURED) {
    throw new Error(`Maximum ${MAX_FEATURED} featured products allowed`);
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, is_active")
    .eq("id", productId)
    .single();

  if (productError) throw productError;
  if (!product.is_active) throw new Error("Product is not active");

  const { data: existing } = await supabase
    .from("featured_products")
    .select("product_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) throw new Error("Product is already featured");

  const { data: lastRow } = await supabase
    .from("featured_products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastRow?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from("featured_products")
    .insert({ product_id: productId, sort_order: nextOrder });

  if (error) throw error;
}

export async function removeFeaturedProduct(productId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("featured_products")
    .delete()
    .eq("product_id", productId);

  if (error) throw error;
}

export async function reorderFeaturedProducts(
  productIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  if (productIds.length > MAX_FEATURED) {
    throw new Error(`Maximum ${MAX_FEATURED} featured products allowed`);
  }

  for (let i = 0; i < productIds.length; i++) {
    const { error } = await supabase
      .from("featured_products")
      .update({ sort_order: i })
      .eq("product_id", productIds[i]);

    if (error) throw error;
  }
}

export { parseLangParam };
