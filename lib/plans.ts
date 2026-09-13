export type PlanId = "free" | "personal" | "pro" | "business";

export const PLAN_LIMITS: Record<PlanId, { aiMessages: number; webSearches: number; label: string; priceEur: number }> = {
  free: { aiMessages: 20, webSearches: 5, label: "Free", priceEur: 0 },
  personal: { aiMessages: 2000, webSearches: 100, label: "Personal", priceEur: 9.99 },
  pro: { aiMessages: 6000, webSearches: 300, label: "Pro", priceEur: 19.99 },
  business: { aiMessages: 15000, webSearches: 1000, label: "Business", priceEur: 39.99 },
};

export function normalizePlan(value: unknown): PlanId {
  return value === "personal" || value === "pro" || value === "business" ? value : "free";
}
