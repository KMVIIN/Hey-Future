import { NextRequest, NextResponse } from "next/server";
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null); const to=String(body?.to||"").replace(/[^0-9]/g,""); const message=String(body?.message||"").trim();
 if(!body?.approved)return NextResponse.json({error:"Approval required"},{status:403});
 if(!to||!message)return NextResponse.json({error:"Recipient and message are required"},{status:400});
 const token=process.env.WHATSAPP_ACCESS_TOKEN; const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID; if(!token||!phoneId)return NextResponse.json({error:"WhatsApp Business API is not configured"},{status:503});
 const r=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION||"v23.0"}/${phoneId}/messages`,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body:message}})});
 const data=await r.json().catch(()=>({})); if(!r.ok)return NextResponse.json({error:data?.error?.message||"WhatsApp send failed"},{status:r.status}); return NextResponse.json({ok:true,id:data?.messages?.[0]?.id||null});
}
