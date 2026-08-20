"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import SpinPrizeCard from "@/components/admin/SpinPrizeCard";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { btnPrimary, Card } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { SpinPrize } from "@/types/spin";

type PrizeFilter = "all" | "active" | "inactive";

const FILTERS: { id: PrizeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export default function SpinPrizesPage() {
  const [prizes, setPrizes] = useState<SpinPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrizeFilter>("all");

  useEffect(() => {
    apiGet<SpinPrize[]>(API.spinPrizes)
      .then(setPrizes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = prizes.filter((p) => p.is_active).length;

  const filtered = useMemo(() => {
    if (filter === "active") return prizes.filter((p) => p.is_active);
    if (filter === "inactive") return prizes.filter((p) => !p.is_active);
    return prizes;
  }, [prizes, filter]);

  return (
    <AdminShell>
      <PageHeader
        title="Spin Wheel"
        description="Manage wheel segments — points, gifts, and probabilities. Customers spin once per day."
        action={
          <Link href="/spin-prizes/new" className={btnPrimary}>
            Add prize
          </Link>
        }
      />

      {!loading && !error && prizes.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {activeCount} active segment{activeCount === 1 ? "" : "s"} on the
            wheel
          </p>
          <div className="flex rounded-lg bg-zinc-100 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === item.id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl bg-zinc-200/60"
            />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load wheel prizes</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-3 text-xs text-red-500">
            Run supabase/migration-spin.sql in Supabase SQL Editor first.
          </p>
        </Card>
      )}

      {!loading && !error && prizes.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            No wheel prizes yet
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Add segments for points, free products, or toppings.
          </p>
          <Link href="/spin-prizes/new" className={`${btnPrimary} mt-6`}>
            Add first prize
          </Link>
        </Card>
      )}

      {!loading && !error && prizes.length > 0 && filtered.length === 0 && (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-zinc-500">No {filter} prizes.</p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((prize) => (
            <SpinPrizeCard
              key={prize.id}
              prize={prize}
              onUpdated={(updated) =>
                setPrizes((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                )
              }
              onDeleted={(id) =>
                setPrizes((prev) => prev.filter((p) => p.id !== id))
              }
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
