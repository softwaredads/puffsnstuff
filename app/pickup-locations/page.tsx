"use client";

import { useEffect, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { defaultWeeklyHours } from "@/lib/pickup-locations";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  inputClass,
  labelClass,
  selectClass,
} from "@/components/admin/ui";
import type { DayHours, PickupLocation } from "@/types/pickup-locations";

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeValue(value: string | undefined): string {
  return (value ?? "10:00").slice(0, 5);
}

function HoursGrid({
  hours,
  onChange,
}: {
  hours: DayHours[];
  onChange: (next: DayHours[]) => void;
}) {
  const updateDay = (weekday: number, patch: Partial<DayHours>) => {
    onChange(
      hours.map((day) =>
        day.weekday === weekday ? { ...day, ...patch } : day
      )
    );
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className={labelClass}>
        Weekly hours{" "}
        <span className="font-normal text-zinc-400">
          (close ≤ open = overnight / next day)
        </span>
      </label>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {hours.map((day) => (
          <div
            key={day.weekday}
            className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 border-b border-zinc-100 px-3 py-2 last:border-b-0"
          >
            <span className="text-sm font-medium text-zinc-700">
              {DAY_LABELS[day.weekday]}
            </span>
            <input
              type="time"
              className={inputClass}
              value={timeValue(day.open_time)}
              disabled={day.is_closed}
              onChange={(e) =>
                updateDay(day.weekday, { open_time: e.target.value })
              }
            />
            <input
              type="time"
              className={inputClass}
              value={timeValue(day.close_time)}
              disabled={day.is_closed}
              onChange={(e) =>
                updateDay(day.weekday, { close_time: e.target.value })
              }
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={day.is_closed}
                onChange={(e) =>
                  updateDay(day.weekday, { is_closed: e.target.checked })
                }
              />
              Closed
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function hoursSummary(loc: PickupLocation): string {
  const openDays = (loc.weekly_hours ?? []).filter((d) => !d.is_closed);
  if (openDays.length === 0) return "Closed all week";
  const first = openDays[0];
  const same = openDays.every(
    (d) =>
      d.open_time === first.open_time && d.close_time === first.close_time
  );
  if (same && openDays.length === 7) {
    return `${first.open_time.slice(0, 5)}–${first.close_time.slice(0, 5)} daily`;
  }
  return `${openDays.length} open day${openDays.length === 1 ? "" : "s"}`;
}

export default function PickupLocationsPage() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState<DayHours[]>(() => defaultWeeklyHours());
  const [interval, setInterval] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHours, setEditHours] = useState<DayHours[]>(() =>
    defaultWeeklyHours()
  );
  const [editInterval, setEditInterval] = useState(15);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<PickupLocation[]>(API.pickupLocations)
      .then(setLocations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await apiPost<PickupLocation>(API.pickupLocations, {
        name,
        address,
        open_time: hours.find((d) => !d.is_closed)?.open_time ?? "10:00",
        close_time: hours.find((d) => !d.is_closed)?.close_time ?? "21:00",
        slot_interval_minutes: interval,
        weekly_hours: hours,
      });
      setLocations((prev) => [...prev, created]);
      setName("");
      setAddress("");
      setHours(defaultWeeklyHours());
      setInterval(15);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add location");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(loc: PickupLocation) {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditAddress(loc.address);
    setEditHours(
      loc.weekly_hours?.length
        ? loc.weekly_hours
        : defaultWeeklyHours(
            timeValue(loc.open_time),
            timeValue(loc.close_time)
          )
    );
    setEditInterval(loc.slot_interval_minutes || 15);
    setFormError(null);
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setFormError(null);
    try {
      const updated = await apiPatch<PickupLocation>(
        `${API.pickupLocations}/${id}`,
        {
          name: editName,
          address: editAddress,
          open_time:
            editHours.find((d) => !d.is_closed)?.open_time ?? "10:00",
          close_time:
            editHours.find((d) => !d.is_closed)?.close_time ?? "21:00",
          slot_interval_minutes: editInterval,
          weekly_hours: editHours,
        }
      );
      setLocations((prev) => prev.map((loc) => (loc.id === id ? updated : loc)));
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pickup location?")) return;
    setDeletingId(id);
    setFormError(null);
    try {
      await apiDelete(`${API.pickupLocations}/${id}`);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader
        title="Pickup Locations"
        description="Addresses and weekly opening hours for checkout."
      />

      <Card className="mb-6 p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nørrebro"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Storgade 12, 2200 København"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Slot interval (minutes)</label>
            <select
              className={selectClass}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} min
                </option>
              ))}
            </select>
          </div>
          <HoursGrid hours={hours} onChange={setHours} />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" className={btnPrimary} disabled={submitting}>
              {submitting ? "Adding…" : "Add location"}
            </button>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
        </form>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/50 p-8 text-center">
          <p className="font-medium text-red-800">Failed to load locations</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Run migration-pickup-weekly-hours.sql in Supabase if needed.
          </p>
        </Card>
      )}

      {!loading && !error && locations.length === 0 && (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-zinc-500">No pickup locations yet. Add one above.</p>
        </Card>
      )}

      {!loading && !error && locations.length > 0 && (
        <div className="space-y-2">
          {locations.map((loc) => {
            const isEditing = editingId === loc.id;
            return (
              <Card key={loc.id} className="px-4 py-3">
                {isEditing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        className={inputClass}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Address</label>
                      <input
                        className={inputClass}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Slot interval</label>
                      <select
                        className={selectClass}
                        value={editInterval}
                        onChange={(e) => setEditInterval(Number(e.target.value))}
                      >
                        {INTERVAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <HoursGrid hours={editHours} onChange={setEditHours} />
                    <div className="flex items-end gap-2 sm:col-span-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={savingId === loc.id}
                        onClick={() => handleSave(loc.id)}
                      >
                        {savingId === loc.id ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900">{loc.name}</p>
                      <p className="text-sm text-zinc-600">{loc.address}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {hoursSummary(loc)} · {loc.slot_interval_minutes} min
                        slots
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => startEdit(loc)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        disabled={deletingId === loc.id}
                        onClick={() => handleDelete(loc.id)}
                      >
                        {deletingId === loc.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
