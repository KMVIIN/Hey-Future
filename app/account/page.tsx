"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage(){
  const [data,setData]=useState<any>(null); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  function refresh(){fetch("/api/account/usage",{cache:"no-store"}).then(r=>r.json()).then(setData).catch(()=>setData({error:"Could not load account"}));}
  useEffect(()=>{refresh()},[]);
  async function portal(){const r=await fetch("/api/billing/portal",{method:"POST"});const d=await r.json();if(d.url)location.href=d.url;else setMessage(d.error||"Billing portal unavailable");}
  async function trial(){setBusy(true);const r=await fetch("/api/billing/start-trial",{method:"POST"});const d=await r.json();setBusy(false);if(r.ok){setMessage("30-day Pro trial started.");refresh()}else setMessage(d.error||"Trial unavailable");}
  async function logout() {
    setBusy(true);setMessage("");
    try {
      const supabase=await createClient();
      if(!supabase)throw new Error("Sign out is unavailable. Please retry.");
      const {error}=await supabase.auth.signOut();
      if(error)throw error;
      location.href="/";
    }catch(error){setMessage(error instanceof Error?error.message:"Could not sign out");}
    finally{setBusy(false);}
  }
  const trialEnd=data?.subscription?.trial_ends_at?new Date(data.subscription.trial_ends_at):null; const trialActive=data?.subscription?.status==="trialing"&&trialEnd&&trialEnd.getTime()>Date.now();
  return <main className="accountPage"><header><div><h1>Future Account</h1><p>Subscription & AI usage</p></div><Link href="/">← Back to Future</Link><button onClick={logout} disabled={busy}>Sign out</button></header>{!data?<div className="accountCard">Loading…</div>:data.error?<div className="accountCard">{data.error}</div>:<><section className="accountGrid"><article className="accountCard"><span>Current plan</span><h2>{trialActive?"PRO TRIAL":String(data.plan||"free").toUpperCase()}</h2><p>{data.email}</p>{trialActive&&<small>Trial ends {trialEnd?.toLocaleDateString()}</small>}</article><article className="accountCard"><span>AI messages this month</span><h2>{data.aiMessages} / {data.limits?.aiMessages}</h2><progress value={data.aiMessages} max={data.limits?.aiMessages||1}/></article><article className="accountCard"><span>Web research this month</span><h2>{data.webSearches} / {data.limits?.webSearches}</h2><progress value={data.webSearches} max={data.limits?.webSearches||1}/></article><article className="accountCard"><span>Estimated AI cost</span><h2>${Number(data.estimatedCostUsd||0).toFixed(2)}</h2><p>Internal estimate for this account.</p></article></section><div className="accountActions">{String(data.plan||"free")==="free"&&!data?.subscription?.trial_started_at&&<button className="primaryBtn" onClick={trial} disabled={busy}>{busy?"Starting…":"Start 30-day Pro trial"}</button>}<Link className="primaryBtn" href="/pricing">Change plan</Link><button onClick={portal}>Manage billing</button></div></>}{message&&<p>{message}</p>}<footer className="legalFooter"><span>© 2026 KÄN inc. · Future AI Assistance is operated by KÄN inc.</span><a href="/legal">Mentions légales</a><a href="/cgv">CGV</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a><a href="/cancel-subscription">Cancel subscription</a><a href="/contact">Contact</a><a href="/alerts-safety">Alerts & safety</a></footer></main>;
}
