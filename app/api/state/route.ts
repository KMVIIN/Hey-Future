import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("user_state").select("state,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data?.state || {}, updatedAt: data?.updated_at || null });
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const state = body?.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  const serialized = JSON.stringify(state);
  if (serialized.length > 1_500_000) return NextResponse.json({ error: "State too large" }, { status: 413 });
  const { error } = await supabase.from("user_state").upsert({ user_id: user.id, state, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
