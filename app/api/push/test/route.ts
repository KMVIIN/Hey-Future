import { NextResponse } from "next/server";
import webpush from "@mmmike/web-push";
import { deletePushSubscription, getPushSubscription, vapidConfig } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = String(body?.endpoint || "");
    if (!endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    const subscription = await getPushSubscription(endpoint);
    if (!subscription) return NextResponse.json({ error: "This device is not subscribed" }, { status: 404 });
    const vapid = vapidConfig();
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
      title: "Future · Test Push",
      body: "Web Push is working. You can close Future and receive reminders.",
      tag: `future-server-test-${Date.now()}`,
      url: "/",
    }), { TTL: 60 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
    if (statusCode === 404 || statusCode === 410) {
      try {
        const body = await request.clone().json();
        if (body?.endpoint) await deletePushSubscription(String(body.endpoint));
      } catch {}
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test push failed" }, { status: 500 });
  }
}
