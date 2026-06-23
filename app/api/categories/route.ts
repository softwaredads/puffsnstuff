import { fetchCategories } from "@/lib/menu";
import { parseLangParam } from "@/lib/i18n/resolveName";
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
    const lang = parseLangParam(new URL(request.url).searchParams.get("lang"));
    const categories = await fetchCategories(lang);
    return jsonResponse({ data: categories });
  } catch (error) {
    return handleApiError(error);
  }
}
