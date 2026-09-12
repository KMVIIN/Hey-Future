import { NextResponse } from "next/server";
import { EMAIL_COOKIE } from "@/lib/email";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EMAIL_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
