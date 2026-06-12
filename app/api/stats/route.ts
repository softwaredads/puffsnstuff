import { fetchDashboardStats } from "@/lib/stats";
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
    const stats = await fetchDashboardStats();
    return jsonResponse({ data: stats });
  } catch (error) {
    return handleApiError(error);
  }
}
