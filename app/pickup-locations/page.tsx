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
import type { PickupLocation } from "@/types/pickup-locations";

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60];

function timeValue(value: string | undefined): string {
  return (value ?? "10:00").slice(0, 5);
}

export default function PickupLocationsPage() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [interval, setInterval] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("10:00");
  const [editCloseTime, setEditCloseTime] = useState("21:00");
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
        open_time: openTime,
        close_time: closeTime,
        slot_interval_minutes: interval,
      });
      setLocations((prev) => [...prev, created]);
      setName("");
      setAddress("");
      setOpenTime("10:00");
      setCloseTime("21:00");
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
    setEditOpenTime(timeValue(loc.open_time));
    setEditCloseTime(timeValue(loc.close_time));
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
          open_time: editOpenTime,
          close_time: editCloseTime,
          slot_interval_minutes: editInterval,
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
        description="Addresses customers can choose at checkout."
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
            <label className={labelClass}>Open time</label>
            <input
              type="time"
              className={inputClass}
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Close time</label>
            <input
              type="time"
              className={inputClass}
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
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
            Run supabase/migration-pickup-locations.sql if you haven&apos;t yet.
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
                      <label className={labelClass}>Open time</label>
                      <input
                        type="time"
                        className={inputClass}
                        value={editOpenTime}
                        onChange={(e) => setEditOpenTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Close time</label>
                      <input
                        type="time"
                        className={inputClass}
                        value={editCloseTime}
                        onChange={(e) => setEditCloseTime(e.target.value)}
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
                    <div className="flex items-end gap-2">
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
                        {loc.open_time?.slice(0, 5)}–{loc.close_time?.slice(0, 5)}{" "}
                        · {loc.slot_interval_minutes} min slots
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
