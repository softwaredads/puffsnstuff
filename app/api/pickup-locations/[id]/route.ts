import {
  deletePickupLocation,
  updatePickupLocation,
} from "@/lib/pickup-locations";
import type { PickupLocationDraft } from "@/types/pickup-locations";
import {
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

interface LocationRouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function PATCH(
  request: Request,
  { params }: LocationRouteContext
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PickupLocationDraft;
    const location = await updatePickupLocation(id, body);
    return jsonResponse({ data: location });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: LocationRouteContext
) {
  try {
    const { id } = await params;
    const location = await deletePickupLocation(id);
    return jsonResponse({ data: location });
  } catch (error) {
    return handleApiError(error);
  }
}
