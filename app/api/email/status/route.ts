import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, openEmailSession } from "@/lib/email";

export async function GET() {
  const microsoftConfigured = Boolean(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.EMAIL_SESSION_SECRET
  );
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.EMAIL_SESSION_SECRET
  );
  const store = await cookies();
  const session = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  return NextResponse.json({
    configured: microsoftConfigured || googleConfigured,
    microsoftConfigured,
    googleConfigured,
    connected: Boolean(session),
    provider: session?.provider,
    email: session?.email,
    name: session?.name,
  });
}
