import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_ACTIVE_PROVIDER_COOKIE, EMAIL_COOKIE, EMAIL_MICROSOFT_COOKIE, MICROSOFT_SCOPES, sealEmailSession } from "@/lib/email";

const cookieOptions={httpOnly:true,secure:true,sameSite:"lax" as const,maxAge:60*60*24*30,path:"/"};

export async function GET(request: Request) {
  const url=new URL(request.url); const code=url.searchParams.get("code"); const state=url.searchParams.get("state"); const error=url.searchParams.get("error");
  const store=await cookies(); const expectedState=store.get("future_email_oauth_state")?.value; const origin=url.origin;
  if(error) return NextResponse.redirect(`${origin}/?email=cancelled`);
  if(!code||!state||!expectedState||state!==expectedState) return NextResponse.redirect(`${origin}/?email=error`);
  const clientId=process.env.MICROSOFT_CLIENT_ID; const clientSecret=process.env.MICROSOFT_CLIENT_SECRET; const tenant=process.env.MICROSOFT_TENANT_ID?.trim()||"common";
  if(!clientId||!clientSecret||!process.env.EMAIL_SESSION_SECRET) return NextResponse.redirect(`${origin}/?email=config`);
  const redirectUri=`${origin}/api/email/microsoft/callback`;
  const tokenResponse=await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirectUri,grant_type:"authorization_code",scope:MICROSOFT_SCOPES})});
  if(!tokenResponse.ok) return NextResponse.redirect(`${origin}/?email=error`);
  const token=await tokenResponse.json();
  const meResponse=await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",{headers:{authorization:`Bearer ${token.access_token}`}}); const me=meResponse.ok?await meResponse.json():{};
  const sealed=sealEmailSession({provider:"microsoft",accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+Number(token.expires_in||3600)*1000,email:me.mail||me.userPrincipalName,name:me.displayName});
  const response=NextResponse.redirect(`${origin}/?email=connected`);
  response.cookies.set(EMAIL_MICROSOFT_COOKIE,sealed,cookieOptions);
  response.cookies.set(EMAIL_COOKIE,sealed,cookieOptions);
  response.cookies.set(EMAIL_ACTIVE_PROVIDER_COOKIE,"microsoft",cookieOptions);
  response.cookies.delete("future_email_oauth_state");
  return response;
}
