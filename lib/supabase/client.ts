import { createBrowserClient } from "@supabase/ssr";
let client: ReturnType<typeof createBrowserClient> | null = null;
let pending: Promise<ReturnType<typeof createBrowserClient> | null> | null = null;
export async function createClient() {
  if(client)return client;
  if(pending)return pending;
  pending=(async()=>{
    try {
      const response=await fetch("/api/config/supabase",{cache:"no-store"});
      if(!response.ok)return null;
      const config=await response.json();
      if(config.configured!==true||typeof config.url!=="string"||typeof config.anonKey!=="string")return null;
      client=createBrowserClient(config.url,config.anonKey);
      return client;
    } catch {return null;}
  })();
  try{return await pending;}finally{pending=null;}
}
export async function isSupabaseConfigured() { return Boolean(await createClient()); }
