"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types/menu";
import { formatPrice, getProductDisplayGroups } from "@/lib/menu";
import { apiDelete } from "@/lib/api/client";
import { Badge, btnDanger, btnPrimary } from "@/components/admin/ui";

export default function ProductDetailModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleting, onClose]);

  const remove = async () => {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await apiDelete<unknown>(`/api/products/${product.id}`);
      onDeleted(product.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  const displayGroups = getProductDisplayGroups(product);
  const optionCount = displayGroups.reduce((sum, g) => sum + g.options.length, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!deleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Badge variant="accent">
                {product.categories?.name ?? "Uncategorized"}
              </Badge>
              {!product.is_active && <Badge variant="muted">Inactive</Badge>}
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {product.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className={btnDanger}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <Link
              href={`/products/${product.id}/edit`}
              aria-disabled={deleting}
              tabIndex={deleting ? -1 : undefined}
              className={`${btnPrimary} px-3 py-2 ${
                deleting ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg px-2 py-1 text-2xl leading-none text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          {deleteError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {deleteError}
            </div>
          )}

          {product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-44 w-full rounded-xl border border-zinc-100 object-cover"
            />
          )}

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Base price
              </p>
              <p className="text-2xl font-semibold tabular-nums text-zinc-900">
                {formatPrice(Number(product.base_price))}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{displayGroups.length} groups</Badge>
              <Badge>{optionCount} options</Badge>
            </div>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-zinc-600">
              {product.description}
            </p>
          )}

          {displayGroups.length > 0 ? (
            <div className="space-y-2">
              {displayGroups.map((group) => (
                <div
                  key={`${group.source}-${group.id}`}
                  className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-100"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-800">
                      {group.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={group.source === "template" ? "accent" : "warning"}
                      >
                        {group.source === "template" ? "Shared" : "Custom"}
                      </Badge>
                      <Badge variant="muted">{group.selection_type}</Badge>
                      {group.is_required && (
                        <Badge variant="success">Required</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((option) => (
                      <span
                        key={option.id}
                        className="rounded-md bg-white px-2 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200/80"
                      >
                        {option.name}
                        {Number(option.price) > 0 && (
                          <span className="ml-1 font-medium text-indigo-600">
                            +{formatPrice(Number(option.price))}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No customizations configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
