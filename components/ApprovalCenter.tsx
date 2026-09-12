import type { Approval } from "@/lib/workflows";
import type { Locale } from "@/lib/i18n";

export default function ApprovalCenter({ approvals, locale, onDecision }: { approvals: Approval[]; locale: Locale; onDecision: (approval: Approval, approved: boolean) => void | Promise<void> }) {
  const t = locale === "th"
    ? { eyebrow: "APPROVAL CENTER", title: "รอการอนุมัติ", empty: "ไม่มีงานสำคัญที่รออนุมัติ", approve: "อนุมัติและดำเนินการ", decline: "ยกเลิก", rule: "Future จะแสดงรายละเอียดก่อนส่งอีเมล จอง หรือชำระเงินทุกครั้ง", to: "ถึง", from: "จาก", subject: "หัวข้อ", message: "ข้อความ" }
    : locale === "fr"
    ? { eyebrow: "CENTRE D’APPROBATION", title: "En attente de validation", empty: "Aucune action sensible en attente", approve: "Approuver et exécuter", decline: "Annuler", rule: "Future affiche toujours les détails avant un envoi, une réservation ou un paiement.", to: "À", from: "De", subject: "Objet", message: "Message" }
    : { eyebrow: "APPROVAL CENTER", title: "Waiting for approval", empty: "No sensitive actions are waiting", approve: "Approve & execute", decline: "Cancel", rule: "Future always shows the details before sending, booking or paying.", to: "To", from: "From", subject: "Subject", message: "Message" };

  return (
    <section className="approvalCenter dashboardCard">
      <div className="panelHeading"><div><span className="eyebrow">{t.eyebrow}</span><h3>{t.title}</h3></div><span className="approvalCount">{approvals.length}</span></div>
      {approvals.length === 0 ? <div className="approvalEmpty">✓ {t.empty}</div> : approvals.map((approval) => (
        <div className="approvalItem approvalReview" key={approval.id}>
          <div className="approvalShield">◆</div>
          <div className="approvalCopy">
            <strong>{approval.title}</strong>
            {approval.detail && <span>{approval.detail}</span>}
            {approval.kind === "email_send" && (
              <div className="emailPreview">
                <div><span>{t.to}</span><b>{approval.payload?.to || "—"}</b></div>
                <div><span>{t.from}</span><b>{approval.payload?.from || "Connected email account"}</b></div>
                <div><span>{t.subject}</span><b>{approval.payload?.subject || "—"}</b></div>
                <div className="emailPreviewBody"><span>{t.message}</span><p>{approval.payload?.body || "—"}</p></div>
              </div>
            )}
          </div>
          <div className="approvalButtons"><button className="ghost" onClick={() => onDecision(approval, false)}>{t.decline}</button><button className="approveButton" onClick={() => onDecision(approval, true)}>{t.approve}</button></div>
        </div>
      ))}
      <div className="safetyRule">🔐 {t.rule}</div>
    </section>
  );
}
