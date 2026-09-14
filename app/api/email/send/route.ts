import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_COOKIE, googleGmail, microsoftGraph, openEmailSession, sealEmailSession } from "@/lib/email";

function base64url(value:string){return Buffer.from(value,"utf8").toString("base64url")}

export async function POST(request: Request) {
  const store = await cookies();
  const current = openEmailSession(store.get(EMAIL_COOKIE)?.value);
  if (!current) return NextResponse.json({ error:"Email is not connected" }, { status:401 });

  const body = await request.json().catch(() => ({}));
  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim();
  const message = String(body.body || "").trim();
  if (body.approved !== true) return NextResponse.json({ error:"Approval required" }, { status:403 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !message) return NextResponse.json({ error:"Recipient, subject and body are required" }, { status:400 });

  try {
    if (current.provider === "google") {
      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject,"utf8").toString("base64")}?=`;
      const raw = [`To: ${to}`, `Subject: ${encodedSubject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "", message].join("\r\n");
      const { response: sendResponse, session } = await googleGmail(current, "/users/me/messages/send", {
        method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({raw:base64url(raw)}),
      });
      if (!sendResponse.ok) return NextResponse.json({ error:"Gmail send failed", detail:(await sendResponse.text()).slice(0,500) }, { status:502 });
      const response = NextResponse.json({ ok:true, accepted:true, provider:"google" });
      if (session.accessToken !== current.accessToken || session.refreshToken !== current.refreshToken) response.cookies.set(EMAIL_COOKIE, sealEmailSession(session), { httpOnly:true, secure:true, sameSite:"lax", maxAge:60*60*24*30, path:"/" });
      return response;
    }

    const { response: sendResponse, session } = await microsoftGraph(current, "/me/sendMail", {
      method:"POST", headers:{"content-type":"application/json"},
      body:JSON.stringify({ message:{ subject, body:{contentType:"Text",content:message}, toRecipients:[{emailAddress:{address:to}}] }, saveToSentItems:true }),
    });
    if (!sendResponse.ok) return NextResponse.json({ error:"Outlook send failed", detail:(await sendResponse.text()).slice(0,500) }, { status:502 });
    const response = NextResponse.json({ ok:true, accepted:true, provider:"microsoft" });
    if (session.accessToken !== current.accessToken || session.refreshToken !== current.refreshToken) response.cookies.set(EMAIL_COOKIE, sealEmailSession(session), { httpOnly:true, secure:true, sameSite:"lax", maxAge:60*60*24*30, path:"/" });
    return response;
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "Could not send email" }, { status:500 });
  }
}
