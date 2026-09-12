import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, microsoftGraph, openEmailSession, sealEmailSession } from "@/lib/email";

export async function POST(request: Request) {
  const store = await cookies();
  const current = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  if (!current) return NextResponse.json({ error: "Outlook is not connected" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.body || "").trim();

  if (body.approved !== true) return NextResponse.json({ error: "Approval required" }, { status: 403 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !message) {
    return NextResponse.json({ error: "Recipient, subject and body are required" }, { status: 400 });
  }

  try {
    const { response: sendResponse, session } = await microsoftGraph(current, "/me/sendMail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: message },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!sendResponse.ok) {
      const detail = await sendResponse.text();
      return NextResponse.json({ error: "Outlook send failed", detail: detail.slice(0, 500) }, { status: 502 });
    }

    const response = NextResponse.json({ ok: true, accepted: true });
    if (session.accessToken !== current.accessToken || session.refreshToken !== current.refreshToken) {
      response.cookies.set(EMAIL_COOKIE, sealEmailSession(session), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send Outlook email" }, { status: 500 });
  }
}
