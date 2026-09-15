import { NextResponse } from "next/server";
function present(name:string){return Boolean(process.env[name]?.trim())}
export async function GET(){
 const checks={
  ai:{ready:present("OPENAI_API_KEY"),required:["OPENAI_API_KEY"],model:process.env.OPENAI_MODEL||"gpt-5.6-luna"},
  stripe:{ready:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_PERSONAL","STRIPE_PRICE_PRO","STRIPE_PRICE_BUSINESS"].every(present),required:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_PERSONAL","STRIPE_PRICE_PRO","STRIPE_PRICE_BUSINESS"]},
  supabase:{ready:["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY"].every(present),required:["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY"]},
  outlook:{ready:["MICROSOFT_CLIENT_ID","MICROSOFT_CLIENT_SECRET","EMAIL_SESSION_SECRET"].every(present),required:["MICROSOFT_CLIENT_ID","MICROSOFT_CLIENT_SECRET","EMAIL_SESSION_SECRET"]},
  legal:{ready:["LEGAL_CONTACT_EMAIL","PRIVACY_CONTACT_EMAIL","LEGAL_PHONE","COMPANY_REGISTERED_ADDRESS","CONSUMER_MEDIATOR_NAME","CONSUMER_MEDIATOR_URL"].every(present),required:["LEGAL_CONTACT_EMAIL","PRIVACY_CONTACT_EMAIL","LEGAL_PHONE","COMPANY_REGISTERED_ADDRESS","CONSUMER_MEDIATOR_NAME","CONSUMER_MEDIATOR_URL"]},
  search:{ready:true,mode:"Intent-aware free public search with strict city relevance and direct fallbacks; paid AI research uses OPENAI_API_KEY when configured."},
  chat:{ready:present("OPENAI_API_KEY"),rule:"Normal conversation routes to /api/chat instead of automatically opening Google."},
  approval:{ready:true,rule:"Email send requires approved=true server-side; booking/payment remain non-executing until a real provider is connected."}
 };
 const missing=Object.entries(checks).flatMap(([area,v]:any)=>(v.required||[]).filter((n:string)=>!present(n)).map((name:string)=>({area,name})));
 return NextResponse.json({version:"5.2.0",checks,missing,readyForPaidBeta:missing.length===0,note:"Configuration readiness only. Stripe checkout/webhook/portal, Outlook, AI chat and search still require an end-to-end production test before charging customers."});
}

