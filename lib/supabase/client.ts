import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function isSupabaseConfigured() {
  // Configuration is resolved server-side through our config endpoint.
  return true;
}

export async function createClient() {
  if (client) return client;

  const response = await fetch("/api/config/supabase", {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const config = await response.json();

  if (!config.configured || !config.url || !config.anonKey) {
    return null;
  }

  client = createBrowserClient(config.url, config.anonKey);
  return client;
}
