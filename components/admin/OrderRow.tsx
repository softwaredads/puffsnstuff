"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { orderFinancials } from "@/lib/orderFinancials";
import OrderFinancialBreakdown from "@/components/admin/OrderFinancialBreakdown";
import OrderHistoryTimeline from "@/components/admin/OrderHistoryTimeline";
import { Badge, btnGhost } from "@/components/admin/ui";
import type { Order, OrderStatus } from "@/types/orders";

const ROW =
  "grid grid-cols-[minmax(0,0.55fr)_minmax(0,1.2fr)_minmax(0,0.65fr)_minmax(0,0.55fr)_minmax(0,0.65fr)_auto] items-center gap-3 px-4 py-2.5";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  completed: "Done",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "success" | "warning" | "muted"
> = {
  pending: "warning",
  ready: "success",
  completed: "default",
  cancelled: "muted",
};

const NEXT_ACTIONS: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  pending: [
    { status: "ready", label: "Ready" },
    { status: "cancelled", label: "Cancel" },
  ],
  ready: [
    { status: "completed", label: "Picked up" },
    { status: "cancelled", label: "Cancel" },
  ],
  completed: [],
  cancelled: [],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function customerLabel(order: Order) {
  const name = order.customer_name?.trim();
  const phone = order.customer_phone?.trim();
  if (name && phone) return `${name} · ${phone}`;
  return name || phone || "—";
}

export function OrderTableHeader() {
  return (
    <div
      className={`${ROW} border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500`}
    >
      <span>Order</span>
      <span>Customer</span>
      <span>Pickup</span>
      <span>Total</span>
      <span>Status</span>
      <span className="text-right">Actions</span>
    </div>
  );
}

export default function OrderRow({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = orderFinancials(order);
  const actions = NEXT_ACTIONS[order.status];

  useEffect(() => {
    if (!expanded || detail) return;
    setDetailLoading(true);
    apiGet<Order>(`${API.orders}/${order.id}`)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }, [expanded, detail, order.id]);

  const display = detail ?? order;

  const updateStatus = async (status: OrderStatus) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiPatch<Order>(`${API.orders}/${order.id}`, {
        status,
      });
      onUpdated(updated);
      setDetail(null);
      setDetailLoading(true);
      const fresh = await apiGet<Order>(`${API.orders}/${order.id}`);
      setDetail(fresh);
      onUpdated(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
      setDetailLoading(false);
    }
  };

  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <div
        className={`${ROW} cursor-pointer hover:bg-zinc-50/60`}
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="truncate text-sm font-medium text-zinc-900">
          #{order.order_number}
        </p>
        <p className="truncate text-sm text-zinc-600">{customerLabel(order)}</p>
        <p className="truncate text-sm text-zinc-600">{order.pickup_time}</p>
        <p className="truncate text-sm font-medium text-zinc-900">
          {summary.total.toFixed(0)} kr
        </p>
        <Badge variant={STATUS_VARIANT[order.status]}>
          {STATUS_LABELS[order.status]}
        </Badge>
        <div
          className="ml-auto flex shrink-0 items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy}
              className={`${btnGhost} px-2 py-1 text-xs`}
              onClick={() => updateStatus(action.status)}
            >
              {busy ? "…" : action.label}
            </button>
          ))}
          <button
            type="button"
            className={`${btnGhost} px-1.5 py-1 text-xs text-zinc-400`}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
          <p className="text-xs text-zinc-400">{formatDate(order.created_at)}</p>

          {detailLoading && !detail?.order_items ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              {display.order_items && display.order_items.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-zinc-700">
                  {display.order_items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span className="min-w-0 truncate">
                        {item.quantity}× {item.title}
                        {item.reward_label ? (
                          <span className="ml-1 text-xs text-indigo-600">
                            🎁 {item.reward_label}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-zinc-600">
                        {(item.unit_price * item.quantity).toFixed(0)} kr
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No line items</p>
              )}

              <OrderFinancialBreakdown order={display} />
              <OrderHistoryTimeline events={display.order_events ?? []} />
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
