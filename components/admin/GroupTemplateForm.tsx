"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import { apiPost } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  labelClass,
  selectClass,
  Section,
} from "@/components/admin/ui";
import type { GroupTemplate, OptionDraft, TemplateDraft } from "@/types/menu";

function newKey() {
  return crypto.randomUUID();
}

function emptyOption(): OptionDraft {
  return { key: newKey(), name: "", price: "0" };
}

const initialDraft: TemplateDraft = {
  name: "",
  selection_type: "multi",
  is_required: false,
  options: [emptyOption()],
};

export default function GroupTemplateForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<TemplateDraft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateDraft<K extends keyof TemplateDraft>(
    key: K,
    value: TemplateDraft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function addOption() {
    updateDraft("options", [...draft.options, emptyOption()]);
  }

  function removeOption(key: string) {
    updateDraft(
      "options",
      draft.options.filter((o) => o.key !== key)
    );
  }

  function updateOption(key: string, patch: Partial<OptionDraft>) {
    updateDraft(
      "options",
      draft.options.map((o) => (o.key === key ? { ...o, ...patch } : o))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      await apiPost<GroupTemplate>(API.groups, draft);
      setSuccess(true);
      setTimeout(() => router.push("/groups"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <Link href="/groups" className={`${btnGhost} mb-4 -ml-3`}>
        ← Back to templates
      </Link>

      <PageHeader
        title="Create Group Template"
        description="Build once, attach to any product — sizes, toppings, sauces."
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <Section title="Template details">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Group name *</label>
              <input
                type="text"
                required
                placeholder="Extra Toppings"
                value={draft.name}
                onChange={(e) => updateDraft("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={draft.selection_type}
                onChange={(e) =>
                  updateDraft("selection_type", e.target.value as "single" | "multi")
                }
                className={selectClass}
              >
                <option value="single">Single select</option>
                <option value="multi">Multi select</option>
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_required}
                  onChange={(e) => updateDraft("is_required", e.target.checked)}
                  className="accent-indigo-600"
                />
                Required selection
              </label>
            </div>
          </div>
        </Section>

        <Section title="Options" description="Each option can have an extra price.">
          <div className="space-y-2">
            {draft.options.map((option) => (
              <div key={option.key} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Option name"
                  value={option.name}
                  onChange={(e) =>
                    updateOption(option.key, { name: e.target.value })
                  }
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={option.price}
                  onChange={(e) =>
                    updateOption(option.key, { price: e.target.value })
                  }
                  className={`${inputClass} w-24`}
                />
                <span className="flex items-center text-xs text-zinc-400">kr</span>
                {draft.options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOption(option.key)}
                    className="px-2 text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className={`${btnGhost} mt-3`}>
            + Add option
          </button>
        </Section>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              Saved templates appear when adding products.
            </p>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Saving..." : "Save template"}
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Template saved. Redirecting…
            </p>
          )}
        </Card>
      </form>
    </AdminShell>
  );
}
