import { formatKr, orderFinancials } from "@/lib/orderFinancials";
import type { Order } from "@/types/orders";

export default function OrderFinancialBreakdown({ order }: { order: Order }) {
  const f = orderFinancials(order);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Payment breakdown
      </h4>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-600">Items subtotal</dt>
          <dd className="font-medium text-zinc-900">{formatKr(f.subtotal)}</dd>
        </div>

        {f.rewardDiscount > 0 && (
          <div className="flex justify-between gap-4 text-emerald-700">
            <dt>
              Gift discount
              {order.reward_label ? ` · ${order.reward_label}` : ""}
            </dt>
            <dd className="font-medium">−{formatKr(f.rewardDiscount)}</dd>
          </div>
        )}

        {f.pointsRedeemed > 0 && (
          <div className="flex justify-between gap-4 text-emerald-700">
            <dt>PuffPoints used · {f.pointsRedeemed} pts</dt>
            <dd className="font-medium">−{formatKr(f.pointsDiscount)}</dd>
          </div>
        )}

        <div className="flex justify-between gap-4 text-zinc-600">
          <dt>Pickup fee</dt>
          <dd className="font-medium text-zinc-900">
            {f.deliveryFee === 0 ? "Free" : formatKr(f.deliveryFee)}
          </dd>
        </div>

        <div className="border-t border-zinc-100 pt-2">
          <div className="flex justify-between gap-4 font-semibold text-zinc-900">
            <dt>Customer pays</dt>
            <dd className="text-indigo-700">{formatKr(f.total)}</dd>
          </div>
          {f.beforeDiscounts !== f.total && (
            <p className="mt-1 text-right text-xs text-zinc-500">
              Was {formatKr(f.beforeDiscounts)} before discounts
            </p>
          )}
        </div>

        {f.pointsAwarded > 0 && (
          <div className="flex justify-between gap-4 border-t border-dashed border-zinc-200 pt-2 text-indigo-700">
            <dt>PuffPoints earned (on pickup)</dt>
            <dd className="font-medium">+{f.pointsAwarded} pts</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
