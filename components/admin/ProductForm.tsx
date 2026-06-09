"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  Badge,
} from "@/components/admin/ui";
import { apiGet, apiPost } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import {
  calculateExampleTotalHybrid,
  formatPrice,
} from "@/lib/menu";
import type { Category, GroupDraft, GroupTemplate, Product, ProductDraft } from "@/types/menu";
import type { CreateProductInput } from "@/lib/menu";

function newKey() {
  return crypto.randomUUID();
}

function emptyOption() {
  return { key: newKey(), name: "", price: "0" };
}

function emptyGroup(): GroupDraft {
  return {
    key: newKey(),
    name: "",
    selection_type: "multi",
    is_required: false,
    options: [emptyOption()],
  };
}

const initialDraft: ProductDraft = {
  categoryMode: "existing",
  categoryId: "",
  categoryName: "",
  name: "",
  description: "",
  imageUrl: "",
  basePrice: "",
  selectedTemplateIds: [],
  groups: [],
};

export default function ProductForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(initialDraft);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<Category[]>(API.categories),
      apiGet<GroupTemplate[]>(API.groups),
    ])
      .then(([cats, tmpls]) => {
        setCategories(cats);
        setTemplates(tmpls);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMeta(false));
  }, []);

  const previewTotal = useMemo(() => {
    const base = Number(draft.basePrice) || 0;
    return calculateExampleTotalHybrid(
      base,
      templates,
      draft.selectedTemplateIds,
      draft.groups
    );
  }, [draft.basePrice, draft.selectedTemplateIds, draft.groups, templates]);

  function updateDraft<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTemplate(templateId: string) {
    const selected = draft.selectedTemplateIds;
    const next = selected.includes(templateId)
      ? selected.filter((id) => id !== templateId)
      : [...selected, templateId];
    updateDraft("selectedTemplateIds", next);
  }

  function addGroup() {
    updateDraft("groups", [...draft.groups, emptyGroup()]);
  }

  function removeGroup(key: string) {
    updateDraft(
      "groups",
      draft.groups.filter((g) => g.key !== key)
    );
  }

  function updateGroup(key: string, patch: Partial<GroupDraft>) {
    updateDraft(
      "groups",
      draft.groups.map((g) => (g.key === key ? { ...g, ...patch } : g))
    );
  }

  function addOption(groupKey: string) {
    updateDraft(
      "groups",
      draft.groups.map((g) =>
        g.key === groupKey
          ? { ...g, options: [...g.options, emptyOption()] }
          : g
      )
    );
  }

  function removeOption(groupKey: string, optionKey: string) {
    updateDraft(
      "groups",
      draft.groups.map((g) =>
        g.key === groupKey
          ? { ...g, options: g.options.filter((o) => o.key !== optionKey) }
          : g
      )
    );
  }

  function updateOption(
    groupKey: string,
    optionKey: string,
    patch: Partial<GroupDraft["options"][number]>
  ) {
    updateDraft(
      "groups",
      draft.groups.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              options: g.options.map((o) =>
                o.key === optionKey ? { ...o, ...patch } : o
              ),
            }
          : g
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const basePrice = Number(draft.basePrice);
    if (!draft.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!basePrice || basePrice < 0) {
      setError("Enter a valid base price");
      return;
    }
    if (draft.categoryMode === "existing" && !draft.categoryId) {
      setError("Select a category or create a new one");
      return;
    }
    if (draft.categoryMode === "new" && !draft.categoryName.trim()) {
      setError("Enter a category name");
      return;
    }

    setSubmitting(true);
    try {
      await apiPost<Product>(API.products, {
        categoryMode: draft.categoryMode,
        categoryId: draft.categoryId,
        categoryName: draft.categoryName,
        name: draft.name,
        description: draft.description,
        imageUrl: draft.imageUrl,
        basePrice,
        selectedTemplateIds: draft.selectedTemplateIds,
        groups: draft.groups,
      } satisfies CreateProductInput);
      setSuccess(true);
      setTimeout(() => router.push("/products"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  const hasCustomizations =
    draft.selectedTemplateIds.length > 0 || draft.groups.length > 0;

  return (
    <AdminShell>
      <Link href="/products" className={`${btnGhost} mb-4 -ml-3`}>
        ← Back to products
      </Link>

      <PageHeader
        title="Add product"
        description="Attach shared templates or define product-only customization groups."
      />

      <Card className="mb-6 px-4 py-3 text-sm text-zinc-600">
        <span className="font-medium text-zinc-800">Two option types:</span>{" "}
        <Badge variant="accent" className="ml-1">Shared</Badge> reusable across products ·{" "}
        <Badge variant="warning">Custom</Badge> unique to this item
      </Card>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-6 py-5">
              <h2 className="text-base font-semibold text-zinc-900">
                Product details
              </h2>
            </div>
            <div className="p-6">

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Category
              </label>
              <div className="mb-3 flex gap-2">
                {(["existing", "new"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateDraft("categoryMode", mode)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      draft.categoryMode === mode
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {mode === "existing" ? "Existing" : "New Category"}
                  </button>
                ))}
              </div>

              {draft.categoryMode === "existing" ? (
                <select
                  value={draft.categoryId}
                  onChange={(e) => updateDraft("categoryId", e.target.value)}
                  disabled={loadingMeta}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">
                    {loadingMeta ? "Loading..." : "Select category"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Churros, Best Sellers"
                  value={draft.categoryName}
                  onChange={(e) => updateDraft("categoryName", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Chocolate Churros"
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Short description for the menu"
                  value={draft.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                  className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Base Price (kr) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="45"
                  value={draft.basePrice}
                  onChange={(e) => updateDraft("basePrice", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={draft.imageUrl}
                  onChange={(e) => updateDraft("imageUrl", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            </div>
          </section>

          {/* Template selection */}
          <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Reusable Groups
                </h2>
                <p className="text-sm text-stone-500">
                  Universal — select groups used across multiple products.
                </p>
              </div>
              <Link
                href="/groups/new"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                + Create new template
              </Link>
            </div>

            <div className="p-6">
            {loadingMeta ? (
              <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 text-center">
                <p className="text-sm text-zinc-600">
                  No templates yet. Create shared groups first.
                </p>
                <Link href="/groups/new" className={`${btnPrimary} mt-4`}>
                  Create template
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => {
                  const selected = draft.selectedTemplateIds.includes(
                    template.id
                  );
                  return (
                    <label
                      key={template.id}
                      className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition ${
                        selected
                          ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
                          : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTemplate(template.id)}
                        className="mt-1 accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-stone-900">
                            {template.name}
                          </p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase text-stone-500 ring-1 ring-stone-200">
                            {template.selection_type}
                          </span>
                          {template.is_required && (
                            <span className="rounded-full bg-[#e8654a]/10 px-2 py-0.5 text-[10px] font-medium text-[#c24b32]">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {template.template_options?.map((option) => (
                            <span
                              key={option.id}
                              className="rounded-md bg-white px-2 py-0.5 text-xs text-stone-600 ring-1 ring-stone-200/60"
                            >
                              {option.name}
                              {Number(option.price) > 0 && (
                                <span className="ml-1 text-indigo-600">
                                  +{formatPrice(Number(option.price))}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            </div>
          </section>

          {/* Custom groups */}
          <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">
                    Product-Only Groups
                  </h2>
                  <Badge variant="warning">Not shared</Badge>
                </div>
                <p className="text-sm text-zinc-500">
                  Options unique to this product only.
                </p>
              </div>
              <button type="button" onClick={addGroup} className={btnSecondary}>
                + Add custom group
              </button>
            </div>

            <div className="p-6">
            {draft.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 text-center">
                <p className="text-sm text-zinc-600">
                  Optional — for product-specific options not in templates.
                </p>
                <button type="button" onClick={addGroup} className={`${btnSecondary} mt-4`}>
                  + Add custom group
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {draft.groups.map((group, index) => (
                  <div
                    key={group.key}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-700">
                        Product-Only Group {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeGroup(group.key)}
                        className="text-sm text-stone-400 transition hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Group name (e.g. Special Sauce)"
                          value={group.name}
                          onChange={(e) =>
                            updateGroup(group.key, { name: e.target.value })
                          }
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>

                      <select
                        value={group.selection_type}
                        onChange={(e) =>
                          updateGroup(group.key, {
                            selection_type: e.target.value as "single" | "multi",
                          })
                        }
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      >
                        <option value="single">Single select</option>
                        <option value="multi">Multi select</option>
                      </select>

                      <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={group.is_required}
                          onChange={(e) =>
                            updateGroup(group.key, {
                              is_required: e.target.checked,
                            })
                          }
                          className="accent-indigo-600"
                        />
                        Required selection
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                        Options
                      </p>
                      {group.options.map((option) => (
                        <div key={option.key} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Option name"
                            value={option.name}
                            onChange={(e) =>
                              updateOption(group.key, option.key, {
                                name: e.target.value,
                              })
                            }
                            className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={option.price}
                            onChange={(e) =>
                              updateOption(group.key, option.key, {
                                price: e.target.value,
                              })
                            }
                            className="w-24 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          />
                          <span className="flex items-center text-xs text-stone-400">
                            kr
                          </span>
                          {group.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(group.key, option.key)
                              }
                              className="px-2 text-stone-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(group.key)}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">Estimated max price</p>
                <p className="text-2xl font-semibold tabular-nums text-zinc-900">
                  from {previewTotal.toFixed(0)} kr
                </p>
                <p className="text-xs text-stone-500">
                  Base + templates + custom options (preview only)
                </p>
                {!hasCustomizations && (
                  <p className="mt-1 text-xs text-stone-400">
                    No groups selected — product will save with base price only.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {submitting ? "Saving..." : "Save Product"}
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Product saved! Redirecting...
              </p>
            )}
          </Card>
        </form>
    </AdminShell>
  );
}
