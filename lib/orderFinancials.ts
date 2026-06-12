import type { Order } from "@/types/orders";

export function num(value: number | null | undefined): number {
  return Number(value ?? 0);
}

export function orderPointsDiscount(order: Order): number {
  if (order.points_discount != null && order.points_discount > 0) {
    return num(order.points_discount);
  }
  return Math.max(0, num(order.discount) - num(order.reward_discount));
}

export function orderFinancials(order: Order) {
  const subtotal = num(order.subtotal);
  const rewardDiscount = num(order.reward_discount);
  const pointsDiscount = orderPointsDiscount(order);
  const deliveryFee = num(order.delivery_fee);
  const total = num(order.total);
  const pointsRedeemed = num(order.points_redeemed);
  const pointsAwarded = num(order.points_awarded);
  const beforeDiscounts = subtotal + deliveryFee;

  return {
    subtotal,
    rewardDiscount,
    pointsDiscount,
    totalDiscount: rewardDiscount + pointsDiscount,
    deliveryFee,
    total,
    pointsRedeemed,
    pointsAwarded,
    beforeDiscounts,
    savedKr: rewardDiscount + pointsDiscount,
  };
}

export function formatKr(amount: number): string {
  return `${amount.toFixed(0)} kr`;
}
