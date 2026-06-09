import type { Product } from "@/types/menu";
import { formatPrice, getProductDisplayGroups } from "@/lib/menu";
import { Badge, Card } from "@/components/admin/ui";

export default function ProductCard({ product }: { product: Product }) {
  const displayGroups = getProductDisplayGroups(product);
  const optionCount = displayGroups.reduce((sum, g) => sum + g.options.length, 0);

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="accent">
              {product.categories?.name ?? "Uncategorized"}
            </Badge>
            {!product.is_active && <Badge variant="muted">Inactive</Badge>}
          </div>
          <h3 className="truncate text-base font-semibold text-zinc-900">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
              {product.description}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Base
          </p>
          <p className="text-lg font-semibold tabular-nums text-zinc-900">
            {formatPrice(Number(product.base_price))}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{displayGroups.length} groups</Badge>
          <Badge>{optionCount} options</Badge>
        </div>

        {displayGroups.length > 0 ? (
          <div className="space-y-2">
            {displayGroups.map((group) => (
              <div
                key={`${group.source}-${group.id}`}
                className="rounded-lg bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-100"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800">{group.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={group.source === "template" ? "accent" : "warning"}>
                      {group.source === "template" ? "Shared" : "Custom"}
                    </Badge>
                    <Badge variant="muted">{group.selection_type}</Badge>
                    {group.is_required && <Badge variant="success">Required</Badge>}
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
    </Card>
  );
}
