import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function stripePriceForPlan(plan: PlanId) {
  if (plan === "personal") return process.env.STRIPE_PRICE_PERSONAL;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
  if (plan === "business") return process.env.STRIPE_PRICE_BUSINESS;
  return undefined;
}
