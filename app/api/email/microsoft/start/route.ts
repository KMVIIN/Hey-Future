import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MICROSOFT_SCOPES } from "@/lib/email";

export async function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "MICROSOFT_CLIENT_ID is not configured" }, { status: 503 });

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/email/microsoft/callback`;
  const state = randomUUID();
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_SCOPES,
    state,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`);
  response.cookies.set("future_email_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
