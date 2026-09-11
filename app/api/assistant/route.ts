import { NextRequest, NextResponse } from "next/server";
import { parseCommand } from "@/lib/parser";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  try {
    return NextResponse.json({ parsed: parseCommand(text) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "parse failed" }, { status: 400 });
  }
}
