import { NextResponse } from "next/server";
import { savePushSubscription, vapidConfig } from "@/lib/push-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ configured: true, publicKey: vapidConfig().publicKey });
  } catch {
    return NextResponse.json({ configured: false, publicKey: process.env.VAPID_KEY || "" });
  }
}

export async function POST(request: Request) {
  try {
    vapidConfig();
    const body = await request.json();
    const endpoint = String(body?.endpoint || "");
    const p256dh = String(body?.keys?.p256dh || "");
    const auth = String(body?.keys?.auth || "");
    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }
    await savePushSubscription({ endpoint, p256dh, auth }, request.headers.get("user-agent"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push subscription failed" }, { status: 500 });
  }
}
