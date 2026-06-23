import {
  createProductWithCustomizations,
  fetchProducts,
  type CreateProductInput,
} from "@/lib/menu";
import { parseLangParam } from "@/lib/i18n/resolveName";
import {
  errorResponse,
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  try {
    const lang = parseLangParam(new URL(request.url).searchParams.get("lang"));
    const products = await fetchProducts(lang);
    return jsonResponse({ data: products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProductInput;
    const product = await createProductWithCustomizations(body);
    return jsonResponse({ data: product }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
