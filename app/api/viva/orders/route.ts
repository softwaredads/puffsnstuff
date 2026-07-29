import { getVivaAccessToken } from "@/lib/viva";

type VivaOrderRequest = {
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
    const order: VivaOrderRequest = await request.json();

    if (!ordersUrl || !checkoutBaseUrl) {
      return Response.json(
        { error: "Viva order URLs are not configured." },
        { status: 500 },
      );
    }

    if (!Number.isInteger(order.amount) || order.amount <= 0) {
      return Response.json(
        { error: "Amount must be a positive integer in the smallest currency unit." },
        { status: 400 },
      );
    }

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
