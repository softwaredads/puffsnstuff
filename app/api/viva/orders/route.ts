import { getVivaAccessToken } from "@/lib/viva";
import { getSupabaseAdmin } from "@/lib/supabase";

type VivaOrderRequest = {
  orderId?: string;
  amount: number;
  customerTrns?: string;
  customer?: {
    email?: string;
    fullName?: string;
  };
};

export async function POST(request: Request) {
  try {
    const ordersUrl = process.env.VIVA_ORDERS_URL;
    const checkoutBaseUrl = process.env.VIVA_CHECKOUT_URL;
    const requestBody: VivaOrderRequest = await request.json();

    if (!ordersUrl || !checkoutBaseUrl) {
      return Response.json(
        { error: "Viva order URLs are not configured." },
        { status: 500 },
      );
    }

    if (!requestBody.orderId) {
      return Response.json({ error: "Order ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json({ error: "Database is not configured." }, { status: 500 });
    }

    const { data: savedOrder, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total, viva_order_code, payment_status")
      .eq("id", requestBody.orderId)
      .single();

    if (orderError || !savedOrder) {
      return Response.json({ error: "Order was not found." }, { status: 404 });
    }

    if (savedOrder.payment_status === "paid") {
      return Response.json({ error: "Order is already paid." }, { status: 409 });
    }

    const expectedAmount = Math.round(Number(savedOrder.total) * 100);
    if (!Number.isInteger(expectedAmount) || expectedAmount <= 0) {
      return Response.json(
        { error: "Amount must be a positive integer in the smallest currency unit." },
        { status: 400 },
      );
    }

    if (savedOrder.viva_order_code) {
      const checkoutUrl = new URL(checkoutBaseUrl);
      checkoutUrl.searchParams.set("ref", String(savedOrder.viva_order_code));
      return Response.json({
        orderCode: Number(savedOrder.viva_order_code),
        checkoutUrl: checkoutUrl.toString(),
      });
    }

    const order = {
      amount: expectedAmount,
      customerTrns: `Puff N Stuff order #${savedOrder.order_number}`,
      customer: requestBody.customer,
    };

    const { access_token: accessToken } = await getVivaAccessToken();
    const response = await fetch(ordersUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    const { error: saveError } = await supabase
      .from("orders")
      .update({ viva_order_code: data.orderCode })
      .eq("id", savedOrder.id)
      .is("viva_order_code", null);

    if (saveError) {
      return Response.json(
        { error: "Could not save the Viva payment reference." },
        { status: 500 },
      );
    }

    const checkoutUrl = new URL(checkoutBaseUrl);
    checkoutUrl.searchParams.set("ref", String(data.orderCode));

    return Response.json({
      ...data,
      checkoutUrl: checkoutUrl.toString(),
    });
  } catch {
    return Response.json(
      { error: "Could not create the Viva payment order." },
      { status: 502 },
    );
  }
}
