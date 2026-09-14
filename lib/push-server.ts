import { createClient } from "@supabase/supabase-js";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function vapidConfig() {
  const publicKey = process.env.VAPID_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) throw new Error("VAPID is not configured");
  return { publicKey, privateKey, subject };
}

export async function savePushSubscription(subscription: StoredPushSubscription, userAgent?: string | null) {
  const { error } = await admin().from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    user_agent: userAgent || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string) {
  const { error } = await admin().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export async function getPushSubscription(endpoint: string): Promise<StoredPushSubscription | null> {
  const { data, error } = await admin().from("push_subscriptions").select("endpoint,p256dh,auth").eq("endpoint", endpoint).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}
