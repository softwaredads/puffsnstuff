import {
  createPickupLocation,
  fetchPickupLocations,
} from "@/lib/pickup-locations";
import type { PickupLocationDraft } from "@/types/pickup-locations";
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
    const locations = await fetchPickupLocations();
    return jsonResponse({ data: locations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PickupLocationDraft;
    const location = await createPickupLocation(body);
    return jsonResponse({ data: location }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
