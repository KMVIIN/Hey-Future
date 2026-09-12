import type { Locale } from "./i18n";
import { normalizeWorkflow, type Workflow, type WorkflowStepKind } from "./workflows";

export type AgentPlanResponse = {
  enabled: boolean;
  mode: "ai" | "fallback";
  reply?: string;
  workflow?: Workflow;
  error?: string;
};

export async function requestAgentPlan(text: string, locale: Locale): Promise<AgentPlanResponse> {
  try {
    const response = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, locale }) });
    if (!response.ok) return { enabled: false, mode: "fallback" };
    const data = await response.json();
    if (!data?.enabled || !data?.workflow) return { enabled: Boolean(data?.enabled), mode: "fallback" };
    return { enabled: true, mode: "ai", reply: typeof data.reply === "string" ? data.reply : undefined, workflow: normalizeWorkflow(data.workflow, locale, "ai") };
  } catch {
    return { enabled: false, mode: "fallback" };
  }
}

function l(locale: Locale, en: string, fr: string, th: string) {
  return locale === "th" ? th : locale === "fr" ? fr : en;
}

export function buildEmailWorkflow(locale: Locale, args: { to?: string; subject?: string; body?: string; summary?: string; sendRequested?: boolean }) {
  const steps: { kind: WorkflowStepKind; title: string; detail?: string; requiresApproval?: boolean; payload?: { to?: string; subject?: string; body?: string } }[] = [
    { kind: "email_draft", title: l(locale, "Prepare email draft", "Préparer le brouillon", "เตรียมร่างอีเมล"), detail: args.summary || args.body || "", payload: { to: args.to, subject: args.subject, body: args.body } },
  ];
  if (args.sendRequested) {
    steps.push({ kind: "email_send", title: l(locale, "Send email", "Envoyer l’e-mail", "ส่งอีเมล"), detail: l(locale, "Review recipient, subject and message before sending.", "Vérifiez le destinataire, l’objet et le message avant l’envoi.", "ตรวจผู้รับ หัวข้อ และข้อความก่อนส่ง"), requiresApproval: true, payload: { to: args.to, subject: args.subject, body: args.body } });
  }
  return normalizeWorkflow({ title: l(locale, "Email workflow", "Workflow e-mail", "เวิร์กโฟลว์อีเมล"), summary: args.summary || args.body || "", steps: steps.map((s, i) => ({ ...s, id: `email-${Date.now()}-${i}`, status: s.requiresApproval ? "waiting_approval" : "ready" })) }, locale, "local");
}

export function localWorkflowFromIntent(text: string, locale: Locale): Workflow | null {
  const lower = text.toLowerCase();
  const steps: { kind: WorkflowStepKind; title: string; detail?: string; url?: string; requiresApproval?: boolean }[] = [];

  const emailRead = /(?:check|read|show|summari[sz]e|latest|new|unread).*(?:email|mail|inbox)|(?:email|mail|inbox).*(?:check|read|show|summari[sz]e|latest|new|unread)|เช็ก.*อีเมล|เช็ค.*อีเมล|ดู.*อีเมล|อ่าน.*อีเมล|อีเมลใหม่|กล่องจดหมาย|vérif.*(?:mail|e-mail)|lire.*(?:mail|e-mail)|nouveaux? (?:mails|e-mails)|boîte de réception/i.test(text);
  const emailWrite = /(?:draft|write|compose|send|reply|email).*(?:email|mail|message)?|(?:send|reply).*(?:to|à)|ร่าง.*อีเมล|เขียน.*อีเมล|ส่ง.*อีเมล|ตอบ.*อีเมล|écris.*(?:mail|e-mail)|rédige.*(?:mail|e-mail)|envoie.*(?:mail|e-mail)|réponds?.*(?:mail|e-mail)/i.test(text);

  if (emailRead && !emailWrite) {
    steps.push({ kind: "email_read", title: l(locale, "Check inbox", "Consulter la boîte de réception", "ตรวจกล่องอีเมล"), detail: text });
  }

  if (/gift|cadeau|ของขวัญ|ซื้อ|buy|shopping|shop|ราคา|price|compare|เปรียบเทียบ/.test(lower)) {
    steps.push({ kind: "research", title: l(locale, "Research live options", "Rechercher des options en direct", "ค้นหาตัวเลือกจริง"), detail: text, url: `https://www.google.com/search?q=${encodeURIComponent(text)}` });
    steps.push({ kind: "note", title: l(locale, "Compare the best options", "Comparer les meilleures options", "เปรียบเทียบตัวเลือกที่ดีที่สุด"), detail: l(locale, "Shortlist by price, fit and usefulness.", "Sélectionner selon le prix et la pertinence.", "คัดตามราคา ความเหมาะสม และประโยชน์") });
  }
  if (/flight|hotel|trip|travel|vol|hôtel|voyage|เที่ยวบิน|โรงแรม|เดินทาง|จอง|book/.test(lower)) {
    steps.push({ kind: "research", title: l(locale, "Research travel options", "Rechercher les options de voyage", "ค้นหาตัวเลือกการเดินทาง"), detail: text, url: `https://www.google.com/travel/search?q=${encodeURIComponent(text)}` });
    steps.push({ kind: "booking", title: l(locale, "Prepare booking", "Préparer la réservation", "เตรียมการจอง"), detail: l(locale, "Future will wait for your confirmation before booking.", "Future attendra votre confirmation avant de réserver.", "Future จะรอการยืนยันก่อนจองจริง"), requiresApproval: true });
  }
  if (emailWrite && !emailRead) {
    const sendRequested = /send|ส่ง|envoie|envoyer/i.test(text);
    return buildEmailWorkflow(locale, { summary: text, body: text, sendRequested });
  }
  if (/calendar|schedule|meeting|agenda|calendrier|réunion|ปฏิทิน|ประชุม|นัด/.test(lower)) {
    steps.push({ kind: "calendar_read", title: l(locale, "Check calendar", "Vérifier le calendrier", "ตรวจปฏิทิน"), detail: text });
    steps.push({ kind: "calendar_write", title: l(locale, "Prepare calendar change", "Préparer la modification du calendrier", "เตรียมแก้ไขปฏิทิน"), detail: text });
  }
  if (/contact|phone|call|appelle|โทร|ติดต่อ/.test(lower)) steps.push({ kind: "contact_lookup", title: l(locale, "Find contact", "Trouver le contact", "ค้นหารายชื่อผู้ติดต่อ"), detail: text });
  if (/pay|payment|checkout|ชำระ|จ่าย|payer|paiement/.test(lower)) steps.push({ kind: "payment", title: l(locale, "Prepare payment", "Préparer le paiement", "เตรียมการชำระเงิน"), detail: l(locale, "Future never pays without your approval.", "Future ne paie jamais sans votre approbation.", "Future จะไม่จ่ายเงินโดยไม่มีการอนุมัติ"), requiresApproval: true });

  if (!steps.length) return null;
  return normalizeWorkflow({ title: l(locale, "Multi-step plan", "Plan en plusieurs étapes", "แผนงานหลายขั้นตอน"), summary: text, steps: steps.map((s, i) => ({ ...s, id: `local-${Date.now()}-${i}`, status: s.requiresApproval ? "waiting_approval" : "ready" })) }, locale, "local");
}
