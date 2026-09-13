import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { estimateOpenAICost, getUsageAccess, recordUsage } from "@/lib/usage";

function extractText(data:any){
  if(typeof data?.output_text === "string") return data.output_text;
  for(const item of Array.isArray(data?.output)?data.output:[]){ for(const part of Array.isArray(item?.content)?item.content:[]){ if(part?.type==="output_text"&&typeof part?.text==="string") return part.text; } }
  return "";
}
function webCalls(data:any){return (Array.isArray(data?.output)?data.output:[]).filter((x:any)=>String(x?.type||"").includes("web_search")).length;}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null); const text=String(body?.text||"").trim();
  const locale=["en","fr","th"].includes(body?.locale)?body.locale:"en";
  const forceWeb=Boolean(body?.web);
  if(!text) return NextResponse.json({error:"text is required"},{status:400});
  const apiKey=process.env.OPENAI_API_KEY; if(!apiKey) return NextResponse.json({error:"OPENAI_API_KEY is not configured"},{status:503});

  const supabase=await createServerSupabase();
  let userId:string|undefined;
  if(supabase){ const {data:{user}}=await supabase.auth.getUser(); userId=user?.id; }
  if(userId){ const usage=await getUsageAccess(userId); if(usage.aiMessages>=usage.limits.aiMessages) return NextResponse.json({error:"AI monthly limit reached",code:"AI_LIMIT",usage},{status:429}); if(forceWeb&&usage.webSearches>=usage.limits.webSearches) return NextResponse.json({error:"Web research monthly limit reached",code:"WEB_LIMIT",usage},{status:429}); }

  const model=process.env.OPENAI_MODEL||"gpt-5.6-luna";
  const instructions=`You are Future, a capable AI secretary and general-purpose assistant. Answer the user's question directly inside Future. Never tell the user to search elsewhere when you can answer. Use ${locale === "th" ? "Thai" : locale === "fr" ? "French" : "English"} unless the user clearly uses another language. Be concise but useful. For current, changing, location-dependent, shopping, news, public-figure, product, travel, or recent information, use web search when available. For timeless common knowledge, answer without web search. Do not claim you executed payments, bookings, emails, or purchases unless the application explicitly tells you they succeeded.`;
  const likelyFresh=forceWeb||/(latest|today|current|news|new music|price|weather|opening|open now|2026|ล่าสุด|วันนี้|ข่าว|ราคา|อากาศ|ปัจจุบัน|nouveau|actualité|aujourd'hui|prix|météo)/i.test(text);
  const payload:any={model,instructions,input:text,max_output_tokens:1600}; if(likelyFresh) payload.tools=[{type:"web_search"}];
  let apiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},body:JSON.stringify(payload)});
  if(!apiResponse.ok && payload.tools){ const retry={...payload}; delete retry.tools; apiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},body:JSON.stringify(retry)}); }
  if(!apiResponse.ok){ const err=await apiResponse.text(); return NextResponse.json({error:"AI request failed",detail:err.slice(0,500)},{status:502}); }
  const data=await apiResponse.json(); const answer=extractText(data)||"I couldn't produce an answer."; const wc=webCalls(data); const inputTokens=Number(data?.usage?.input_tokens||0), outputTokens=Number(data?.usage?.output_tokens||0); const cost=estimateOpenAICost(inputTokens,outputTokens,wc);
  if(userId){ await recordUsage({userId,kind:"ai_message",model,inputTokens,outputTokens,estimatedCostUsd:estimateOpenAICost(inputTokens,outputTokens,0),metadata:{web:wc>0}}); if(wc>0) await recordUsage({userId,kind:"web_search",model,estimatedCostUsd:estimateOpenAICost(0,0,wc),metadata:{count:wc}}); }
  return NextResponse.json({answer,model,usage:{inputTokens,outputTokens,webSearches:wc,estimatedCostUsd:Number(cost.toFixed(6))}});
}
