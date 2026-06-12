"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import SpinPrizeCard from "@/components/admin/SpinPrizeCard";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { btnPrimary, Card } from "@/components/admin/ui";
import type { SpinPrize } from "@/types/spin";

export default function SpinPrizesPage() {
  const [prizes, setPrizes] = useState<SpinPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SpinPrize[]>(API.spinPrizes)
      .then(setPrizes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = prizes.filter((p) => p.is_active).length;

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
        <p className="mb-6 text-sm text-zinc-500">
          {activeCount} active segment{activeCount === 1 ? "" : "s"} on the wheel
        </p>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-zinc-200/60" />
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
          <h2 className="text-lg font-semibold text-zinc-900">No wheel prizes yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Add segments for points, free products, or toppings.
          </p>
          <Link href="/spin-prizes/new" className={`${btnPrimary} mt-6`}>
            Add first prize
          </Link>
        </Card>
      )}

      {!loading && !error && prizes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {prizes.map((prize) => (
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
