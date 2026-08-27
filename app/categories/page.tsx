"use client";

import { useEffect, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  labelClass,
} from "@/components/admin/ui";
import type { Category } from "@/types/menu";

function sortCategories(list: Category[]) {
  return [...list].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameDa, setNameDa] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameDa, setEditNameDa] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<Category[]>(API.categories)
      .then((list) => setCategories(sortCategories(list)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await apiPost<Category>(API.categories, {
        name_en: nameEn,
        name_da: nameDa,
        sort_order: sortOrder,
      });
      setCategories((prev) => sortCategories([...prev, created]));
      setNameEn("");
      setNameDa("");
      setSortOrder(0);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditNameEn(category.name_en ?? category.name ?? "");
    setEditNameDa(category.name_da ?? category.name ?? "");
    setEditSortOrder(category.sort_order ?? 0);
    setFormError(null);
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setFormError(null);
    try {
      const updated = await apiPatch<Category>(`${API.categories}/${id}`, {
        name_en: editNameEn,
        name_da: editNameDa,
        sort_order: editSortOrder,
      });
      setCategories((prev) =>
        sortCategories(prev.map((c) => (c.id === id ? updated : c)))
      );
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    setDeletingId(id);
    setFormError(null);
    try {
      await apiDelete(`${API.categories}/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Categories"
        description="Menu categories shown in the app filter. Lower sort order appears first."
      />

      <Card className="mb-6 p-5">
        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className={labelClass}>Name (English)</label>
            <input
              className={inputClass}
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Coffee"
            />
          </div>
          <div>
            <label className={labelClass}>Name (Danish)</label>
            <input
              className={inputClass}
              value={nameDa}
              onChange={(e) => setNameDa(e.target.value)}
              placeholder="e.g. Kaffe"
            />
          </div>
          <div>
            <label className={labelClass}>Sort order</label>
            <input
              type="number"
              className={inputClass}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className={`${btnPrimary} w-full`}
              disabled={submitting || (!nameEn.trim() && !nameDa.trim())}
            >
              {submitting ? "Adding…" : "Add category"}
            </button>
          </div>
        </form>
        {formError ? (
          <p className="mt-3 text-sm text-red-600">{formError}</p>
        ) : null}
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load categories</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-3 text-xs text-red-500">
            If this is new, run supabase/migration-category-sort-order.sql in
            Supabase.
          </p>
        </Card>
      )}

      {!loading && !error && categories.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No categories yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Add your first category above.
          </p>
        </Card>
      )}

      {!loading && !error && categories.length > 0 && (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {categories.map((category) => {
              const isEditing = editingId === category.id;
              return (
                <li key={category.id} className="p-4">
                  {isEditing ? (
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto]">
                      <div>
                        <label className={labelClass}>English</label>
                        <input
                          className={inputClass}
                          value={editNameEn}
                          onChange={(e) => setEditNameEn(e.target.value)}
                          placeholder="e.g. Coffee"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Danish</label>
                        <input
                          className={inputClass}
                          value={editNameDa}
                          onChange={(e) => setEditNameDa(e.target.value)}
                          placeholder="e.g. Kaffe"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Sort</label>
                        <input
                          type="number"
                          className={inputClass}
                          value={editSortOrder}
                          onChange={(e) =>
                            setEditSortOrder(Number(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          className={btnPrimary}
                          disabled={savingId === category.id}
                          onClick={() => handleSave(category.id)}
                        >
                          {savingId === category.id ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-600">
                          {category.sort_order ?? 0}
                        </span>
                        <div>
                          <p className="font-medium text-zinc-900">
                            {category.name_en || category.name}
                          </p>
                          {category.name_da &&
                          category.name_da !== category.name_en ? (
                            <p className="text-sm text-zinc-500">
                              {category.name_da}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => startEdit(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          disabled={deletingId === category.id}
                          onClick={() => handleDelete(category.id)}
                        >
                          {deletingId === category.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </AdminShell>
  );
}
