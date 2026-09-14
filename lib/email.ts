import crypto from "node:crypto";

export const EMAIL_COOKIE = "future_email_session";
export const EMAIL_ACTIVE_PROVIDER_COOKIE = "future_email_active_provider";
export const EMAIL_MICROSOFT_COOKIE = "future_email_microsoft";
export const EMAIL_GOOGLE_COOKIE = "future_email_google";

export type EmailProvider = "microsoft" | "google";
export type EmailSession = {
  provider: EmailProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email?: string;
  name?: string;
};

export function providerCookie(provider: EmailProvider) {
  return provider === "google" ? EMAIL_GOOGLE_COOKIE : EMAIL_MICROSOFT_COOKIE;
}

export const MICROSOFT_SCOPES = [
  "openid","profile","email","offline_access","User.Read","Mail.Read","Mail.Send",
].join(" ");

export const GOOGLE_SCOPES = [
  "openid","profile","email","https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send",
].join(" ");

function secretKey() {
  const raw = process.env.EMAIL_SESSION_SECRET || "";
  if (!raw) throw new Error("EMAIL_SESSION_SECRET is not configured");
  return crypto.createHash("sha256").update(raw).digest();
}

export function sealEmailSession(session: EmailSession) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openEmailSession(value?: string | null): EmailSession | null {
  if (!value) return null;
  try {
    const buffer = Buffer.from(value, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const session = JSON.parse(json) as EmailSession;
    return session.provider === "microsoft" || session.provider === "google" ? session : null;
  } catch { return null; }
}

function tenant(){ return process.env.MICROSOFT_TENANT_ID?.trim() || "common"; }

export async function refreshMicrosoftSession(session: EmailSession): Promise<EmailSession> {
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) throw new Error("Email session expired. Reconnect Outlook.");
  const clientId=process.env.MICROSOFT_CLIENT_ID; const clientSecret=process.env.MICROSOFT_CLIENT_SECRET;
  if(!clientId||!clientSecret) throw new Error("Microsoft OAuth is not configured");
  const response=await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:session.refreshToken,grant_type:"refresh_token",scope:MICROSOFT_SCOPES})});
  if(!response.ok) throw new Error("Could not refresh Outlook access");
  const data=await response.json();
  return {...session,accessToken:data.access_token,refreshToken:data.refresh_token||session.refreshToken,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
}

export async function refreshGoogleSession(session: EmailSession): Promise<EmailSession> {
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) throw new Error("Email session expired. Reconnect Gmail.");
  const clientId=process.env.GOOGLE_CLIENT_ID; const clientSecret=process.env.GOOGLE_CLIENT_SECRET;
  if(!clientId||!clientSecret) throw new Error("Google OAuth is not configured");
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:session.refreshToken,grant_type:"refresh_token"})});
  if(!response.ok) throw new Error("Could not refresh Gmail access");
  const data=await response.json();
  return {...session,accessToken:data.access_token,expiresAt:Date.now()+Number(data.expires_in||3600)*1000};
}

export async function microsoftGraph(session: EmailSession,path:string,init?:RequestInit){
  const fresh=await refreshMicrosoftSession(session); const url=path.startsWith("http")?path:`https://graph.microsoft.com/v1.0${path}`;
  const response=await fetch(url,{...init,headers:{...(init?.headers||{}),authorization:`Bearer ${fresh.accessToken}`}}); return {response,session:fresh};
}
export async function googleGmail(session: EmailSession,path:string,init?:RequestInit){
  const fresh=await refreshGoogleSession(session); const url=path.startsWith("http")?path:`https://gmail.googleapis.com/gmail/v1${path}`;
  const response=await fetch(url,{...init,headers:{...(init?.headers||{}),authorization:`Bearer ${fresh.accessToken}`}}); return {response,session:fresh};
}
