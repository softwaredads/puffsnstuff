"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";
import { Card } from "@/components/admin/ui";
import type { DashboardStats } from "@/types/stats";

function formatKr(n: number) {
  return `${Math.round(n).toLocaleString("en-GB")} kr`;
}

function TrendBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
        No prior data
      </span>
    );
  }

  const up = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? "↑" : "↓"} {Math.abs(change)}%
      <span className="font-normal text-zinc-500">vs last month</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
  accent,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
  accent: string;
  href?: string;
}) {
  const inner = (
    <Card className="relative overflow-hidden p-5 transition hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm text-zinc-500">{sub}</p> : null}
      {trend !== undefined ? (
        <div className="mt-3">
          <TrendBadge change={trend} />
        </div>
      ) : null}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function WeekChart({ days }: { days: DashboardStats["last7Days"] }) {
  const maxRevenue = Math.max(...days.map((d) => d.revenue), 1);

  return (
    <Card className="p-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900">Last 7 days</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Completed order revenue by day
          </p>
        </div>
        <div className="text-right text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">
            {days.reduce((s, d) => s + d.orders, 0)}
          </span>{" "}
          orders
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-2 sm:gap-4">
        {days.map((day) => {
          const height = Math.max(8, (day.revenue / maxRevenue) * 100);
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs font-medium text-zinc-600">
                {day.revenue > 0 ? formatKr(day.revenue) : "—"}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${day.orders} orders`}
                />
              </div>
              <span className="text-xs font-medium text-zinc-500">
                {day.label}
              </span>
              {day.orders > 0 ? (
                <span className="text-[10px] text-zinc-400">
                  {day.orders} ord
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DashboardStatsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DashboardStats>(API.stats)
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-zinc-200/60"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 p-6 text-center">
        <p className="font-medium text-amber-900">Stats unavailable</p>
        <p className="mt-1 text-sm text-amber-700">
          {error ?? "Could not load dashboard data"}
        </p>
      </Card>
    );
  }

  const customerTrend =
    stats.customers.newLastMonth === 0
      ? stats.customers.newThisMonth > 0
        ? 100
        : null
      : Math.round(
          ((stats.customers.newThisMonth - stats.customers.newLastMonth) /
            stats.customers.newLastMonth) *
            100
        );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue this month"
          value={formatKr(stats.revenueThisMonth.value)}
          sub={`Today: ${formatKr(stats.today.revenue)}`}
          trend={stats.revenueThisMonth.changePercent}
          accent="bg-gradient-to-r from-indigo-500 to-violet-500"
          href="/orders"
        />
        <StatCard
          label="Orders this month"
          value={String(stats.ordersThisMonth.value)}
          sub={`Today: ${stats.today.orders} orders`}
          trend={stats.ordersThisMonth.changePercent}
          accent="bg-gradient-to-r from-emerald-500 to-teal-500"
          href="/orders"
        />
        <StatCard
          label="Customers"
          value={String(stats.customers.total)}
          sub={`+${stats.customers.newThisMonth} new this month`}
          trend={customerTrend}
          accent="bg-gradient-to-r from-pink-500 to-rose-500"
          href="/users"
        />
        <StatCard
          label="Avg order value"
          value={formatKr(stats.avgOrderValue)}
          sub={`${stats.activeProducts} active products`}
          accent="bg-gradient-to-r from-amber-500 to-orange-500"
        />
      </div>

      {(stats.pendingOrders > 0 || stats.readyOrders > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingOrders > 0 && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {stats.pendingOrders} pending
            </Link>
          )}
          {stats.readyOrders > 0 && (
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {stats.readyOrders} ready for pickup
            </Link>
          )}
        </div>
      )}

      <WeekChart days={stats.last7Days} />
    </div>
  );
}
