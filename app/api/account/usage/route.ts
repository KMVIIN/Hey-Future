import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { getUsageAccess } from "@/lib/usage";

export async function GET(){
  const supabase = await createServerSupabase();
  if(!supabase) return NextResponse.json({error:"Supabase not configured"},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const usage=await getUsageAccess(user.id);
  const admin=createServiceSupabase();
  let estimatedCostUsd=0;
  if(admin){ const start=new Date();start.setUTCDate(1);start.setUTCHours(0,0,0,0); const {data}=await admin.from("usage_events").select("estimated_cost_usd").eq("user_id",user.id).gte("created_at",start.toISOString()); estimatedCostUsd=(data||[]).reduce((s:any,x:any)=>s+Number(x.estimated_cost_usd||0),0); }
  return NextResponse.json({...usage,email:user.email,estimatedCostUsd:Number(estimatedCostUsd.toFixed(4))});
}
