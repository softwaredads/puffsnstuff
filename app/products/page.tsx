"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import ProductDetailModal from "@/components/admin/ProductDetailModal";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { apiDelete, apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { formatPrice, getProductDisplayGroups } from "@/lib/menu";
import {
  btnPrimary,
  Badge,
  Card,
  inputClass,
  selectClass,
} from "@/components/admin/ui";
import type { Product } from "@/types/menu";

type SortKey = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

export default function ProductsPage() {
  const { t } = useAdminLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    apiGet<Product[]>(API.products)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      if (product.categories?.id && product.categories.name) {
        map.set(product.categories.id, product.categories.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = products;

    if (categoryId !== "all") {
      list = list.filter((p) => p.categories?.id === categoryId);
    }

    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.categories?.name ?? "").toLowerCase().includes(term)
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return Number(a.base_price) - Number(b.base_price);
        case "price-desc":
          return Number(b.base_price) - Number(a.base_price);
        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
    return sorted;
  }, [products, query, categoryId, sort]);

  async function deleteFromList(product: Product) {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(product.id);
    try {
      await apiDelete<{ id: string }>(
        `${API.products}/${encodeURIComponent(product.id)}`
      );
      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title={t.products.title}
        description={t.products.description}
        action={
          <Link href="/products/new" className={btnPrimary}>
            {t.products.addProduct}
          </Link>
        }
      />

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">{t.products.loadError}</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && products.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">{t.products.noProducts}</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {t.products.noProductsHint}
          </p>
          <Link href="/products/new" className={`${btnPrimary} mt-6`}>
            {t.products.addProduct}
          </Link>
        </Card>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.products.searchPlaceholder}
            className={inputClass}
          />
          <select
            className={selectClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="price-asc">Price low–high</option>
            <option value="price-desc">Price high–low</option>
          </select>
        </div>
      )}

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}

      {!loading && !error && products.length > 0 && filtered.length === 0 && (
        <Card className="border-dashed p-8 text-center text-sm text-zinc-500">
          {t.products.noSearchResults}
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {filtered.map((product) => {
            const groups = getProductDisplayGroups(product);
            const deleting = deletingId === product.id;
            return (
              <div key={product.id} className="flex items-center gap-2 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setSelected(product)}
                  disabled={deleting}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-11 w-11 shrink-0 rounded-lg border border-zinc-100 object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-100" />
                  )}

                  <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                    <p className="truncate font-medium text-zinc-900">
                      {product.name}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {product.categories?.name ?? "Uncategorized"}
                    </p>
                  </div>

                  {groups.length > 0 && (
                    <div className="hidden flex-wrap gap-1 sm:flex">
                      {groups.map((group) => (
                        <Badge
                          key={`${group.source}-${group.id}`}
                          variant={group.source === "template" ? "accent" : "warning"}
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex-1" />

                  {!product.is_active && <Badge variant="muted">Inactive</Badge>}

                  <p className="shrink-0 font-semibold tabular-nums text-zinc-900">
                    {formatPrice(Number(product.base_price))}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/products/${product.id}/edit`}
                    aria-disabled={deleting}
                    tabIndex={deleting ? -1 : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 ${
                      deleting ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteFromList(product)}
                    disabled={deleting}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onDeleted={(id) => {
            setProducts((current) =>
              current.filter((product) => product.id !== id)
            );
            setSelected(null);
          }}
        />
      )}
    </AdminShell>
  );
}
