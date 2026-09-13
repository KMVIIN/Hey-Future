export type OrderStatus = "ordered" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
export type FutureOrder = {
  id: string;
  title: string;
  store: string;
  price?: string;
  orderedAt: string;
  eta?: string;
  status: OrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  linkedTaskId?: string;
};
const KEY = "future.orders.v1";
export function loadOrders(): FutureOrder[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function saveOrders(orders: FutureOrder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(orders));
}
