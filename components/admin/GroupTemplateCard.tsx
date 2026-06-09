import type { GroupTemplate } from "@/types/menu";
import { formatPrice } from "@/lib/menu";
import { Badge, Card } from "@/components/admin/ui";

export default function GroupTemplateCard({
  template,
}: {
  template: GroupTemplate;
}) {
  const optionCount = template.template_options?.length ?? 0;

  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Badge variant="accent">Reusable</Badge>
          <Badge variant="muted">{template.selection_type}</Badge>
          {template.is_required && <Badge variant="success">Required</Badge>}
        </div>
        <h3 className="text-base font-semibold text-zinc-900">{template.name}</h3>
        <p className="mt-1 text-sm text-zinc-500">
          {optionCount} option{optionCount !== 1 ? "s" : ""} · attach to any product
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 px-5 py-4">
        {template.template_options?.map((option) => (
          <span
            key={option.id}
            className="rounded-md bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200/80"
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
    </Card>
  );
}
