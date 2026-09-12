"use client";
import type { Locale } from "@/lib/i18n";

export type EmailConnectionState = { configured: boolean; connected: boolean; email?: string; name?: string };

export default function ConnectionsPanel({ locale, email, onRefresh }: { locale: Locale; email: EmailConnectionState; onRefresh: () => void }) {
  const t = locale === "th" ? {
    eyebrow:"CONNECTIONS", title:"การเชื่อมต่อ", note:"Future ใช้ Contacts ของตัวเอง และเชื่อม Outlook / Microsoft 365 จริงแบบ OAuth เมื่อคุณต้องการ", ready:"พร้อมใช้", native:"Native app", manual:"Future Contacts", manualDesc:"ชื่อ เบอร์ อีเมล และชื่อเรียก เก็บในเครื่องของคุณ", phone:"iPhone / SIM Contacts", phoneDesc:"เชื่อมรายชื่อในเครื่องโดยตรงเมื่อมี native app", outlook:"Outlook / Microsoft 365", outlookDesc:"อ่านกล่องจดหมายและส่งอีเมลจริงหลังคุณอนุมัติ", connect:"เชื่อม Outlook", disconnect:"ยกเลิกการเชื่อม", setup:"ต้องตั้งค่า Microsoft OAuth ใน Vercel ก่อน"
  } : locale === "fr" ? {
    eyebrow:"CONNEXIONS", title:"Connexions", note:"Future garde ses propres contacts et peut connecter Outlook / Microsoft 365 par OAuth.", ready:"Actif", native:"App native", manual:"Future Contacts", manualDesc:"Noms, téléphones, e-mails et alias stockés sur votre appareil", phone:"Contacts iPhone / SIM", phoneDesc:"Accès direct lorsqu’une app native sera disponible", outlook:"Outlook / Microsoft 365", outlookDesc:"Lire la boîte de réception et envoyer uniquement après votre approbation", connect:"Connecter Outlook", disconnect:"Déconnecter", setup:"Configurez Microsoft OAuth dans Vercel d’abord"
  } : {
    eyebrow:"CONNECTIONS", title:"Connections", note:"Future keeps its own contacts and can connect Outlook / Microsoft 365 through OAuth.", ready:"Active", native:"Native app", manual:"Future Contacts", manualDesc:"Names, phones, emails and aliases stored on your device", phone:"iPhone / SIM Contacts", phoneDesc:"Direct access once Future has a native app", outlook:"Outlook / Microsoft 365", outlookDesc:"Read inbox and send real email only after your approval", connect:"Connect Outlook", disconnect:"Disconnect", setup:"Configure Microsoft OAuth in Vercel first"
  };

  async function disconnect() {
    await fetch("/api/email/disconnect", { method: "POST" });
    onRefresh();
  }

  return <section className="connectionsPanel dashboardCard">
    <div className="panelHeading"><div><span className="eyebrow">{t.eyebrow}</span><h3>{t.title}</h3></div><span className="phaseBadge">Outlook</span></div>
    <p className="panelIntro">{t.note}</p>
    <div className="connectionList">
      <div className="connectionRow"><div className="connectionIcon">◎</div><div className="connectionCopy"><strong>{t.manual}</strong><span>{t.manualDesc}</span></div><span className="connectionReady">{t.ready}</span></div>
      <div className="connectionRow"><div className="connectionIcon">✉</div><div className="connectionCopy"><strong>{t.outlook}</strong><span>{email.connected ? email.email : t.outlookDesc}</span></div>{email.connected ? <button className="miniDisconnect" onClick={disconnect}>{t.disconnect}</button> : email.configured ? <a className="connectButton" href="/api/email/microsoft/start">{t.connect}</a> : <span className="connectionLater">{t.setup}</span>}</div>
      <div className="connectionRow"><div className="connectionIcon">☎</div><div className="connectionCopy"><strong>{t.phone}</strong><span>{t.phoneDesc}</span></div><span className="connectionLater">{t.native}</span></div>
    </div>
  </section>;
}
