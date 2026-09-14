"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { EmailMessageSummary } from "@/lib/email-types";

type Account={provider:"google"|"microsoft";email?:string;name?:string};

export default function EmailInboxCard({ locale, messages, loading, connected, onCheck }: { locale: Locale; messages: EmailMessageSummary[]; loading: boolean; connected: boolean; onCheck: () => void }) {
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [selected,setSelected]=useState("");
  const [switching,setSwitching]=useState(false);
  const t=locale==="th"
    ? {title:"Email Inbox",subtitle:"เลือกบัญชีที่ต้องการอ่าน อีเมลจากแต่ละบัญชีจะไม่ถูกรวมกัน",check:"เช็กอีเมลล่าสุด",connect:"เชื่อม Gmail หรือ Hotmail / Outlook ใน Connections ก่อน",empty:"ยังไม่มีอีเมลที่โหลด",account:"บัญชีอีเมล"}
    : locale==="fr"
    ? {title:"Boîte de réception",subtitle:"Choisissez le compte à lire. Les messages de vos comptes restent séparés.",check:"Voir les e-mails récents",connect:"Connectez Gmail ou Hotmail / Outlook dans Connexions",empty:"Aucun e-mail chargé",account:"Compte e-mail"}
    : {title:"Email Inbox",subtitle:"Choose the account to read. Messages from connected accounts stay separate.",check:"Check recent email",connect:"Connect Gmail or Hotmail / Outlook in Connections first",empty:"No email loaded yet",account:"Email account"};

  useEffect(()=>{fetch("/api/email/status",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(!data)return;const next=(data.accounts||[]) as Account[];setAccounts(next);const active=next.find(a=>a.provider===data.provider&&(!data.email||a.email===data.email))||next[0];if(active)setSelected(`${active.provider}:${active.email||""}`);}).catch(()=>{});},[connected]);

  async function choose(value:string){
    setSelected(value); const provider=value.split(":",1)[0] as "google"|"microsoft"; setSwitching(true);
    try{const response=await fetch("/api/email/select",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider})});if(response.ok)onCheck();}finally{setSwitching(false);}
  }

  const selectedAccount=accounts.find(a=>`${a.provider}:${a.email||""}`===selected);
  return <section className="emailInbox dashboardCard">
    <div className="panelHeading"><div><span className="eyebrow">EMAIL</span><h3>{t.title}</h3></div><button className="softButton" disabled={!connected||loading||switching} onClick={onCheck}>{loading||switching?"…":t.check}</button></div>
    <p className="panelIntro">{connected?t.subtitle:t.connect}</p>
    {accounts.length>0&&<div className="emailAccountPicker"><label htmlFor="future-email-account">{t.account}</label><select id="future-email-account" value={selected} disabled={switching||loading} onChange={e=>choose(e.target.value)}>{accounts.map(a=><option key={`${a.provider}:${a.email||""}`} value={`${a.provider}:${a.email||""}`}>{a.provider==="google"?"Gmail":"Hotmail / Outlook"}{a.email?` — ${a.email}`:""}</option>)}</select>{selectedAccount&&<span className="emailAccountActive">{selectedAccount.provider==="google"?"Gmail":"Hotmail / Outlook"}</span>}</div>}
    <div className="emailList">{messages.length?messages.slice(0,4).map(m=><div className="emailRow" key={m.id}><div className="emailDot">✉</div><div><strong>{m.subject}</strong><span>{m.from}</span><p>{m.snippet}</p></div></div>):<div className="emptyMini">{t.empty}</div>}</div>
  </section>;
}
