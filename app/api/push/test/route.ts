import { NextResponse } from "next/server";
import webpush from "web-push";
import { vapidConfig } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = String(body?.endpoint || "");
    const p256dh = String(body?.keys?.p256dh || "");
    const auth = String(body?.keys?.auth || "");
    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const vapid = vapidConfig();
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify({
        title: "Future · Test Push",
        body: "Web Push is working. You can close Future and receive reminders.",
        tag: `future-server-test-${Date.now()}`,
        url: "/",
      }),
      { TTL: 60 },
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Test push failed" }, { status: 500 });
  }
}
