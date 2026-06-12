import { fetchOrderById, updateOrderStatus } from "@/lib/orders";
import type { OrderStatusUpdate } from "@/types/orders";
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
    const order = await fetchOrderById(id);
    return jsonResponse({ data: order });
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
    const body = (await request.json()) as OrderStatusUpdate;

    if (!body.status) {
      throw new Error("Status is required");
    }

    const order = await updateOrderStatus(id, body.status);
    return jsonResponse({ data: order });
  } catch (error) {
    return handleApiError(error);
  }
}
