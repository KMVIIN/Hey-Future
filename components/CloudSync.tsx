"use client";

import { useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const KEYS = [
  "future-mvp-items-v1", "future.contacts.v1", "future.workflows.v1", "future.approvals.v1",
  "future.orders.v1", "future.notes.v1", "future.locale"
];

function snapshot() {
  const state: Record<string, string> = {};
  for (const key of KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) state[key] = value;
  }
  return state;
}

export default function CloudSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let alive = true;
    let last = "";
    const supabase = createClient();

    async function init() {
      const { data } = await supabase!.auth.getUser();
      if (!data.user || !alive) return;
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        const json = await response.json();
        const remote = json?.state && typeof json.state === "object" ? json.state : {};
        const local = snapshot();
        const substantiveLocal = Object.keys(local).filter((key) => key !== "future.locale");
        if (substantiveLocal.length === 0 && Object.keys(remote).length > 0) {
          Object.entries(remote).forEach(([key, value]) => typeof value === "string" && localStorage.setItem(key, value));
          location.reload();
          return;
        }
        last = JSON.stringify(local);
        if (Object.keys(remote).length === 0 && Object.keys(local).length > 0) {
          await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: local }) });
        }
      } catch {}
    }

    init();
    const timer = window.setInterval(async () => {
      const current = JSON.stringify(snapshot());
      if (current === last) return;
      last = current;
      try { await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: JSON.parse(current) }) }); } catch {}
    }, 12000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return null;
}
