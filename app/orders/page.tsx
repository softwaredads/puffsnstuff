"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import OrderRow, { OrderTableHeader } from "@/components/admin/OrderRow";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Card } from "@/components/admin/ui";
import type { Order, OrderStatus } from "@/types/orders";

const FILTERS: Array<{ id: "all" | OrderStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  useEffect(() => {
    apiGet<Order[]>(API.orders)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <AdminShell>
      <PageHeader
        title="Orders"
        description="Incoming customer orders — update status as you prepare and hand off pickups."
      />

      {!loading && !error && pendingCount > 0 && (
        <p className="mb-4 text-sm font-medium text-amber-700">
          {pendingCount} order{pendingCount === 1 ? "" : "s"} waiting to be prepared
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === item.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <Card className="overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse border-b border-zinc-100 bg-zinc-100/40 last:border-b-0"
            />
          ))}
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load orders</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-3 text-xs text-red-500">
            Run supabase/migration-orders.sql in Supabase SQL Editor first.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No orders yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Orders placed in the app will appear here.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <OrderTableHeader />
          {filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onUpdated={(updated) =>
                setOrders((prev) =>
                  prev.map((o) => (o.id === updated.id ? updated : o))
                )
              }
            />
          ))}
        </Card>
      )}
    </AdminShell>
  );
}
