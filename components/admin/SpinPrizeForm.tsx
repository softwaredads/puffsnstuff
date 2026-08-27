"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { uploadSpinIcon } from "@/lib/api/upload";
import { API } from "@/lib/api/endpoints";
import {
  btnPrimary,
  btnSecondary,
  btnGhost,
  Card,
  inputClass,
  labelClass,
  selectClass,
  Section,
} from "@/components/admin/ui";
import type { Product, GroupTemplate, Category } from "@/types/menu";
import type {
  GiftKind,
  SpinPrize,
  SpinPrizeDraft,
  SpinPrizeType,
} from "@/types/spin";

const WHEEL_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dda0dd",
  "#f97316",
  "#6366f1",
];

const defaultDraft = (): SpinPrizeDraft => ({
  label: "",
  description: "",
  icon_url: null,
  prize_type: "points",
  points_value: 25,
  gift_kind: null,
  product_id: null,
  group_template_id: null,
  template_option_id: null,
  customization_group_id: null,
  customization_option_id: null,
  max_option_price_kr: null,
  credit_amount_kr: null,
  percent_value: null,
  category_id: null,
  percent_target: "category",
  covers_base_only: true,
  color: WHEEL_COLORS[0],
  weight: 10,
  sort_order: 0,
  is_active: true,
});

function draftFromPrize(prize: SpinPrize): SpinPrizeDraft {
  const percentTarget: "product" | "category" =
    prize.gift_kind === "percent_off" && prize.product_id && !prize.category_id
      ? "product"
      : "category";

  return {
    label: prize.label,
    description: prize.description ?? "",
    icon_url: prize.icon_url,
    prize_type: prize.prize_type,
    points_value: prize.points_value,
    gift_kind: prize.gift_kind,
    product_id: prize.product_id,
    group_template_id: prize.group_template_id,
    template_option_id: prize.template_option_id,
    customization_group_id: prize.customization_group_id,
    customization_option_id: prize.customization_option_id,
    max_option_price_kr: prize.max_option_price_kr,
    credit_amount_kr: prize.credit_amount_kr,
    percent_value: prize.percent_value,
    category_id: prize.category_id,
    percent_target: percentTarget,
    covers_base_only: prize.covers_base_only,
    color: prize.color,
    weight: prize.weight,
    sort_order: prize.sort_order,
    is_active: prize.is_active,
  };
}

