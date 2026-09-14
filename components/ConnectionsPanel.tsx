"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export type EmailConnectionState = { configured:boolean; microsoftConfigured?:boolean; googleConfigured?:boolean; connected:boolean; provider?:"microsoft"|"google"; email?:string; name?:string };

export default function ConnectionsPanel({locale,email,onRefresh}:{locale:Locale;email:EmailConnectionState;onRefresh:()=>void}){
 const [status,setStatus]=useState<EmailConnectionState>(email);
 useEffect(()=>{setStatus(email)},[email]);
 useEffect(()=>{fetch("/api/email/status",{cache:"no-store"}).then(async r=>{if(!r.ok)return;const d=await r.json();setStatus({configured:Boolean(d.configured),microsoftConfigured:Boolean(d.microsoftConfigured),googleConfigured:Boolean(d.googleConfigured),connected:Boolean(d.connected),provider:d.provider,email:d.email,name:d.name})}).catch(()=>{})},[]);
 const t=locale==="th"?{
  eyebrow:"CONNECTIONS",title:"การเชื่อมต่อ",note:"เชื่อม Outlook หรือ Gmail เพื่อให้ Future อ่านและสรุปกล่องจดหมาย ร่างอีเมล และส่งจริงเฉพาะหลังคุณอนุมัติ",ready:"พร้อมใช้",manual:"Future Contacts",manualDesc:"ชื่อ เบอร์ อีเมล และชื่อเรียก เก็บใน Future",phone:"iPhone / SIM Contacts",phoneDesc:"เชื่อมรายชื่อโดยตรงเมื่อมี native app",native:"Native app",outlook:"Outlook / Microsoft 365",gmail:"Gmail",mailDesc:"อ่าน Inbox สรุปและร่างอีเมล ส่งจริงหลังคุณอนุมัติ",connectOutlook:"เชื่อม Outlook",connectGmail:"เชื่อม Gmail",disconnect:"ยกเลิกการเชื่อม",setupMicrosoft:"ตั้งค่า Microsoft OAuth ใน Vercel ก่อน",setupGoogle:"ตั้งค่า Google OAuth ใน Vercel ก่อน"
 }:locale==="fr"?{
  eyebrow:"CONNEXIONS",title:"Connexions",note:"Connectez Outlook ou Gmail. Future peut lire et résumer la boîte, préparer des e-mails et les envoyer uniquement après votre approbation.",ready:"Actif",manual:"Future Contacts",manualDesc:"Noms, téléphones, e-mails et alias dans Future",phone:"Contacts iPhone / SIM",phoneDesc:"Accès direct avec une future app native",native:"App native",outlook:"Outlook / Microsoft 365",gmail:"Gmail",mailDesc:"Lire, résumer et préparer; envoi uniquement après approbation",connectOutlook:"Connecter Outlook",connectGmail:"Connecter Gmail",disconnect:"Déconnecter",setupMicrosoft:"Configurez Microsoft OAuth dans Vercel",setupGoogle:"Configurez Google OAuth dans Vercel"
 }:{
  eyebrow:"CONNECTIONS",title:"Connections",note:"Connect Outlook or Gmail so Future can read and summarize inbox messages, draft email, and send only after your approval.",ready:"Active",manual:"Future Contacts",manualDesc:"Names, phones, emails and aliases in Future",phone:"iPhone / SIM Contacts",phoneDesc:"Direct access when a native app is available",native:"Native app",outlook:"Outlook / Microsoft 365",gmail:"Gmail",mailDesc:"Read, summarize and draft; send only after approval",connectOutlook:"Connect Outlook",connectGmail:"Connect Gmail",disconnect:"Disconnect",setupMicrosoft:"Configure Microsoft OAuth in Vercel",setupGoogle:"Configure Google OAuth in Vercel"
 };
 async function disconnect(){await fetch("/api/email/disconnect",{method:"POST"});setStatus(s=>({...s,connected:false,provider:undefined,email:undefined,name:undefined}));onRefresh()}
 const connected=(provider:"microsoft"|"google")=>status.connected&&status.provider===provider;
 const microsoftReady=status.microsoftConfigured ?? status.configured;
 const googleReady=status.googleConfigured ?? status.configured;
 return <section className="connectionsPanel dashboardCard">
  <div className="panelHeading"><div><span className="eyebrow">{t.eyebrow}</span><h3>{t.title}</h3></div><span className="phaseBadge">Gmail + Outlook</span></div>
  <p className="panelIntro">{t.note}</p>
  <div className="connectionList">
   <div className="connectionRow"><div className="connectionIcon">◎</div><div className="connectionCopy"><strong>{t.manual}</strong><span>{t.manualDesc}</span></div><span className="connectionReady">{t.ready}</span></div>
   <div className="connectionRow"><div className="connectionIcon">✉️</div><div className="connectionCopy"><strong>{t.outlook}</strong><span>{connected("microsoft")?status.email:t.mailDesc}</span></div>{connected("microsoft")?<button className="miniDisconnect" onClick={disconnect}>{t.disconnect}</button>:microsoftReady?<a className="connectButton" href="/api/email/microsoft/start">{t.connectOutlook}</a>:<span className="connectionLater">{t.setupMicrosoft}</span>}</div>
   <div className="connectionRow"><div className="connectionIcon">📧</div><div className="connectionCopy"><strong>{t.gmail}</strong><span>{connected("google")?status.email:t.mailDesc}</span></div>{connected("google")?<button className="miniDisconnect" onClick={disconnect}>{t.disconnect}</button>:googleReady?<a className="connectButton" href="/api/email/google/start">{t.connectGmail}</a>:<span className="connectionLater">{t.setupGoogle}</span>}</div>
   <div className="connectionRow"><div className="connectionIcon">☎</div><div className="connectionCopy"><strong>{t.phone}</strong><span>{t.phoneDesc}</span></div><span className="connectionLater">{t.native}</span></div>
  </div>
 </section>;
}
