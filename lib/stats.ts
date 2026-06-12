import { getSupabase } from "@/lib/supabase";
import type { DashboardStats, DailyPoint, PeriodMetric } from "@/types/stats";

const TZ = "Europe/Copenhagen";

interface OrderRow {
  total: number;
  status: string;
  created_at: string;
}

interface ProfileRow {
  created_at: string;
}

function tzParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

function monthKey(date: Date) {
  const { year, month } = tzParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  const { year, month, day } = tzParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function periodMetric(current: number, previous: number): PeriodMetric {
  if (previous === 0) {
    return {
      value: current,
      previous,
      changePercent: current > 0 ? 100 : null,
    };
  }
  return {
    value: current,
    previous,
    changePercent: Math.round(((current - previous) / previous) * 100),
  };
}

function weekdayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: TZ });
}

function last7DayKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  const [ordersRes, usersRes, productsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("profiles").select("created_at").limit(5000),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (usersRes.error) throw usersRes.error;
  if (productsRes.error) throw productsRes.error;

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const profiles = (usersRes.data ?? []) as ProfileRow[];

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonthDate = new Date(now);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = monthKey(lastMonthDate);
  const today = dayKey(now);

  let revenueThisMonth = 0;
  let revenueLastMonth = 0;
  let ordersThisMonth = 0;
  let ordersLastMonth = 0;
  let todayOrders = 0;
  let todayRevenue = 0;
  let pendingOrders = 0;
  let readyOrders = 0;
  let completedTotal = 0;
  let completedCount = 0;

  const dayMap = new Map<string, { orders: number; revenue: number }>();
  for (const key of last7DayKeys()) {
    dayMap.set(key, { orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    const created = new Date(order.created_at);
    const m = monthKey(created);
    const d = dayKey(created);
    const isCancelled = order.status === "cancelled";
    const isCompleted = order.status === "completed";

    if (order.status === "pending") pendingOrders += 1;
    if (order.status === "ready") readyOrders += 1;

    if (!isCancelled) {
      if (m === thisMonth) ordersThisMonth += 1;
      if (m === lastMonth) ordersLastMonth += 1;
    }

    if (isCompleted) {
      completedTotal += Number(order.total);
      completedCount += 1;

      if (m === thisMonth) revenueThisMonth += Number(order.total);
      if (m === lastMonth) revenueLastMonth += Number(order.total);
    }

    if (d === today && !isCancelled) {
      todayOrders += 1;
      if (isCompleted) todayRevenue += Number(order.total);
    }

    const bucket = dayMap.get(d);
    if (bucket && !isCancelled) {
      bucket.orders += 1;
      if (isCompleted) bucket.revenue += Number(order.total);
    }
  }

  let newThisMonth = 0;
  let newLastMonth = 0;
  for (const profile of profiles) {
    const m = monthKey(new Date(profile.created_at));
    if (m === thisMonth) newThisMonth += 1;
    if (m === lastMonth) newLastMonth += 1;
  }

  const last7Days: DailyPoint[] = last7DayKeys().map((date) => {
    const bucket = dayMap.get(date)!;
    return {
      date,
      label: weekdayLabel(date),
      orders: bucket.orders,
      revenue: bucket.revenue,
    };
  });

  return {
    revenueThisMonth: periodMetric(revenueThisMonth, revenueLastMonth),
    ordersThisMonth: periodMetric(ordersThisMonth, ordersLastMonth),
    customers: {
      total: profiles.length,
      newThisMonth,
      newLastMonth,
    },
    avgOrderValue: completedCount > 0 ? completedTotal / completedCount : 0,
    pendingOrders,
    readyOrders,
    today: { orders: todayOrders, revenue: todayRevenue },
    last7Days,
    activeProducts: productsRes.count ?? 0,
  };
}
