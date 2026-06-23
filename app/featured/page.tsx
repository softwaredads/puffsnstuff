"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { MAX_FEATURED } from "@/lib/featured";
import { formatPrice } from "@/lib/menu";
import { btnPrimary, btnSecondary, Card } from "@/components/admin/ui";
import type { Product } from "@/types/menu";

interface FeaturedRow {
  product_id: string;
  sort_order: number;
  products: Product | null;
}

export default function FeaturedPage() {
  const { t } = useAdminLanguage();
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featuredRows, allProducts] = await Promise.all([
        apiGet<FeaturedRow[]>(`${API.featured}?admin=1`),
        apiGet<Product[]>(API.products),
      ]);
      setFeatured(featuredRows);
      setProducts(allProducts.filter((p) => p.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const featuredIds = useMemo(
    () => new Set(featured.map((row) => row.product_id)),
    [featured]
  );

  const availableProducts = useMemo(
    () => products.filter((p) => !featuredIds.has(p.id)),
    [products, featuredIds]
  );

  const handleAdd = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const rows = await apiPost<FeaturedRow[]>(API.featured, {
        product_id: selectedId,
      });
      setFeatured(rows);
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (productId: string) => {
    setSaving(true);
    setError(null);
    try {
      const rows = await apiDelete<FeaturedRow[]>(
        `${API.featured}/${productId}`
      );
      setFeatured(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= featured.length) return;

    const ids = featured.map((row) => row.product_id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];

    setSaving(true);
    setError(null);
    try {
      const rows = await apiPatch<FeaturedRow[]>(API.featured, {
        product_ids: ids,
      });
      setFeatured(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader
        title={t.featured.title}
        description={t.featured.description.replace(
          "{{max}}",
          String(MAX_FEATURED)
        )}
      />

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50/50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      <Card className="mb-6 p-5">
        <p className="mb-3 text-sm text-zinc-500">
          {t.featured.countHint.replace(
            "{{max}}",
            String(MAX_FEATURED)
          )}{" "}
          ({featured.length}/{MAX_FEATURED})
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={saving || featured.length >= MAX_FEATURED}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-indigo-400"
          >
            <option value="">{t.featured.selectProduct}</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={
              !selectedId ||
              saving ||
              featured.length >= MAX_FEATURED
            }
            className={btnPrimary}
          >
            {t.featured.add}
          </button>
        </div>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-zinc-200/60"
            />
          ))}
        </div>
      )}

      {!loading && featured.length === 0 && (
        <Card className="border-dashed p-10 text-center">
          <p className="font-medium text-zinc-900">{t.featured.empty}</p>
          <p className="mt-1 text-sm text-zinc-500">{t.featured.emptyHint}</p>
        </Card>
      )}

      {!loading && featured.length > 0 && (
        <div className="space-y-2">
          {featured.map((row, index) => {
            const product = row.products;
            if (!product) return null;

            return (
              <Card
                key={row.product_id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-sm font-semibold text-zinc-400">
                  {index + 1}
                </span>
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">
                    {product.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatPrice(Number(product.base_price))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={saving || index === 0}
                    className={btnSecondary}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={saving || index === featured.length - 1}
                    className={btnSecondary}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(row.product_id)}
                    disabled={saving}
                    className={btnSecondary}
                  >
                    {t.featured.remove}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
