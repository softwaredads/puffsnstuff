"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import ProductDetailModal from "@/components/admin/ProductDetailModal";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { formatPrice, getProductDisplayGroups } from "@/lib/menu";
import { btnPrimary, Badge, Card, inputClass } from "@/components/admin/ui";
import type { Product } from "@/types/menu";

export default function ProductsPage() {
  const { t } = useAdminLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiGet<Product[]>(API.products)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.categories?.name ?? "").toLowerCase().includes(term)
      )
    : products;

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
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.products.searchPlaceholder}
          className={`${inputClass} mb-4`}
        />
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
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelected(product)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-zinc-50"
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

                <div className="min-w-0 shrink-0 sm:w-56">
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
            );
          })}
        </Card>
      )}

      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminShell>
  );
}
