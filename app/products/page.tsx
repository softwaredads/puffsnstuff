"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import ProductCard from "@/components/admin/ProductCard";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { btnPrimary, Card } from "@/components/admin/ui";
import type { Product } from "@/types/menu";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Product[]>(API.products)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <PageHeader
        title="Products"
        description="Full catalog with shared and product-specific customizations."
        action={
          <Link href="/products/new" className={btnPrimary}>
            Add product
          </Link>
        }
      />

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load products</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && products.length === 0 && (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No products yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first menu item to populate the catalog.
          </p>
          <Link href="/products/new" className={`${btnPrimary} mt-6`}>
            Add product
          </Link>
        </Card>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
