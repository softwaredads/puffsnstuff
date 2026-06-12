"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import {
  btnPrimary,
  Card,
  inputClass,
  labelClass,
  selectClass,
  Section,
} from "@/components/admin/ui";
import type { Category, Product } from "@/types/menu";
import type { StampProgram, StampProgramDraft, StampQualifyType } from "@/types/stamp";

const defaultDraft = (): StampProgramDraft => ({
  name: "Stamp card",
  is_active: true,
  stamps_required: 5,
  qualify_type: "overall",
  qualify_category_id: null,
  qualify_product_id: null,
  reward_product_id: "",
});

export default function StampCardForm({
  program,
  onSaved,
}: {
  program?: StampProgram | null;
  onSaved: (program: StampProgram) => void;
}) {
  const [draft, setDraft] = useState<StampProgramDraft>(
    program
      ? {
          name: program.name,
          is_active: program.is_active,
          stamps_required: program.stamps_required,
          qualify_type: program.qualify_type,
          qualify_category_id: program.qualify_category_id,
          qualify_product_id: program.qualify_product_id,
          reward_product_id: program.reward_product_id,
        }
      : defaultDraft()
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Product[]>(API.products),
      apiGet<Category[]>(API.categories),
    ])
      .then(([productList, categoryList]) => {
        setProducts(productList.filter((p) => p.is_active));
        setCategories(categoryList.filter((c) => c.is_active));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (program) {
      setDraft({
        name: program.name,
        is_active: program.is_active,
        stamps_required: program.stamps_required,
        qualify_type: program.qualify_type,
        qualify_category_id: program.qualify_category_id,
        qualify_product_id: program.qualify_product_id,
        reward_product_id: program.reward_product_id,
      });
    }
  }, [program]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = program
        ? await apiPatch<StampProgram>(`${API.stampCard}/${program.id}`, draft)
        : await apiPost<StampProgram>(API.stampCard, draft);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-48 animate-pulse bg-zinc-100">
        <span className="sr-only">Loading…</span>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Section title="Stamp card program">
        <p className="mb-4 text-sm text-zinc-500">
          Customers earn one stamp per qualifying completed order. When the card
          is full, they receive a free product gift in Wins — same as spin prizes.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Program name</label>
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Dessert stamp card"
            />
          </div>

          <div>
            <label className={labelClass}>Stamps required</label>
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={draft.stamps_required}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  stamps_required: Number(e.target.value) || 1,
                })
              }
            />
            <p className="mt-1 text-xs text-zinc-500">
              e.g. 5 = five qualifying orders, then free reward
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>What earns a stamp?</label>
          <select
            className={selectClass}
            value={draft.qualify_type}
            onChange={(e) =>
              setDraft({
                ...draft,
                qualify_type: e.target.value as StampQualifyType,
                qualify_category_id: null,
                qualify_product_id: null,
              })
            }
          >
            <option value="overall">Any completed order</option>
            <option value="category">Order contains a category</option>
            <option value="product">Order contains a product</option>
          </select>
        </div>

        {draft.qualify_type === "category" && (
          <div className="mt-4">
            <label className={labelClass}>Qualifying category</label>
            <select
              className={selectClass}
              value={draft.qualify_category_id ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  qualify_category_id: e.target.value || null,
                })
              }
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {draft.qualify_type === "product" && (
          <div className="mt-4">
            <label className={labelClass}>Qualifying product</label>
            <select
              className={selectClass}
              value={draft.qualify_product_id ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  qualify_product_id: e.target.value || null,
                })
              }
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4">
          <label className={labelClass}>Free reward product</label>
          <select
            className={selectClass}
            value={draft.reward_product_id}
            onChange={(e) =>
              setDraft({ ...draft, reward_product_id: e.target.value })
            }
          >
            <option value="">Select free product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) =>
              setDraft({ ...draft, is_active: e.target.checked })
            }
          />
          Active on the app (only one program can be active)
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          className={`${btnPrimary} mt-6`}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : program ? "Update program" : "Create program"}
        </button>
      </Section>
    </Card>
  );
}
