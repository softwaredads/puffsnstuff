import { fetchOrders } from "@/lib/orders";
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
    const orders = await fetchOrders();
    return jsonResponse({ data: orders });
  } catch (error) {
    return handleApiError(error);
  }
}
