"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import GroupTemplateCard from "@/components/admin/GroupTemplateCard";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { btnPrimary, Card } from "@/components/admin/ui";
import type { GroupTemplate } from "@/types/menu";

export default function GroupsPage() {
  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<GroupTemplate[]>(API.groups)
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <PageHeader
        title="Group Templates"
        description="Reusable customization sets — attach them when adding products."
        action={
          <Link href="/groups/new" className={btnPrimary}>
            Create template
          </Link>
        }
      />

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load templates</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && templates.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No templates yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Build shared groups like Size or Extra Toppings once, reuse everywhere.
          </p>
          <Link href="/groups/new" className={`${btnPrimary} mt-6`}>
            Create template
          </Link>
        </Card>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.map((template) => (
            <GroupTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
