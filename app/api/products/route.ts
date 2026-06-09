import {
  createProductWithCustomizations,
  fetchProducts,
  type CreateProductInput,
} from "@/lib/menu";
import {
  errorResponse,
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const products = await fetchProducts();
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
