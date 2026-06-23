import {
  addFeaturedProduct,
  fetchFeaturedAdmin,
  fetchFeaturedProducts,
  parseLangParam,
  reorderFeaturedProducts,
} from "@/lib/featured";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const admin = url.searchParams.get("admin") === "1";

    if (admin) {
      const rows = await fetchFeaturedAdmin();
      return jsonResponse({ data: rows });
    }

    const lang = parseLangParam(url.searchParams.get("lang"));
    const products = await fetchFeaturedProducts(lang);
    return jsonResponse({ data: products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { product_id?: string };
    if (!body.product_id) throw new Error("product_id is required");

    await addFeaturedProduct(body.product_id);
    const rows = await fetchFeaturedAdmin();
    return jsonResponse({ data: rows }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { product_ids?: string[] };
    if (!body.product_ids || !Array.isArray(body.product_ids)) {
      throw new Error("product_ids array is required");
    }

    await reorderFeaturedProducts(body.product_ids);
    const rows = await fetchFeaturedAdmin();
    return jsonResponse({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
