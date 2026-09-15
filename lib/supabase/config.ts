// Server-only configuration: only the explicitly public URL/key can be returned.
export function getPublicSupabaseConfig() {
  const url = (process.env.PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey || anonKey === process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey.startsWith("sb_secret_")) return null;
  try {
    if (new URL(url).protocol !== "https:" && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) return null;
    if (!anonKey.startsWith("sb_publishable_")) {
      const payload=JSON.parse(Buffer.from(anonKey.split(".")[1] || "", "base64url").toString());
      if(payload.role!=="anon")return null;
    }
  } catch {return null;}
  return {url,anonKey};
}
