"use client";

import { useEffect, useState } from "react";
import AdminShell, { PageHeader } from "@/components/admin/AdminShell";
import { apiGet, apiPost } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import {
  btnPrimary,
  Card,
  inputClass,
  labelClass,
  selectClass,
} from "@/components/admin/ui";
import type { PickupLocation } from "@/types/pickup-locations";

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60];

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
          {locations.map((loc) => (
            <Card key={loc.id} className="px-4 py-3">
              <p className="font-medium text-zinc-900">{loc.name}</p>
              <p className="text-sm text-zinc-600">{loc.address}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {loc.open_time?.slice(0, 5)}–{loc.close_time?.slice(0, 5)} ·{" "}
                {loc.slot_interval_minutes} min slots
              </p>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
