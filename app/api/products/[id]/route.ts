import {
  deleteProduct,
  fetchProductById,
  updateProductWithCustomizations,
  type CreateProductInput,
} from "@/lib/menu";
import { parseLangParam } from "@/lib/i18n/resolveName";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

interface ProductRouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request, { params }: ProductRouteContext) {
  try {
    const { id } = await params;
    const lang = parseLangParam(new URL(request.url).searchParams.get("lang"));
    const product = await fetchProductById(id, lang);
    return jsonResponse({ data: product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: ProductRouteContext
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateProductInput;
    const product = await updateProductWithCustomizations(id, body);
    return jsonResponse({ data: product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: ProductRouteContext
) {
  try {
    const { id } = await params;
    const deletedProduct = await deleteProduct(id);
    return jsonResponse({ data: deletedProduct });
  } catch (error) {
    return handleApiError(error);
  }
}
