"use client";

import { useState } from "react";
import { apiDelete, apiPatch } from "@/lib/api/client";
import { uploadSpinIcon } from "@/lib/api/upload";
import { API } from "@/lib/api/endpoints";
import { Badge, Card, btnGhost, btnDanger } from "@/components/admin/ui";
import type { SpinPrize } from "@/types/spin";
import type { DeleteSpinPrizeResult } from "@/lib/spin";

function prizeSummary(prize: SpinPrize): string {
  if (prize.prize_type === "points") return `${prize.points_value} points`;
  if (prize.prize_type === "none") return "No prize";
  if (prize.gift_kind === "free_product") {
    return prize.products?.name
      ? `Free ${prize.products.name}`
      : "Free product";
  }
  if (prize.gift_kind === "free_option") {
    if (prize.template_options?.name) {
      return `Free ${prize.template_options.name}`;
    }
    if (prize.group_templates?.name) {
      return `Free option from ${prize.group_templates.name}`;
    }
    return "Free topping/option";
  }
  if (prize.gift_kind === "credit") {
    return `${prize.credit_amount_kr} kr off`;
  }
  if (prize.gift_kind === "percent_off") {
    if (prize.categories?.name) {
      return `${prize.percent_value}% off ${prize.categories.name}`;
    }
    if (prize.products?.name) {
      return `${prize.percent_value}% off ${prize.products.name}`;
    }
    return `${prize.percent_value}% off`;
  }
  return "Gift";
}

export default function SpinPrizeCard({
  prize,
  onUpdated,
  onDeleted,
}: {
  prize: SpinPrize;
  onUpdated: (prize: SpinPrize) => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const toggleActive = async () => {
    setBusy(true);
    try {
      const updated = await apiPatch<SpinPrize>(`${API.spinPrizes}/${prize.id}`, {
        is_active: !prize.is_active,
      });
      onUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${prize.label}" from the wheel?`)) return;
    setBusy(true);
    try {
      const result = await apiDelete<DeleteSpinPrizeResult>(
        `${API.spinPrizes}/${prize.id}`
      );
      if (result.action === "deleted") {
        onDeleted(prize.id);
      } else {
        onUpdated(result.prize);
        alert(
          `"${prize.label}" was won before, so it was hidden instead of deleted (spin history kept).`
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const changeIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIcon(true);
    try {
      const iconUrl = await uploadSpinIcon(file);
      const updated = await apiPatch<SpinPrize>(
        `${API.spinPrizes}/${prize.id}`,
        { icon_url: iconUrl }
      );
      onUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Icon update failed");
    } finally {
      setUploadingIcon(false);
      e.target.value = "";
    }
  };

  const removeIcon = async () => {
    setUploadingIcon(true);
    try {
      const updated = await apiPatch<SpinPrize>(
        `${API.spinPrizes}/${prize.id}`,
        { icon_url: null }
      );
      onUpdated(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Icon update failed");
    } finally {
      setUploadingIcon(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch">
        <div
          className="w-3 shrink-0"
          style={{ backgroundColor: prize.color }}
          aria-hidden
        />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {prize.icon_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prize.icon_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 object-contain p-1"
                />
              )}
              <div>
                <h3 className="font-semibold text-zinc-900">{prize.label}</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {prizeSummary(prize)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={prize.is_active ? "success" : "muted"}>
                {prize.is_active ? "Active" : "Hidden"}
              </Badge>
              <Badge variant="accent">Weight {prize.weight}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span>Type: {prize.prize_type}</span>
            <span>·</span>
            <span>Order: {prize.sort_order}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <label
              className={`${btnGhost} cursor-pointer ${
                busy || uploadingIcon ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {uploadingIcon
                ? "Updating icon…"
                : prize.icon_url
                  ? "Change icon"
                  : "Add icon"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={changeIcon}
                disabled={busy || uploadingIcon}
                className="hidden"
              />
            </label>
            {prize.icon_url && (
              <button
                type="button"
                className={btnGhost}
                disabled={busy || uploadingIcon}
                onClick={removeIcon}
              >
                Remove icon
              </button>
            )}
            <button
              type="button"
              className={btnGhost}
              disabled={busy || uploadingIcon}
              onClick={toggleActive}
            >
              {prize.is_active ? "Hide" : "Activate"}
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={busy || uploadingIcon}
              onClick={remove}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
