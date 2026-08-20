import {
  createCategory,
  fetchCategories,
  type CategoryDraft,
} from "@/lib/menu";
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

export async function POST(request: Request) {
  try {
    const lang = parseLangParam(new URL(request.url).searchParams.get("lang"));
    const body = (await request.json()) as CategoryDraft;
    const category = await createCategory(body, lang);
    return jsonResponse({ data: category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
