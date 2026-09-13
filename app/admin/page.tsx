import Link from "next/link";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITS, normalizePlan } from "@/lib/plans";

export default async function AdminPage(){
  const supabase=await createServerSupabase(); if(!supabase)redirect("/login"); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
  const allowed=(process.env.ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean); if(!user.email||!allowed.includes(user.email.toLowerCase())) redirect("/");
  const admin=createServiceSupabase(); if(!admin)return <main className="accountPage">Supabase service key missing.</main>;
  const start=new Date();start.setUTCDate(1);start.setUTCHours(0,0,0,0);
  const [{data:profiles},{data:subs},{data:usage}]=await Promise.all([admin.from("profiles").select("id,email,display_name,created_at").order("created_at",{ascending:false}),admin.from("subscriptions").select("user_id,plan,status,current_period_end"),admin.from("usage_events").select("user_id,kind,estimated_cost_usd").gte("created_at",start.toISOString())]);
  const subMap=new Map((subs||[]).map((s:any)=>[s.user_id,s])); const usageMap=new Map<string,{ai:number;web:number;cost:number}>(); for(const e of usage||[]){const v=usageMap.get((e as any).user_id)||{ai:0,web:0,cost:0};if((e as any).kind==="ai_message")v.ai++;else if((e as any).kind==="web_search")v.web++;v.cost+=Number((e as any).estimated_cost_usd||0);usageMap.set((e as any).user_id,v);}
  const rows=(profiles||[]).map((p:any)=>{const s:any=subMap.get(p.id)||{plan:"free",status:"active"};const u=usageMap.get(p.id)||{ai:0,web:0,cost:0};const plan=normalizePlan(s.plan);return {...p,...s,...u,revenue:PLAN_LIMITS[plan].priceEur,margin:PLAN_LIMITS[plan].priceEur-u.cost};});
  const mrr=rows.reduce((a:number,r:any)=>a+r.revenue,0),cost=rows.reduce((a:number,r:any)=>a+r.cost,0);
  const featureMatrix = [
    ["AI chat","Limited","Included","Higher limits","High limits"],
    ["Web research","5 / month","100 / month","300 / month","1,000 / month"],
    ["Local tasks, calendar, notes","Yes","Yes","Yes","Yes"],
    ["Cloud sync & connected services","No","Yes","Yes","Yes"],
    ["3 color themes","Yes","Yes","Yes","Yes"],
    ["Custom backgrounds / uploaded image","No","Yes","Yes","Yes"],
    ["Advanced workflows","No","Standard","Advanced","Advanced + business"],
    ["Admin visibility","No","No","No","Yes"],
  ];

  return <main className="adminPage"><header><div><h1>Future Admin</h1><p>Customers, MRR, usage & AI margin</p></div><Link href="/">Open Future</Link></header><section className="accountGrid"><article className="accountCard"><span>Customers</span><h2>{rows.length}</h2></article><article className="accountCard"><span>MRR</span><h2>€{mrr.toFixed(2)}</h2></article><article className="accountCard"><span>Estimated AI cost</span><h2>${cost.toFixed(2)}</h2></article><article className="accountCard"><span>Approx. gross contribution</span><h2>€{(mrr-cost).toFixed(2)}</h2></article></section><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>AI msgs</th><th>Web</th><th>AI cost</th><th>Revenue</th><th>Margin*</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td>{r.display_name||r.email}<small>{r.email}</small></td><td>{r.plan}</td><td>{r.status}</td><td>{r.ai}</td><td>{r.web}</td><td>${r.cost.toFixed(2)}</td><td>€{r.revenue.toFixed(2)}</td><td>€{r.margin.toFixed(2)}</td></tr>)}</tbody></table></div><p className="adminNote">*Approximation: subscription list price minus estimated OpenAI usage only. Payment fees, VAT, hosting, support and other APIs are not included.</p><section className="adminFeatureSection"><h2>What each customer plan unlocks</h2><p>Use this table when supporting customers or deciding what a paid subscriber should receive.</p><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Feature</th><th>Free</th><th>Personal €9.99</th><th>Pro €19.99</th><th>Business €39.99/user</th></tr></thead><tbody>{featureMatrix.map(r=><tr key={r[0]}>{r.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody></table></div></section></main>;
}
