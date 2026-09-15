import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/";
  const destination = new URL(requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/", url.origin);
  const next = destination.origin === url.origin ? destination : new URL("/", url.origin);
  try {
    const supabase = await createServerSupabase();
    if (code && supabase && !url.searchParams.has("error")) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(next);
    }
  } catch {
    // Return a recoverable login error without exposing provider details.
  }
  return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
}
