import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_ACTIVE_PROVIDER_COOKIE, EMAIL_COOKIE, EMAIL_GOOGLE_COOKIE, EMAIL_MICROSOFT_COOKIE, openEmailSession } from "@/lib/email";

export async function GET() {
  const microsoftConfigured=Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET&&process.env.EMAIL_SESSION_SECRET);
  const googleConfigured=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.EMAIL_SESSION_SECRET);
  const store=await cookies();
  const microsoft=openEmailSession(store.get(EMAIL_MICROSOFT_COOKIE)?.value);
  const google=openEmailSession(store.get(EMAIL_GOOGLE_COOKIE)?.value);
  const legacy=openEmailSession(store.get(EMAIL_COOKIE)?.value);
  const activeName=store.get(EMAIL_ACTIVE_PROVIDER_COOKIE)?.value;
  const active=(activeName==="google"?google:activeName==="microsoft"?microsoft:null)||legacy||google||microsoft;
  const accountMap=new Map<string,{provider:"microsoft"|"google";email?:string;name?:string}>();
  for(const session of [microsoft,google,legacy]){
    if(!session) continue;
    const key=`${session.provider}:${session.email||""}`;
    if(!accountMap.has(key)) accountMap.set(key,{provider:session.provider,email:session.email,name:session.name});
  }
  const accounts=Array.from(accountMap.values());
  return NextResponse.json({
    configured:microsoftConfigured||googleConfigured,
    microsoftConfigured,
    googleConfigured,
    connected:Boolean(active),
    provider:active?.provider,
    email:active?.email,
    name:active?.name,
    accounts,
    microsoftConnected:accounts.some(a=>a.provider==="microsoft"),
    googleConnected:accounts.some(a=>a.provider==="google"),
  });
}
