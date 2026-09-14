import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_ACTIVE_PROVIDER_COOKIE, EMAIL_COOKIE, EMAIL_GOOGLE_COOKIE, sealEmailSession } from "@/lib/email";

const cookieOptions = { httpOnly:true, secure:true, sameSite:"lax" as const, maxAge:60*60*24*30, path:"/" };

export async function GET(request: Request) {
  const url=new URL(request.url); const code=url.searchParams.get("code"); const state=url.searchParams.get("state"); const error=url.searchParams.get("error");
  const store=await cookies(); const expectedState=store.get("future_google_oauth_state")?.value; const origin=url.origin;
  if(error) return NextResponse.redirect(`${origin}/?email=cancelled`);
  if(!code||!state||!expectedState||state!==expectedState) return NextResponse.redirect(`${origin}/?email=error`);
  const clientId=process.env.GOOGLE_CLIENT_ID; const clientSecret=process.env.GOOGLE_CLIENT_SECRET;
  if(!clientId||!clientSecret||!process.env.EMAIL_SESSION_SECRET) return NextResponse.redirect(`${origin}/?email=config`);

  const redirectUri=`${origin}/api/email/google/callback`;
  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  if(!tokenResponse.ok) return NextResponse.redirect(`${origin}/?email=error`);
  const token=await tokenResponse.json();
  const profileResponse=await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{headers:{authorization:`Bearer ${token.access_token}`}}); const profile=profileResponse.ok?await profileResponse.json():{};
  const sealed=sealEmailSession({provider:"google",accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+Number(token.expires_in||3600)*1000,email:profile.email,name:profile.name});
  const response=NextResponse.redirect(`${origin}/?email=connected`);
  response.cookies.set(EMAIL_GOOGLE_COOKIE,sealed,cookieOptions);
  response.cookies.set(EMAIL_COOKIE,sealed,cookieOptions);
  response.cookies.set(EMAIL_ACTIVE_PROVIDER_COOKIE,"google",cookieOptions);
  response.cookies.delete("future_google_oauth_state");
  return response;
}