export default function SpinPrizeForm({ prizeId }: { prizeId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(prizeId);
  const [draft, setDraft] = useState<SpinPrizeDraft>(defaultDraft);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<GroupTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiGet<Product[]>(API.products),
      apiGet<Category[]>(API.categories),
      apiGet<GroupTemplate[]>(API.groups),
      prizeId
        ? apiGet<SpinPrize>(`${API.spinPrizes}/${encodeURIComponent(prizeId)}`)
        : Promise.resolve(null),
    ])
      .then(([productList, categoryList, groupList, prize]) => {
        if (cancelled) return;
        setProducts(productList.filter((p) => p.is_active));
        setCategories(categoryList.filter((c) => c.is_active));
        setGroups(groupList);
        if (prize) setDraft(draftFromPrize(prize));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prizeId]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === draft.group_template_id) ?? null,
    [groups, draft.group_template_id]
  );

  const setType = (prize_type: SpinPrizeType) => {
    setDraft((prev) => ({
      ...prev,
      prize_type,
      gift_kind: prize_type === "gift" ? "free_product" : null,
      points_value: prize_type === "points" ? prev.points_value || 25 : 0,
    }));
  };

  const setGiftKind = (gift_kind: GiftKind) => {
    setDraft((prev) => ({
      ...prev,
      gift_kind,
      product_id: gift_kind === "free_product" ? prev.product_id : null,
      group_template_id: gift_kind === "free_option" ? prev.group_template_id : null,
      template_option_id: gift_kind === "free_option" ? prev.template_option_id : null,
      credit_amount_kr: gift_kind === "credit" ? prev.credit_amount_kr ?? 25 : null,
      percent_value: gift_kind === "percent_off" ? prev.percent_value ?? 25 : null,
      category_id: gift_kind === "percent_off" ? prev.category_id : null,
      percent_target: gift_kind === "percent_off" ? prev.percent_target ?? "category" : undefined,
    }));
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingIcon(true);
    try {
      const iconUrl = await uploadSpinIcon(file);
      setDraft((prev) => ({ ...prev, icon_url: iconUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Icon upload failed");
    } finally {
      setUploadingIcon(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingIcon) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (prizeId) {
        await apiPatch(`${API.spinPrizes}/${encodeURIComponent(prizeId)}`, draft);
        setSuccess("Prize updated!");
      } else {
        await apiPost(API.spinPrizes, draft);
        setSuccess("Prize added to the wheel!");
      }
      setTimeout(() => router.push("/spin-prizes"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prize");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader
        title={isEditing ? "Edit Wheel Prize" : "Add Wheel Prize"}
        description="Configure a segment for the customer spin wheel — points, gifts, or try again."
        action={
          <Link href="/spin-prizes" className={btnGhost}>
            ← Back to wheel
          </Link>
        }
      />

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          <Section title="Basics" description="What customers see on the wheel.">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Wheel label *</label>
                <input
                  className={inputClass}
                  value={draft.label}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="Free Churros"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Description / details</label>
                <p className="mb-2 text-xs text-zinc-500">
                  Shown in the app when customers tap the prizes info icon.
                </p>
                <textarea
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="e.g. Free classic churros — redeem at checkout within 7 days."
                  rows={4}
                />
              </div>

              <div>
                <label className={labelClass}>Wheel icon</label>
                <p className="mb-3 text-xs text-zinc-500">
                  Shown above the label. Use a square transparent PNG or WebP
                  for the cleanest result (maximum 2 MB).
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {draft.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.icon_url}
                      alt="Wheel icon preview"
                      className="h-16 w-16 rounded-xl border border-zinc-200 bg-zinc-50 object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400">
                      No icon
                    </div>
                  )}
                  <label
                    className={`${btnSecondary} cursor-pointer ${
                      uploadingIcon ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {uploadingIcon
                      ? "Uploading…"
                      : draft.icon_url
                        ? "Replace icon"
                        : "Upload icon"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleIconUpload}
                      disabled={uploadingIcon}
                      className="hidden"
                    />
                  </label>
                  {draft.icon_url && (
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, icon_url: null }))
                      }
                      disabled={uploadingIcon}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  className={`${inputClass} mt-3`}
                  value={draft.icon_url ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      icon_url: e.target.value || null,
                    }))
                  }
                  placeholder="Or paste an HTTPS icon URL"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Prize type *</label>
                  <select
                    className={selectClass}
                    value={draft.prize_type}
                    onChange={(e) => setType(e.target.value as SpinPrizeType)}
                  >
                    <option value="points">Points</option>
                    <option value="gift">Gift</option>
                    <option value="none">Try again (no prize)</option>
                  </select>
                </div>

                {/* <div>
                  <label className={labelClass}>Segment color</label>
                  <div className="flex flex-wrap gap-2">
                    {WHEEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 ${
                          draft.color === color
                            ? "border-zinc-900"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setDraft((p) => ({ ...p, color }))}
                        aria-label={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div> */}
              </div>

              {draft.prize_type === "points" && (
                <div>
                  <label className={labelClass}>Points value *</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={draft.points_value}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        points_value: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )}

              {draft.prize_type === "gift" && (
                <div className="space-y-4 rounded-lg border border-zinc-100 bg-zinc-50/80 p-4">
                  <div>
                    <label className={labelClass}>Gift kind *</label>
                    <select
                      className={selectClass}
                      value={draft.gift_kind ?? ""}
                      onChange={(e) =>
                        setGiftKind(e.target.value as GiftKind)
                      }
                    >
                      <option value="free_product">Free product</option>
                      <option value="free_option">Free topping / option</option>
                      <option value="credit">Fixed amount off (kr)</option>
                      <option value="percent_off">Percentage off</option>
                    </select>
                  </div>

                  {draft.gift_kind === "free_product" && (
                    <>
                      <div>
                        <label className={labelClass}>Product *</label>
                        <select
                          className={selectClass}
                          value={draft.product_id ?? ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              product_id: e.target.value || null,
                            }))
                          }
                          required
                        >
                          <option value="">Select product…</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={draft.covers_base_only}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              covers_base_only: e.target.checked,
                            }))
                          }
                        />
                        Base price free only (customer pays for extra toppings)
                      </label>
                    </>
                  )}

                  {draft.gift_kind === "free_option" && (
                    <>
                      <div>
                        <label className={labelClass}>Group template *</label>
                        <select
                          className={selectClass}
                          value={draft.group_template_id ?? ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              group_template_id: e.target.value || null,
                              template_option_id: null,
                            }))
                          }
                          required
                        >
                          <option value="">Select group…</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>
                          Specific option (optional)
                        </label>
                        <select
                          className={selectClass}
                          value={draft.template_option_id ?? ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              template_option_id: e.target.value || null,
                            }))
                          }
                          disabled={!selectedGroup}
                        >
                          <option value="">Any option in group</option>
                          {selectedGroup?.template_options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name} ({option.price} kr)
                            </option>
                          ))}
                        </select>
                      </div>

                      {!draft.template_option_id && (
                        <div>
                          <label className={labelClass}>
                            Max option price (kr) — for &quot;any&quot; option
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={inputClass}
                            value={draft.max_option_price_kr ?? ""}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                max_option_price_kr: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              }))
                            }
                            placeholder="e.g. 15"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {draft.gift_kind === "credit" && (
                    <div>
                      <label className={labelClass}>Discount amount (kr) *</label>
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        className={inputClass}
                        value={draft.credit_amount_kr ?? ""}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            credit_amount_kr: Number(e.target.value) || null,
                          }))
                        }
                        required
                      />
                    </div>
                  )}

                  {draft.gift_kind === "percent_off" && (
                    <>
                      <div>
                        <label className={labelClass}>Discount percent (1–100) *</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className={inputClass}
                          value={draft.percent_value ?? ""}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              percent_value: Number(e.target.value) || null,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Apply to *</label>
                        <select
                          className={selectClass}
                          value={draft.percent_target ?? "category"}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              percent_target: e.target.value as "category" | "product",
                              product_id: null,
                              category_id: null,
                            }))
                          }
                        >
                          <option value="category">Whole category</option>
                          <option value="product">Single product</option>
                        </select>
                      </div>
                      {draft.percent_target === "category" ? (
                        <div>
                          <label className={labelClass}>Category *</label>
                          <select
                            className={selectClass}
                            value={draft.category_id ?? ""}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                category_id: e.target.value || null,
                              }))
                            }
                            required
                          >
                            <option value="">Select category…</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className={labelClass}>Product *</label>
                          <select
                            className={selectClass}
                            value={draft.product_id ?? ""}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                product_id: e.target.value || null,
                              }))
                            }
                            required
                          >
                            <option value="">Select product…</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section
            title="Wheel settings"
            description="Higher weight = more likely to land on this segment."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Weight *</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.weight}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      weight: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Sort order</label>
                <input
                  type="number"
                  className={inputClass}
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sort_order: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2.5 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, is_active: e.target.checked }))
                    }
                  />
                  Active on wheel
                </label>
              </div>
            </div>
          </Section>

          {error && (
            <Card className="border-red-200 bg-red-50/50 p-4 text-sm text-red-700">
              {error}
            </Card>
          )}
          {success && (
            <Card className="border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-700">
              {success}
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/spin-prizes" className={btnGhost}>
              Cancel
            </Link>
            <button
              type="submit"
              className={btnPrimary}
              disabled={saving || uploadingIcon}
            >
              {saving
                ? "Saving…"
                : uploadingIcon
                  ? "Uploading icon…"
                  : isEditing
                    ? "Save changes"
                    : "Add to wheel"}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
