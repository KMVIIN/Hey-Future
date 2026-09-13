import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing";

export async function POST(request:Request){
  const supabase=await createServerSupabase(); const stripe=getStripe(); const admin=createServiceSupabase();
  if(!supabase||!stripe||!admin) return NextResponse.json({error:"Billing is not configured"},{status:503});
  const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {data}=await admin.from("subscriptions").select("stripe_customer_id").eq("user_id",user.id).maybeSingle();
  if(!data?.stripe_customer_id)return NextResponse.json({error:"No billing account yet"},{status:400});
  const appUrl=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const session=await stripe.billingPortal.sessions.create({customer:data.stripe_customer_id,return_url:`${appUrl}/account`});
  return NextResponse.json({url:session.url});
}
