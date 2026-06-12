import { deleteSpinPrize, updateSpinPrize } from "@/lib/spin";
import type { SpinPrizeDraft } from "@/types/spin";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<SpinPrizeDraft>;
    const prize = await updateSpinPrize(id, body);
    return jsonResponse({ data: prize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSpinPrize(id);
    return jsonResponse({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
