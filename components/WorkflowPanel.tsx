"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Workflow } from "@/lib/workflows";

const icons: Record<string, string> = { research:"⌕", open_url:"↗", contact_lookup:"☎", calendar_read:"▦", calendar_write:"＋", email_read:"✉", email_draft:"✎", email_send:"➤", booking:"✈", payment:"€", note:"•" };

export default function WorkflowPanel({ workflows, locale, onOpen, onDelete, onTogglePause, onEdit }: { workflows: Workflow[]; locale: Locale; onOpen: (url: string) => void; onDelete: (id: string) => void; onTogglePause: (id: string) => void; onEdit: (id: string, title: string, summary: string) => void; }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const t = locale === "th"
    ? { eyebrow: "WORKFLOWS", title: "แผนงานหลายขั้นตอน", empty: "เมื่อคำสั่งมีหลายขั้น Future จะวางแผนไว้ที่นี่", ai: "AI plan", local: "Local plan", approval: "รออนุมัติ", approved: "อนุมัติแล้ว", ready: "พร้อม", open: "เปิด", edit: "แก้ไข", pause: "พัก", resume: "ทำต่อ", del: "ลบ", save: "บันทึก", cancel: "ยกเลิก", paused: "พักไว้", confirm: "ลบ workflow นี้และรายการอนุมัติที่เกี่ยวข้องหรือไม่?" }
    : locale === "fr"
    ? { eyebrow: "WORKFLOWS", title: "Plans multi-étapes", empty: "Les demandes complexes apparaîtront ici sous forme de plan.", ai: "Plan IA", local: "Plan local", approval: "Validation", approved: "Approuvé", ready: "Prêt", open: "Ouvrir", edit: "Modifier", pause: "Pause", resume: "Reprendre", del: "Supprimer", save: "Enregistrer", cancel: "Annuler", paused: "En pause", confirm: "Supprimer ce workflow et ses validations associées ?" }
    : { eyebrow: "WORKFLOWS", title: "Multi-step plans", empty: "Complex requests will appear here as an actionable plan.", ai: "AI plan", local: "Local plan", approval: "Approval", approved: "Approved", ready: "Ready", open: "Open", edit: "Edit", pause: "Pause", resume: "Resume", del: "Delete", save: "Save", cancel: "Cancel", paused: "Paused", confirm: "Delete this workflow and its related approvals?" };

  function beginEdit(workflow: Workflow) {
    setEditingId(workflow.id); setEditTitle(workflow.title); setEditSummary(workflow.summary);
  }

  return (
    <section className="workflowPanel">
      <div className="panelHeading"><div><span className="eyebrow">{t.eyebrow}</span><h3>{t.title}</h3></div><span className="workflowCount">{workflows.length}</span></div>
      {workflows.length === 0 ? <div className="workflowEmpty">{t.empty}</div> : workflows.slice().reverse().map((workflow) => (
        <article className={`workflowCard ${workflow.status === "paused" ? "paused" : ""}`} key={workflow.id}>
          <div className="workflowCardHead">
            {editingId === workflow.id ? <div className="workflowEditFields"><input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} /><textarea rows={2} value={editSummary} onChange={(e)=>setEditSummary(e.target.value)} /></div> : <div><strong>{workflow.title}</strong><span>{workflow.summary}</span></div>}
            <span className={workflow.source === "ai" ? "sourceBadge ai" : "sourceBadge"}>{workflow.status === "paused" ? t.paused : workflow.source === "ai" ? t.ai : t.local}</span>
          </div>
          {editingId === workflow.id ? <div className="workflowManageRow"><button className="ghost" onClick={()=>setEditingId(null)}>{t.cancel}</button><button className="primary compact" onClick={()=>{onEdit(workflow.id, editTitle.trim() || workflow.title, editSummary.trim()); setEditingId(null);}}>{t.save}</button></div> : <div className="workflowManageRow"><button onClick={()=>beginEdit(workflow)}>{t.edit}</button><button onClick={()=>onTogglePause(workflow.id)}>{workflow.status === "paused" ? t.resume : t.pause}</button><button className="dangerText" onClick={()=>{if(window.confirm(t.confirm)) onDelete(workflow.id);}}>{t.del}</button></div>}
          <div className="workflowSteps">
            {workflow.steps.map((step, index) => <div className="workflowStep" key={step.id}>
              <div className="stepRail"><span className="stepIcon">{icons[step.kind] || "•"}</span>{index < workflow.steps.length - 1 && <i />}</div>
              <div className="stepCopy"><strong>{step.title}</strong>{step.detail && <span>{step.detail}</span>}</div>
              <div className="stepAction">{workflow.status === "paused" ? <span className="waitingBadge">{t.paused}</span> : step.requiresApproval && step.status === "waiting_approval" ? <span className="waitingBadge">{t.approval}</span> : step.requiresApproval && step.status === "approved" ? <span className="readyBadge">{t.approved}</span> : step.url ? <button className="miniAction" onClick={() => onOpen(step.url!)}>{t.open}</button> : <span className="readyBadge">{t.ready}</span>}</div>
            </div>)}
          </div>
        </article>
      ))}
    </section>
  );
}
