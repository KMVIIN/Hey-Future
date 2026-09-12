import type { Locale } from "@/lib/i18n";
import type { Workflow } from "@/lib/workflows";

const icons: Record<string, string> = { research:"⌕", open_url:"↗", contact_lookup:"☎", calendar_read:"▦", calendar_write:"＋", email_read:"✉", email_draft:"✎", email_send:"➤", booking:"✈", payment:"€", note:"•" };

export default function WorkflowPanel({ workflows, locale, onOpen }: { workflows: Workflow[]; locale: Locale; onOpen: (url: string) => void }) {
  const t = locale === "th"
    ? { eyebrow: "WORKFLOWS", title: "แผนงานหลายขั้นตอน", empty: "เมื่อคำสั่งมีหลายขั้น Future จะวางแผนไว้ที่นี่", ai: "AI plan", local: "Local plan", approval: "รออนุมัติ", approved: "อนุมัติแล้ว", ready: "พร้อม", open: "เปิด" }
    : locale === "fr"
    ? { eyebrow: "WORKFLOWS", title: "Plans multi-étapes", empty: "Les demandes complexes apparaîtront ici sous forme de plan.", ai: "Plan IA", local: "Plan local", approval: "Validation", approved: "Approuvé", ready: "Prêt", open: "Ouvrir" }
    : { eyebrow: "WORKFLOWS", title: "Multi-step plans", empty: "Complex requests will appear here as an actionable plan.", ai: "AI plan", local: "Local plan", approval: "Approval", approved: "Approved", ready: "Ready", open: "Open" };
  return (
    <section className="workflowPanel">
      <div className="panelHeading"><div><span className="eyebrow">{t.eyebrow}</span><h3>{t.title}</h3></div><span className="workflowCount">{workflows.length}</span></div>
      {workflows.length === 0 ? <div className="workflowEmpty">{t.empty}</div> : workflows.slice().reverse().map((workflow) => (
        <article className="workflowCard" key={workflow.id}>
          <div className="workflowCardHead"><div><strong>{workflow.title}</strong><span>{workflow.summary}</span></div><span className={workflow.source === "ai" ? "sourceBadge ai" : "sourceBadge"}>{workflow.source === "ai" ? t.ai : t.local}</span></div>
          <div className="workflowSteps">
            {workflow.steps.map((step, index) => <div className="workflowStep" key={step.id}>
              <div className="stepRail"><span className="stepIcon">{icons[step.kind] || "•"}</span>{index < workflow.steps.length - 1 && <i />}</div>
              <div className="stepCopy"><strong>{step.title}</strong>{step.detail && <span>{step.detail}</span>}</div>
              <div className="stepAction">{step.requiresApproval && step.status === "waiting_approval" ? <span className="waitingBadge">{t.approval}</span> : step.requiresApproval && step.status === "approved" ? <span className="readyBadge">{t.approved}</span> : step.url ? <button className="miniAction" onClick={() => onOpen(step.url!)}>{t.open}</button> : <span className="readyBadge">{t.ready}</span>}</div>
            </div>)}
          </div>
        </article>
      ))}
    </section>
  );
}
