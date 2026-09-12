import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, openEmailSession } from "@/lib/email";

export async function GET() {
  const configured = Boolean(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.EMAIL_SESSION_SECRET
  );
  const store = await cookies();
  const session = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  return NextResponse.json({
    configured,
    connected: Boolean(session),
    provider: session?.provider,
    email: session?.email,
    name: session?.name,
  });
}
