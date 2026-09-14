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
    ? {title:"Email Inbox",subtitle:"กดไอคอนเพื่อเลือกบัญชีที่ต้องการอ่าน อีเมลแต่ละบัญชีจะแยกกัน",check:"เช็กอีเมลล่าสุด",connect:"เชื่อม Gmail หรือ Hotmail / Outlook ใน Connections ก่อน",empty:"ยังไม่มีอีเมลที่โหลด"}
    : locale==="fr"
    ? {title:"Boîte de réception",subtitle:"Touchez une icône pour choisir le compte. Les boîtes restent séparées.",check:"Voir les e-mails récents",connect:"Connectez Gmail ou Hotmail / Outlook dans Connexions",empty:"Aucun e-mail chargé"}
    : {title:"Email Inbox",subtitle:"Tap an icon to choose the inbox. Connected accounts stay separate.",check:"Check recent email",connect:"Connect Gmail or Hotmail / Outlook in Connections first",empty:"No email loaded yet"};

  useEffect(()=>{fetch("/api/email/status",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{if(!data)return;const next=(data.accounts||[]) as Account[];setAccounts(next);const active=next.find(a=>a.provider===data.provider&&(!data.email||a.email===data.email))||next[0];if(active)setSelected(`${active.provider}:${active.email||""}`);}).catch(()=>{});},[connected]);

  async function choose(account:Account){
    const value=`${account.provider}:${account.email||""}`;
    setSelected(value); setSwitching(true);
    try{const response=await fetch("/api/email/select",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider:account.provider})});if(response.ok)onCheck();}finally{setSwitching(false);}
  }

  const google=accounts.find(a=>a.provider==="google");
  const microsoft=accounts.find(a=>a.provider==="microsoft");
  const activeProvider=selected.startsWith("google:")?"google":selected.startsWith("microsoft:")?"microsoft":"";

  return <section className="emailInbox dashboardCard">
    <div className="panelHeading"><div><span className="eyebrow">EMAIL</span><h3>{t.title}</h3></div><button className="softButton" disabled={!connected||loading||switching} onClick={onCheck}>{loading||switching?"…":t.check}</button></div>
    <p className="panelIntro">{connected?t.subtitle:t.connect}</p>
    {accounts.length>0&&<div className="emailProviderSwitch" role="group" aria-label="Choose email inbox">
      {google&&<button className={`emailProviderButton ${activeProvider==="google"?"active":""}`} onClick={()=>choose(google)} disabled={switching||loading} title={google.email||"Gmail"}><span className="emailProviderEmoji" aria-hidden="true">📧</span><span className="emailProviderText"><strong>Gmail</strong>{google.email&&<small>{google.email}</small>}</span></button>}
      {microsoft&&<button className={`emailProviderButton ${activeProvider==="microsoft"?"active":""}`} onClick={()=>choose(microsoft)} disabled={switching||loading} title={microsoft.email||"Hotmail / Outlook"}><span className="emailProviderEmoji" aria-hidden="true">📨</span><span className="emailProviderText"><strong>Hotmail / Outlook</strong>{microsoft.email&&<small>{microsoft.email}</small>}</span></button>}
    </div>}
    <div className="emailList">{messages.length?messages.slice(0,4).map(m=><div className="emailRow" key={m.id}><div className="emailDot">✉</div><div><strong>{m.subject}</strong><span>{m.from}</span><p>{m.snippet}</p></div></div>):<div className="emptyMini">{t.empty}</div>}</div>
  </section>;
}
