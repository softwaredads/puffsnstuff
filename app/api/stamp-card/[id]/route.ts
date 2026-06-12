import { fetchStampProgramById, updateStampProgram } from "@/lib/stamp";
import type { StampProgramDraft } from "@/types/stamp";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const program = await fetchStampProgramById(id);
    return jsonResponse({ data: program });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<StampProgramDraft>;
    const program = await updateStampProgram(id, body);
    return jsonResponse({ data: program });
  } catch (error) {
    return handleApiError(error);
  }
}
