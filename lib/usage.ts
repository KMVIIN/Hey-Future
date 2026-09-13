import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizePlan, PLAN_LIMITS } from "@/lib/plans";

export async function getUsageAccess(userId: string) {
  const admin = createServiceSupabase();
  if (!admin) return { plan: "free" as const, limits: PLAN_LIMITS.free, aiMessages: 0, webSearches: 0, configured: false };
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0,0,0,0);
  const [{ data: sub }, { data: events }] = await Promise.all([
    admin.from("subscriptions").select("plan,status,current_period_end,cancel_at_period_end,trial_started_at,trial_ends_at").eq("user_id", userId).maybeSingle(),
    admin.from("usage_events").select("kind").eq("user_id", userId).gte("created_at", start.toISOString()),
  ]);
  let plan = normalizePlan(sub?.plan);
  if (sub?.status === "trialing" && sub?.trial_ends_at) {
    const activeTrial = new Date(sub.trial_ends_at).getTime() > Date.now();
    if (!activeTrial) plan = "free";
  }
  const aiMessages = (events || []).filter((e:any)=>e.kind === "ai_message").length;
  const webSearches = (events || []).filter((e:any)=>e.kind === "web_search").length;
  return { plan, limits: PLAN_LIMITS[plan], aiMessages, webSearches, subscription: sub, configured: true };
}

export async function recordUsage(args: { userId: string; kind: "ai_message"|"web_search"; model?: string; inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number; metadata?: any }) {
  const admin = createServiceSupabase(); if (!admin) return;
  await admin.from("usage_events").insert({
    user_id: args.userId, kind: args.kind, model: args.model || null,
    input_tokens: Math.max(0,args.inputTokens||0), output_tokens: Math.max(0,args.outputTokens||0),
    estimated_cost_usd: Math.max(0,args.estimatedCostUsd||0), metadata: args.metadata || {},
  });
}

export function estimateOpenAICost(inputTokens:number, outputTokens:number, webSearches:number) {
  const inputRate = Number(process.env.OPENAI_INPUT_USD_PER_1M || 0.20);
  const outputRate = Number(process.env.OPENAI_OUTPUT_USD_PER_1M || 1.20);
  const webRate = Number(process.env.OPENAI_WEB_SEARCH_USD_EACH || 0.01);
  return inputTokens/1_000_000*inputRate + outputTokens/1_000_000*outputRate + webSearches*webRate;
}
