import type { OrderEvent } from "@/types/orders";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventIcon(type: OrderEvent["event_type"]) {
  switch (type) {
    case "order_placed":
      return "🛒";
    case "status_changed":
      return "📋";
    case "points_awarded":
      return "⭐";
    default:
      return "•";
  }
}

function eventDetails(event: OrderEvent) {
  const d = event.details;
  if (event.event_type === "order_placed") {
    const parts: string[] = [];
    if (d.subtotal != null) parts.push(`Subtotal ${Number(d.subtotal).toFixed(0)} kr`);
    if (Number(d.reward_discount) > 0) {
      parts.push(`Gift −${Number(d.reward_discount).toFixed(0)} kr`);
    }
    if (Number(d.points_redeemed) > 0) {
      parts.push(
        `${d.points_redeemed} pts (−${Number(d.points_discount).toFixed(0)} kr)`
      );
    }
    if (d.delivery_fee != null) {
      parts.push(
        Number(d.delivery_fee) === 0
          ? "Pickup free"
          : `Pickup ${Number(d.delivery_fee).toFixed(0)} kr`
      );
    }
    if (d.total != null) parts.push(`Paid ${Number(d.total).toFixed(0)} kr`);
    return parts.join(" · ");
  }

  if (event.event_type === "points_awarded" && d.points_awarded != null) {
    return `Based on ${Number(d.order_total).toFixed(0)} kr order total`;
  }

  return null;
}

export default function OrderHistoryTimeline({
  events,
}: {
  events: OrderEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No history recorded for this order.</p>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Order history
      </h4>
      <ol className="mt-3 space-y-0">
        {events.map((event, index) => {
          const detail = eventDetails(event);
          const isLast = index === events.length - 1;
          return (
            <li key={event.id} className="relative flex gap-3 pb-4">
              {!isLast && (
                <span
                  className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-zinc-200"
                  aria-hidden
                />
              )}
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs">
                {eventIcon(event.event_type)}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-zinc-900">{event.summary}</p>
                {detail ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-400">{formatWhen(event.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
