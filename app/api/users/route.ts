import { fetchUsers } from "@/lib/users";
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
    const users = await fetchUsers();
    return jsonResponse({ data: users });
  } catch (error) {
    return handleApiError(error);
  }
}
