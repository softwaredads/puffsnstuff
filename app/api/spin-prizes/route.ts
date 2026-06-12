import {
  createSpinPrize,
  fetchSpinPrizes,
} from "@/lib/spin";
import type { SpinPrizeDraft } from "@/types/spin";
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
    const prizes = await fetchSpinPrizes();
    return jsonResponse({ data: prizes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SpinPrizeDraft;
    const prize = await createSpinPrize(body);
    return jsonResponse({ data: prize }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
