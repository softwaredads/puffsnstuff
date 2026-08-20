import { deleteCategory, updateCategory, type CategoryDraft } from "@/lib/menu";
import { parseLangParam } from "@/lib/i18n/resolveName";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

interface CategoryRouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(
  request: Request,
  { params }: CategoryRouteContext
) {
  try {
    const { id } = await params;
    const lang = parseLangParam(new URL(request.url).searchParams.get("lang"));
    const body = (await request.json()) as CategoryDraft;
    const category = await updateCategory(id, body, lang);
    return jsonResponse({ data: category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: CategoryRouteContext
) {
  try {
    const { id } = await params;
    const category = await deleteCategory(id);
    return jsonResponse({ data: category });
  } catch (error) {
    return handleApiError(error);
  }
}
