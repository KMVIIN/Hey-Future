"use client";

import { useEffect } from "react";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

const KEYS = [
  "future-mvp-items-v1",
  "future.contacts.v1",
  "future.workflows.v1",
  "future.approvals.v1",
  "future.orders.v1",
  "future.notes.v1",
  "future.locale",
];

function snapshot() {
  const state: Record<string, string> = {};

  for (const key of KEYS) {
    const value = localStorage.getItem(key);

    if (value !== null) {
      state[key] = value;
    }
  }

  return state;
}

export default function CloudSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let alive = true;
    let last = "";
    let authenticated = false;

    async function init() {
      const supabase = await createClient();

      if (!supabase || !alive) return;

      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !alive) {
        authenticated = false;
        return;
      }

      authenticated = true;

      try {
        const response = await fetch("/api/state", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = await response.json();

        const remote =
          json?.state && typeof json.state === "object"
            ? json.state
            : {};

        const local = snapshot();

        const substantiveLocal = Object.keys(local).filter(
          (key) => key !== "future.locale"
        );

        // New/local-empty device:
        // restore the authenticated user's cloud state.
        if (
          substantiveLocal.length === 0 &&
          Object.keys(remote).length > 0
        ) {
          Object.entries(remote).forEach(([key, value]) => {
            if (typeof value === "string") {
              localStorage.setItem(key, value);
            }
          });

          if (alive) {
            location.reload();
          }

          return;
        }

        last = JSON.stringify(local);

        // Existing local data but no cloud state yet:
        // create the user's first cloud snapshot.
        if (
          Object.keys(remote).length === 0 &&
          Object.keys(local).length > 0
        ) {
          await fetch("/api/state", {
            method: "PUT",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              state: local,
            }),
          });
        }
      } catch {
        // Cloud sync should never prevent Future from loading.
      }
    }

    void init();

    const timer = window.setInterval(async () => {
      if (!alive || !authenticated) return;

      const current = JSON.stringify(snapshot());

      if (current === last) return;

      try {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            state: JSON.parse(current),
          }),
        });

        if (response.ok) {
          last = current;
        }
      } catch {
        // Keep local state and retry on a later interval.
      }
    }, 12000);

    return () => {
      alive = false;
      authenticated = false;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
