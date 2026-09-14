import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_ACTIVE_PROVIDER_COOKIE, EMAIL_COOKIE, EMAIL_GOOGLE_COOKIE, EMAIL_MICROSOFT_COOKIE, googleGmail, microsoftGraph, openEmailSession, sealEmailSession } from "@/lib/email";
import type { EmailMessageSummary } from "@/lib/email-types";

const cookieOptions={httpOnly:true,secure:true,sameSite:"lax" as const,maxAge:60*60*24*30,path:"/"};
function header(headers:Array<{name?:string;value?:string}>=[],name:string){return headers.find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value||""}

export async function GET(request:Request){
 const url=new URL(request.url); const requested=url.searchParams.get("provider"); const store=await cookies();
 const active=store.get(EMAIL_ACTIVE_PROVIDER_COOKIE)?.value;
 const provider=requested==="google"||requested==="microsoft"?requested:active==="google"||active==="microsoft"?active:null;
 const named=provider==="google"?store.get(EMAIL_GOOGLE_COOKIE)?.value:provider==="microsoft"?store.get(EMAIL_MICROSOFT_COOKIE)?.value:undefined;
 const current=openEmailSession(named)||openEmailSession(store.get(EMAIL_COOKIE)?.value);
 if(!current) return NextResponse.json({error:"Email is not connected"},{status:401});
 if(provider&&current.provider!==provider) return NextResponse.json({error:"Selected email account is not connected"},{status:404});
 try{
  if(current.provider==="google"){
   const {response:listResponse,session}=await googleGmail(current,"/users/me/messages?maxResults=8&labelIds=INBOX");
   if(!listResponse.ok) return NextResponse.json({error:"Could not read Gmail inbox",detail:(await listResponse.text()).slice(0,500)},{status:502});
   const list=await listResponse.json();
   const items=await Promise.all((list.messages||[]).map(async(item:{id:string;threadId?:string})=>{const {response}=await googleGmail(session,`/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);if(!response.ok)return null;const m=await response.json();const headers=m.payload?.headers||[];return {id:String(m.id||item.id),threadId:String(m.threadId||item.threadId||item.id),from:header(headers,"From"),subject:header(headers,"Subject")||"(no subject)",date:header(headers,"Date"),snippet:m.snippet||""} satisfies EmailMessageSummary;}));
   const response=NextResponse.json({messages:items.filter(Boolean),email:session.email,provider:"google"});
   response.cookies.set(EMAIL_ACTIVE_PROVIDER_COOKIE,"google",cookieOptions); if(session.accessToken!==current.accessToken||session.refreshToken!==current.refreshToken) response.cookies.set(EMAIL_GOOGLE_COOKIE,sealEmailSession(session),cookieOptions); return response;
  }
  const query=new URLSearchParams({"$top":"8","$orderby":"receivedDateTime desc","$select":"id,conversationId,from,subject,receivedDateTime,bodyPreview,isRead"});
  const {response:graphResponse,session}=await microsoftGraph(current,`/me/mailFolders/inbox/messages?${query.toString()}`); if(!graphResponse.ok)return NextResponse.json({error:"Could not read Outlook inbox",detail:(await graphResponse.text()).slice(0,500)},{status:502});
  const data=await graphResponse.json(); const messages:EmailMessageSummary[]=(data.value||[]).map((m:any)=>({id:String(m.id||""),threadId:String(m.conversationId||m.id||""),from:m.from?.emailAddress?.name?`${m.from.emailAddress.name} <${m.from.emailAddress.address||""}>`:(m.from?.emailAddress?.address||""),subject:m.subject||"(no subject)",date:m.receivedDateTime||"",snippet:m.bodyPreview||""}));
  const response=NextResponse.json({messages,email:session.email,provider:"microsoft"}); response.cookies.set(EMAIL_ACTIVE_PROVIDER_COOKIE,"microsoft",cookieOptions); if(session.accessToken!==current.accessToken||session.refreshToken!==current.refreshToken)response.cookies.set(EMAIL_MICROSOFT_COOKIE,sealEmailSession(session),cookieOptions); return response;
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not read email inbox"},{status:500});}
}
