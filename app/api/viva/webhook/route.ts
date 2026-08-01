import { getSupabaseAdmin } from "@/lib/supabase";
import { getVivaAccessToken } from "@/lib/viva";

type VivaWebhookBody = {
  EventTypeId?: number;
  eventTypeId?: number;
  EventData?: Record<string, unknown>;
  eventData?: Record<string, unknown>;
};

function value<T>(object: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (object[key] !== undefined) return object[key] as T;
  }
  return undefined;
}

export async function GET() {
  const keyUrl = process.env.VIVA_WEBHOOK_KEY_URL;
  const merchantId = process.env.VIVA_MERCHANT_ID;
  const apiKey = process.env.VIVA_API_KEY;

  if (!keyUrl || !merchantId || !apiKey) {
    return Response.json(
      { error: "Viva webhook verification is not configured." },
      { status: 500 },
    );
  }

  const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString("base64");
  const response = await fetch(keyUrl, {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
  });
  const data = await response.json();

  return Response.json(data, { status: response.status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VivaWebhookBody;
    const eventTypeId = body.EventTypeId ?? body.eventTypeId;

    // Transaction Payment Created
    if (eventTypeId !== 1796) return Response.json({ received: true });

    const eventData = body.EventData ?? body.eventData ?? {};
    const transactionId = value<string>(eventData, "TransactionId", "transactionId");
    if (!transactionId) {
      return Response.json({ error: "Transaction ID is missing." }, { status: 400 });
    }

    const transactionsUrl = process.env.VIVA_ORDERS_URL?.replace(/\/orders\/?$/, "/transactions");
    if (!transactionsUrl) {
      return Response.json({ error: "Viva API is not configured." }, { status: 500 });
    }

    const { access_token: accessToken } = await getVivaAccessToken();
    const vivaResponse = await fetch(`${transactionsUrl}/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const transaction = (await vivaResponse.json()) as Record<string, unknown>;

    if (!vivaResponse.ok) {
      return Response.json({ error: "Could not verify the Viva transaction." }, { status: 502 });
    }

    const orderCode = value<number | string>(transaction, "orderCode", "OrderCode");
    const statusId = value<string>(transaction, "statusId", "StatusId");
    const amount = Number(value<number | string>(transaction, "amount", "Amount"));
    if (!orderCode || statusId !== "F" || !Number.isFinite(amount)) {
      return Response.json({ error: "Payment is not complete." }, { status: 409 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json({ error: "Database is not configured." }, { status: 500 });
    }

    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, total, payment_status")
      .eq("viva_order_code", String(orderCode))
      .single();

    if (findError || !order) {
      return Response.json({ error: "Matching order was not found." }, { status: 404 });
    }

    if (Math.round(Number(order.total) * 100) !== Math.round(amount * 100)) {
      return Response.json({ error: "Payment amount does not match." }, { status: 409 });
    }

    if (order.payment_status !== "paid") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          viva_transaction_id: transactionId,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) throw updateError;
    }

    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
