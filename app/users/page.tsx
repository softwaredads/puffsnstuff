"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import UserRow, { UserTableHeader } from "@/components/admin/UserRow";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Card } from "@/components/admin/ui";
import type { AdminUser } from "@/types/users";

type Filter = "all" | "active" | "blocked";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    apiGet<AdminUser[]>(API.users)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "active") return users.filter((u) => !u.is_blocked);
    if (filter === "blocked") return users.filter((u) => u.is_blocked);
    return users;
  }, [users, filter]);

  const blockedCount = users.filter((u) => u.is_blocked).length;

  return (
    <AdminShell>
      <PageHeader
        title="Users"
        description="Customer accounts — block or unblock access to the app."
      />

      {!loading && !error && blockedCount > 0 && (
        <p className="mb-4 text-sm text-amber-700">
          {blockedCount} blocked account{blockedCount === 1 ? "" : "s"}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["blocked", "Blocked"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === id
                ? "bg-indigo-600 text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {label}
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
          <p className="font-medium text-red-800">Failed to load users</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-3 text-xs text-red-500">
            Run supabase/migration-users-block.sql in Supabase SQL Editor.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No users found</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Users appear here after they sign up in the app.
          </p>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <UserTableHeader />
          {filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onUpdated={(updated) =>
                setUsers((prev) =>
                  prev.map((u) => (u.id === updated.id ? updated : u))
                )
              }
            />
          ))}
        </Card>
      )}
    </AdminShell>
  );
}
