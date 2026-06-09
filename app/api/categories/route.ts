import { fetchCategories } from "@/lib/menu";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const categories = await fetchCategories();
    return jsonResponse({ data: categories });
  } catch (error) {
    return handleApiError(error);
  }
}
