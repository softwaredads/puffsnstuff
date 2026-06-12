import {
  createStampProgram,
  fetchStampPrograms,
} from "@/lib/stamp";
import type { StampProgramDraft } from "@/types/stamp";
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
    const programs = await fetchStampPrograms();
    return jsonResponse({ data: programs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StampProgramDraft;
    const program = await createStampProgram(body);
    return jsonResponse({ data: program }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
