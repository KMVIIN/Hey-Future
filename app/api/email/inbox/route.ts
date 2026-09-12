import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, microsoftGraph, openEmailSession, sealEmailSession } from "@/lib/email";
import type { EmailMessageSummary } from "@/lib/email-types";

export async function GET() {
  const store = await cookies();
  const current = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  if (!current) return NextResponse.json({ error: "Outlook is not connected" }, { status: 401 });

  try {
    const query = new URLSearchParams({
      "$top": "8",
      "$orderby": "receivedDateTime desc",
      "$select": "id,conversationId,from,subject,receivedDateTime,bodyPreview,isRead",
    });
    const { response: graphResponse, session } = await microsoftGraph(
      current,
      `/me/mailFolders/inbox/messages?${query.toString()}`
    );

    if (!graphResponse.ok) {
      const detail = await graphResponse.text();
      return NextResponse.json({ error: "Could not read Outlook inbox", detail: detail.slice(0, 500) }, { status: 502 });
    }

    const data = await graphResponse.json();
    const messages: EmailMessageSummary[] = (data.value || []).map((m: any) => ({
      id: String(m.id || ""),
      threadId: String(m.conversationId || m.id || ""),
      from: m.from?.emailAddress?.name
        ? `${m.from.emailAddress.name} <${m.from.emailAddress.address || ""}>`
        : (m.from?.emailAddress?.address || ""),
      subject: m.subject || "(no subject)",
      date: m.receivedDateTime || "",
      snippet: m.bodyPreview || "",
    }));

    const response = NextResponse.json({ messages, email: session.email, provider: "microsoft" });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Outlook inbox" }, { status: 500 });
  }
}
