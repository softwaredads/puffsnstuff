"use client";

import { useEffect, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import StampCardForm from "@/components/admin/StampCardForm";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Badge, Card } from "@/components/admin/ui";
import type { StampProgram } from "@/types/stamp";

function qualifySummary(program: StampProgram): string {
  if (program.qualify_type === "overall") return "Any order";
  if (program.qualify_type === "category") {
    return program.qualify_category?.name
      ? `${program.qualify_category.name} items`
      : "Category";
  }
  return program.qualify_product?.name ?? "Product";
}

export default function StampCardPage() {
  const [programs, setPrograms] = useState<StampProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StampProgram | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<StampProgram[]>(API.stampCard)
      .then((list) => {
        setPrograms(list);
        const active = list.find((p) => p.is_active);
        setEditing(active ?? list[0] ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const active = programs.find((p) => p.is_active);

  return (
    <AdminShell>
      <PageHeader
        title="Stamp Card"
        description="Configure buy-X-get-free — stamps on completed orders, free product in Wins."
      />

      {loading && (
        <div className="h-40 animate-pulse rounded-xl bg-zinc-200/60" />
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load stamp card</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-3 text-xs text-red-500">
            Run supabase/migration-stamp-card.sql in Supabase SQL Editor.
          </p>
        </Card>
      )}

      {!loading && !error && active && (
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Live</Badge>
            <span className="text-sm font-medium text-zinc-900">{active.name}</span>
            <span className="text-sm text-zinc-500">
              · {active.stamps_required} stamps · Stamp on {qualifySummary(active)} ·
              Free {active.reward_product?.name ?? "product"}
            </span>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <StampCardForm
            program={editing}
            onSaved={(saved) => {
              setPrograms((prev) => {
                const idx = prev.findIndex((p) => p.id === saved.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = saved;
                  return next;
                }
                return [saved, ...prev];
              });
              setEditing(saved);
              if (saved.is_active) {
                setPrograms((prev) =>
                  prev.map((p) =>
                    p.id === saved.id ? saved : { ...p, is_active: false }
                  )
                );
              }
            }}
          />

          {programs.length > 1 && (
            <Card className="h-fit p-4">
              <h3 className="text-sm font-semibold text-zinc-900">All programs</h3>
              <ul className="mt-3 space-y-2">
                {programs.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                        editing?.id === p.id
                          ? "bg-indigo-50 text-indigo-800"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                      onClick={() => setEditing(p)}
                    >
                      {p.name}
                      {p.is_active ? " · active" : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
