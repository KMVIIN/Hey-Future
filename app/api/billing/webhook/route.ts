import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { headers } from "next/headers";
import { getStripe } from "@/lib/billing";
import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";

async function syncSubscription(subscription:Stripe.Subscription){
  const admin=createServiceSupabase(); if(!admin)return;
  const userId=subscription.metadata.future_user_id; if(!userId)return;
  const plan=normalizePlan(subscription.metadata.plan);
  await admin.from("subscriptions").upsert({user_id:userId,plan,status:subscription.status,stripe_customer_id:String(subscription.customer),stripe_subscription_id:subscription.id,current_period_end:new Date(subscription.current_period_end*1000).toISOString(),cancel_at_period_end:subscription.cancel_at_period_end,updated_at:new Date().toISOString()});
}

export async function POST(request:Request){
  const stripe=getStripe(), secret=process.env.STRIPE_WEBHOOK_SECRET; if(!stripe||!secret)return NextResponse.json({error:"Webhook not configured"},{status:503});
  const body=await request.text(); const h=await headers(); const sig=h.get("stripe-signature"); if(!sig)return NextResponse.json({error:"Missing signature"},{status:400});
  let event:Stripe.Event; try{event=stripe.webhooks.constructEvent(body,sig,secret);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid signature"},{status:400});}
  if(event.type==="customer.subscription.created"||event.type==="customer.subscription.updated") await syncSubscription(event.data.object as Stripe.Subscription);
  if(event.type==="customer.subscription.deleted"){
    const sub=event.data.object as Stripe.Subscription; const admin=createServiceSupabase(); const userId=sub.metadata.future_user_id; if(admin&&userId) await admin.from("subscriptions").upsert({user_id:userId,plan:"free",status:"canceled",stripe_customer_id:String(sub.customer),stripe_subscription_id:sub.id,current_period_end:new Date(sub.current_period_end*1000).toISOString(),cancel_at_period_end:false,updated_at:new Date().toISOString()});
  }
  return NextResponse.json({received:true});
}
