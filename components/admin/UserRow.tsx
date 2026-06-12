"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Badge, btnGhost } from "@/components/admin/ui";
import type { AdminUser } from "@/types/users";

const ROW =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.7fr)_0.6fr_auto] items-center gap-3 px-4 py-2.5";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function displayName(user: AdminUser) {
  return user.full_name?.trim() || "—";
}

export function UserTableHeader() {
  return (
    <div
      className={`${ROW} border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500`}
    >
      <span>Name</span>
      <span>Phone</span>
      <span>Email</span>
      <span>Joined</span>
      <span>Status</span>
      <span className="text-right">Action</span>
    </div>
  );
}

export default function UserRow({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (user: AdminUser) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggleBlock = async () => {
    setBusy(true);
    try {
      const updated = await apiPatch<AdminUser>(`${API.users}/${user.id}`, {
        is_blocked: !user.is_blocked,
      });
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${ROW} border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/60`}
    >
      <p className="truncate text-sm font-medium text-zinc-900">
        {displayName(user)}
      </p>
      <p className="truncate text-sm text-zinc-600">{user.phone ?? "—"}</p>
      <p className="truncate text-sm text-zinc-500">{user.email ?? "—"}</p>
      <p className="truncate text-xs text-zinc-400">
        {formatDate(user.created_at)}
      </p>
      <Badge variant={user.is_blocked ? "muted" : "success"}>
        {user.is_blocked ? "Blocked" : "Active"}
      </Badge>
      <button
        type="button"
        className={`${btnGhost} ml-auto shrink-0 px-2 py-1 text-xs`}
        disabled={busy}
        onClick={toggleBlock}
      >
        {busy ? "…" : user.is_blocked ? "Unblock" : "Block"}
      </button>
    </div>
  );
}
