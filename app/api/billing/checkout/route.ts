import { NextResponse } from "next/server";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { getStripe, stripePriceForPlan } from "@/lib/billing";
import { normalizePlan } from "@/lib/plans";

export async function POST(request:Request){
  const supabase=await createServerSupabase(); const stripe=getStripe();
  if(!supabase||!stripe) return NextResponse.json({error:"Billing is not configured"},{status:503});
  const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:"Please sign in first"},{status:401});
  const body=await request.json().catch(()=>null); const plan=normalizePlan(body?.plan); if(plan==="free") return NextResponse.json({error:"Choose a paid plan"},{status:400});
  const price=stripePriceForPlan(plan); if(!price) return NextResponse.json({error:`Stripe price for ${plan} is not configured`},{status:503});
  const admin=createServiceSupabase(); let customerId:string|undefined;
  if(admin){ const {data}=await admin.from("subscriptions").select("stripe_customer_id").eq("user_id",user.id).maybeSingle(); customerId=data?.stripe_customer_id||undefined; }
  if(!customerId){ const c=await stripe.customers.create({email:user.email,metadata:{future_user_id:user.id}});customerId=c.id;if(admin)await admin.from("subscriptions").upsert({user_id:user.id,stripe_customer_id:customerId,updated_at:new Date().toISOString()}); }
  const appUrl=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const session=await stripe.checkout.sessions.create({mode:"subscription",customer:customerId,line_items:[{price,quantity:1}],success_url:`${appUrl}/account?checkout=success`,cancel_url:`${appUrl}/pricing?checkout=cancelled`,allow_promotion_codes:true,subscription_data:{metadata:{future_user_id:user.id,plan}},metadata:{future_user_id:user.id,plan}});
  return NextResponse.json({url:session.url});
}
