import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export async function POST(){
  const supabase=await createServerSupabase(); const admin=createServiceSupabase();
  if(!supabase||!admin)return NextResponse.json({error:"Accounts are not configured"},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Please sign in to start the free trial"},{status:401});
  const {data:sub}=await admin.from("subscriptions").select("plan,status,trial_started_at,trial_ends_at,stripe_subscription_id").eq("user_id",user.id).maybeSingle();
  if(sub?.trial_started_at)return NextResponse.json({error:"This account has already used its 30-day Pro trial"},{status:400});
  if(sub?.stripe_subscription_id&&sub?.status==="active")return NextResponse.json({error:"You already have an active paid subscription"},{status:400});
  const now=new Date(); const end=new Date(now.getTime()+30*24*60*60*1000);
  const {error}=await admin.from("subscriptions").upsert({user_id:user.id,plan:"pro",status:"trialing",trial_started_at:now.toISOString(),trial_ends_at:end.toISOString(),updated_at:now.toISOString()});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true,trialEndsAt:end.toISOString()});
}
