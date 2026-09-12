import type { Locale } from "@/lib/i18n";
import type { EmailMessageSummary } from "@/lib/email-types";

export default function EmailInboxCard({ locale, messages, loading, connected, onCheck }: { locale: Locale; messages: EmailMessageSummary[]; loading: boolean; connected: boolean; onCheck: () => void }) {
  const t = locale === "th"
    ? { title:"Outlook & Inbox", subtitle:"อ่านและสรุปอีเมลจริงจาก Outlook / Microsoft 365", check:"เช็กอีเมลล่าสุด", connect:"เชื่อม Outlook ใน Connections ก่อน", empty:"ยังไม่มีอีเมลที่โหลด" }
    : locale === "fr"
    ? { title:"Outlook & boîte de réception", subtitle:"Lire et résumer les e-mails Outlook / Microsoft 365", check:"Voir les e-mails récents", connect:"Connectez Outlook dans Connexions", empty:"Aucun e-mail chargé" }
    : { title:"Outlook & Inbox", subtitle:"Read and summarize real Outlook / Microsoft 365 mail", check:"Check recent email", connect:"Connect Outlook in Connections first", empty:"No email loaded yet" };

  return <section className="emailInbox dashboardCard">
    <div className="panelHeading"><div><span className="eyebrow">REAL OUTLOOK EMAIL</span><h3>{t.title}</h3></div><button className="softButton" disabled={!connected || loading} onClick={onCheck}>{loading ? "…" : t.check}</button></div>
    <p className="panelIntro">{connected ? t.subtitle : t.connect}</p>
    <div className="emailList">{messages.length ? messages.slice(0,4).map((m)=><div className="emailRow" key={m.id}><div className="emailDot">✉</div><div><strong>{m.subject}</strong><span>{m.from}</span><p>{m.snippet}</p></div></div>) : <div className="emptyMini">{t.empty}</div>}</div>
  </section>;
}
