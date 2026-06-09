import {
  createGroupTemplate,
  fetchGroupTemplates,
} from "@/lib/templates";
import type { TemplateDraft } from "@/types/menu";
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
    const groups = await fetchGroupTemplates();
    return jsonResponse({ data: groups });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TemplateDraft;
    const group = await createGroupTemplate(body);
    return jsonResponse({ data: group }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
