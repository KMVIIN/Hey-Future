import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, googleGmail, microsoftGraph, openEmailSession, sealEmailSession } from "@/lib/email";
import type { EmailMessageSummary } from "@/lib/email-types";

function header(headers: Array<{name?:string;value?:string}> = [], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function GET() {
  const store = await cookies();
  const current = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  if (!current) return NextResponse.json({ error: "Email is not connected" }, { status: 401 });

  try {
    if (current.provider === "google") {
      const { response: listResponse, session } = await googleGmail(current, "/users/me/messages?maxResults=8&labelIds=INBOX");
      if (!listResponse.ok) return NextResponse.json({ error: "Could not read Gmail inbox", detail: (await listResponse.text()).slice(0,500) }, { status: 502 });
      const list = await listResponse.json();
      const items = await Promise.all((list.messages || []).map(async (item: {id:string;threadId?:string}) => {
        const { response } = await googleGmail(session, `/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
        if (!response.ok) return null;
        const m = await response.json();
        const headers = m.payload?.headers || [];
        return {
          id: String(m.id || item.id),
          threadId: String(m.threadId || item.threadId || item.id),
          from: header(headers,"From"),
          subject: header(headers,"Subject") || "(no subject)",
          date: header(headers,"Date"),
          snippet: m.snippet || "",
        } satisfies EmailMessageSummary;
      }));
      const response = NextResponse.json({ messages: items.filter(Boolean), email: session.email, provider: "google" });
      if (session.accessToken !== current.accessToken || session.refreshToken !== current.refreshToken) response.cookies.set(EMAIL_COOKIE, sealEmailSession(session), { httpOnly:true, secure:true, sameSite:"lax", maxAge:60*60*24*30, path:"/" });
      return response;
    }

    const query = new URLSearchParams({ "$top":"8", "$orderby":"receivedDateTime desc", "$select":"id,conversationId,from,subject,receivedDateTime,bodyPreview,isRead" });
    const { response: graphResponse, session } = await microsoftGraph(current, `/me/mailFolders/inbox/messages?${query.toString()}`);
    if (!graphResponse.ok) return NextResponse.json({ error:"Could not read Outlook inbox", detail:(await graphResponse.text()).slice(0,500) }, { status:502 });
    const data = await graphResponse.json();
    const messages: EmailMessageSummary[] = (data.value || []).map((m:any) => ({
      id:String(m.id||""), threadId:String(m.conversationId||m.id||""),
      from:m.from?.emailAddress?.name ? `${m.from.emailAddress.name} <${m.from.emailAddress.address||""}>` : (m.from?.emailAddress?.address||""),
      subject:m.subject||"(no subject)", date:m.receivedDateTime||"", snippet:m.bodyPreview||"",
    }));
    const response = NextResponse.json({ messages, email:session.email, provider:"microsoft" });
    if (session.accessToken !== current.accessToken || session.refreshToken !== current.refreshToken) response.cookies.set(EMAIL_COOKIE, sealEmailSession(session), { httpOnly:true, secure:true, sameSite:"lax", maxAge:60*60*24*30, path:"/" });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read email inbox" }, { status:500 });
  }
}
