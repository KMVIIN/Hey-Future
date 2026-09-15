import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { configured: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    configured: true,
    url,
    anonKey,
  });
}
