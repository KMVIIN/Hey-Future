import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_ACTIVE_PROVIDER_COOKIE, EMAIL_COOKIE, EMAIL_GOOGLE_COOKIE, EMAIL_MICROSOFT_COOKIE, openEmailSession } from "@/lib/email";

const cookieOptions={httpOnly:true,secure:true,sameSite:"lax" as const,maxAge:60*60*24*30,path:"/"};

export async function POST(request:Request){
 const body=await request.json().catch(()=>({}));
 const provider=body.provider==="google"?"google":body.provider==="microsoft"?"microsoft":null;
 if(!provider) return NextResponse.json({error:"Invalid email provider"},{status:400});
 const store=await cookies();
 const cookieName=provider==="google"?EMAIL_GOOGLE_COOKIE:EMAIL_MICROSOFT_COOKIE;
 const sealed=store.get(cookieName)?.value;
 const session=openEmailSession(sealed);
 if(!sealed||!session||session.provider!==provider) return NextResponse.json({error:"That email account is not connected"},{status:404});
 const response=NextResponse.json({ok:true,provider,email:session.email});
 response.cookies.set(EMAIL_ACTIVE_PROVIDER_COOKIE,provider,cookieOptions);
 response.cookies.set(EMAIL_COOKIE,sealed,cookieOptions);
 return response;
}
