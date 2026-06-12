import { setUserBlocked } from "@/lib/users";
import type { UserBlockUpdate } from "@/types/users";
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
    const body = (await request.json()) as UserBlockUpdate;

    if (typeof body.is_blocked !== "boolean") {
      throw new Error("is_blocked is required");
    }

    const user = await setUserBlocked(id, body.is_blocked);
    return jsonResponse({ data: user });
  } catch (error) {
    return handleApiError(error);
  }
}
