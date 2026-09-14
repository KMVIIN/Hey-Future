import { NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/push-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = String(body?.endpoint || "");
    if (!endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unsubscribe failed" }, { status: 500 });
  }
}
