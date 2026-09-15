import { NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export async function GET() {
  const config=getPublicSupabaseConfig();
  return NextResponse.json(config?{configured:true,...config}:{configured:false},{status:config?200:503,headers:{"Cache-Control":"no-store"}});
}
