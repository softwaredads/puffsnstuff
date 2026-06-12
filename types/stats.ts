export interface PeriodMetric {
  value: number;
  previous: number;
  changePercent: number | null;
}

export interface DailyPoint {
  date: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface DashboardStats {
  revenueThisMonth: PeriodMetric;
  ordersThisMonth: PeriodMetric;
  customers: {
    total: number;
    newThisMonth: number;
    newLastMonth: number;
  };
  avgOrderValue: number;
  pendingOrders: number;
  readyOrders: number;
  today: {
    orders: number;
    revenue: number;
  };
  last7Days: DailyPoint[];
  activeProducts: number;
}
