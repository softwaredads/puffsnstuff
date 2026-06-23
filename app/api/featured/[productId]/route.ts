import { removeFeaturedProduct, fetchFeaturedAdmin } from "@/lib/featured";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    await removeFeaturedProduct(productId);
    const rows = await fetchFeaturedAdmin();
    return jsonResponse({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
