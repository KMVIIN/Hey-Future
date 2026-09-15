"use client";

import { useEffect, useMemo, useState } from "react";
import FutureInput from "@/components/FutureInput";
import Timeline from "@/components/Timeline";
import NotificationCenter from "@/components/NotificationCenter";
import ActionCard from "@/components/ActionCard";
import InstallPanel from "@/components/InstallPanel";
import EclipseBrand from "@/components/EclipseBrand";
import WorkflowPanel from "@/components/WorkflowPanel";
import CalendarMonthView from "@/components/CalendarMonthView";
import SchedulePanel from "@/components/SchedulePanel";
import NotesPanel from "@/components/NotesPanel";
import SearchDiscover, { type SearchPlace } from "@/components/SearchDiscover";
import PlaceMap from "@/components/PlaceMap";
import CustomizeLayoutPanel from "@/components/CustomizeLayoutPanel";
import ApprovalCenter from "@/components/ApprovalCenter";
import ConnectionsPanel, { type EmailConnectionState } from "@/components/ConnectionsPanel";
import EmailInboxCard from "@/components/EmailInboxCard";
import ContactsHub from "@/components/ContactsHub";
import WorkspaceModal from "@/components/WorkspaceModal";
import HistoryPanel from "@/components/HistoryPanel";
import OrdersPanel from "@/components/OrdersPanel";
import WhatsAppPanel from "@/components/WhatsAppPanel";
import MiniChat from "@/components/MiniChat";
import MapLauncher from "@/components/MapLauncher";
import AccountingPanel from "@/components/AccountingPanel";
import SaaSGate from "@/components/SaaSGate";
import { createClient } from "@/lib/supabase/client";
import CloudSync from "@/components/CloudSync";
import { loadOrders, saveOrders, type FutureOrder } from "@/lib/orders";
import { ClarificationError } from "@/lib/parser";
import { parseCommands } from "@/lib/multicommand";
import { isLikelyDuplicate, loadItems, materialize, purgeExpiredCompleted, saveItems } from "@/lib/storage";
import { registerFutureServiceWorker, resetNotifiedStateForItem, runDueReminderCheck } from "@/lib/notifications";
import { reminderSpeech, speakFuture } from "@/lib/speech";
import { detectLocale } from "@/lib/language";
import { webActionSpeech, type WebAction } from "@/lib/actions";
import { routeAssistantInput } from "@/lib/router";
import { assistantSavedReply, makeMessage, type ConversationMessage } from "@/lib/conversation";
import { answerQuestion } from "@/lib/questions";
import type { FutureItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { buildEmailWorkflow, localWorkflowFromIntent, requestAgentPlan } from "@/lib/agent";
import { applyApproval, approvalsForWorkflow, loadApprovals, loadWorkflows, saveApprovals, saveWorkflows, type Approval, type Workflow } from "@/lib/workflows";
import { contactIntentToAction, findContact, loadContacts, parseContactIntent, saveContacts, type FutureContact } from "@/lib/contacts";
import type { EmailMessageSummary } from "@/lib/email-types";

export default function Home() {
  const [items, setItems] = useState<FutureItem[]>([]);
  const [locale, setLocale] = useState<Locale>("fr");
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState<{ existing: FutureItem; incoming: FutureItem } | null>(null);
  const [pending, setPending] = useState<{ text: string; locale: Locale } | null>(null);
  const [liveAlert, setLiveAlert] = useState<{ title: string; locale: Locale } | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [actions, setActions] = useState<WebAction[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [workflowHydrated, setWorkflowHydrated] = useState(false);
  const [agentMode, setAgentMode] = useState<"local" | "ai">("local");
  const [contacts, setContacts] = useState<FutureContact[]>([]);
  const [emailConnection, setEmailConnection] = useState<EmailConnectionState>({ configured: false, connected: false });
  const [emailMessages, setEmailMessages] = useState<EmailMessageSummary[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [orders, setOrders] = useState<FutureOrder[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<null | "tasks" | "calendar" | "email" | "whatsapp" | "search" | "map" | "travel" | "shopping" | "orders" | "contacts" | "accounting" | "workflow" | "history" | "connections" | "approval" | "settings" | "customize">(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMapPlace, setSelectedMapPlace] = useState<SearchPlace | null>(null);
  const [accountMode, setAccountMode] = useState<{signedIn:boolean;plan:string;name?:string}>({signedIn:false,plan:"guest"});
  const t = copy[locale];

  useEffect(() => {
    setItems(loadItems());
    setContacts(loadContacts());
    setWorkflows(loadWorkflows());
    setApprovals(loadApprovals());
    setOrders(loadOrders());
    setWorkflowHydrated(true);
    const stored = localStorage.getItem("future.locale") as Locale | null;
    const detected: Locale = navigator.language.startsWith("th") ? "th" : navigator.language.startsWith("fr") ? "fr" : "en";
    const nextLocale = stored && ["en", "fr", "th"].includes(stored) ? stored : detected;
    setLocale(nextLocale);
    refreshEmailConnection();
    try {
      const raw = localStorage.getItem("future.layout.v2");
      if (raw) {
        const x = JSON.parse(raw);
        document.documentElement.dataset.futureTheme = x.theme || "lavender";
        document.documentElement.dataset.futureDensity = x.density || "comfortable";
        document.documentElement.dataset.futureLayout = x.layout || "classic";
        document.documentElement.dataset.futureBgScope = x.bgScope || "none";
        document.documentElement.dataset.futureBgPreset = x.bgPreset || "none";
        if (x.bgImage) document.documentElement.style.setProperty("--future-user-bg", `url(${x.bgImage})`);
      }
    } catch {}
  }, []);


  useEffect(() => {
    let alive=true;
    async function loadAccount(){
      try{
        const r=await fetch("/api/auth/user",{cache:"no-store"});
        const identity=await r.json();
        if(!alive)return;
        if(!r.ok||!identity.authenticated){setAccountMode({signedIn:false,plan:"guest"});return;}
        setAccountMode({signedIn:true,plan:"free",name:identity.user.name});
        const usage=await fetch("/api/account/usage",{cache:"no-store"});
        if(usage.ok){const d=await usage.json();if(alive)setAccountMode({signedIn:true,plan:String(d.plan||"free"),name:identity.user.name});}
      }catch{if(alive)setStatus("Could not verify your Future account. Please refresh.");}
    }
    void loadAccount();return()=>{alive=false};
  }, []);

  async function signOut(){
    const client=await createClient();
    if(!client){setStatus("Sign out unavailable. Please retry.");return;}
    const {error}=await client.auth.signOut();
    if(error){setStatus(error.message);return;}
    location.href="/";
  }

  useEffect(() => {
    if (!workflowHydrated) return;
    saveWorkflows(workflows);
  }, [workflows, workflowHydrated]);

  useEffect(() => {
    if (!workflowHydrated) return;
    saveApprovals(approvals);
  }, [approvals, workflowHydrated]);

  useEffect(() => {
    registerFutureServiceWorker();
    const check = async () => {
      const due = await runDueReminderCheck(items, locale);
      for (const item of due) {
        const itemLocale = detectLocale(item.rawText || item.title, locale);
        setLiveAlert({ title: item.title, locale: itemLocale });
        const spoken = reminderSpeech(itemLocale, item.title);
        speakFuture(spoken, itemLocale);
        setMessages((prev) => [...prev, makeMessage("assistant", spoken)]);
      }
    };
    check();
    const timer = window.setInterval(check, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [items, locale]);


  async function refreshEmailConnection() {
    try {
      const response = await fetch("/api/email/status", { cache: "no-store" });
      const data = await response.json();
      setEmailConnection({ configured: Boolean(data.configured), connected: Boolean(data.connected), email: data.email, name: data.name });
    } catch {
      setEmailConnection({ configured: false, connected: false });
    }
  }

  async function checkInbox(commandLocale: Locale = locale) {
    if (!emailConnection.connected) {
      const reply = commandLocale === "th" ? "ยังไม่ได้เชื่อมอีเมลจริง เปิด Connections แล้วเชื่อม Outlook ก่อน" : commandLocale === "fr" ? "L’e-mail n’est pas encore connecté. Connectez Outlook dans Connexions." : "Email is not connected yet. Connect Outlook in Connections first.";
      setStatus(reply); say(reply, commandLocale); return false;
    }
    setEmailLoading(true);
    try {
      const response = await fetch("/api/email/inbox", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not read inbox");
      const next = Array.isArray(data.messages) ? data.messages : [];
      setEmailMessages(next);
      const reply = commandLocale === "th" ? `ฉันเช็กอีเมลแล้ว พบ ${next.length} รายการล่าสุด` : commandLocale === "fr" ? `J’ai vérifié la boîte de réception : ${next.length} e-mail(s) récent(s).` : `I checked your inbox and found ${next.length} recent message(s).`;
      setStatus(reply); say(reply, commandLocale); return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read inbox";
      setStatus(message); say(message, commandLocale); return false;
    } finally { setEmailLoading(false); }
  }

  function changeLocale(next: Locale) {
    setLocale(next); localStorage.setItem("future.locale", next); setStatus("");
  }
  function persist(next: FutureItem[]) { const clean = purgeExpiredCompleted(next); setItems(clean); saveItems(clean); }
  function persistContacts(next: FutureContact[]) { setContacts(next); saveContacts(next); }
  function persistOrders(next: FutureOrder[]) { setOrders(next); saveOrders(next); }
  function say(text: string, commandLocale: Locale) {
    setMessages((prev) => [...prev, makeMessage("assistant", text)]);
    speakFuture(text, commandLocale);
  }

  async function handleCommand(text: string, detectedLocale: Locale) {
    const commandLocale = detectedLocale;
    const combinedText = pending ? `${pending.text} ${text}` : text;
    setMessages((prev) => [...prev, makeMessage("user", text)]);

    const isEmailReadRequest = /(?:check|read|show|summari[sz]e|latest|new|unread).*(?:email|mail|inbox)|(?:email|mail|inbox).*(?:check|read|show|summari[sz]e|latest|new|unread)|เช็ก.*อีเมล|เช็ค.*อีเมล|ดู.*อีเมล|อ่าน.*อีเมล|อีเมลใหม่|กล่องจดหมาย|vérif.*(?:mail|e-mail)|lire.*(?:mail|e-mail)|nouveaux? (?:mails|e-mails)|boîte de réception/i.test(combinedText);
    if (isEmailReadRequest) {
      const ok = await checkInbox(commandLocale);
      if (ok) {
        const wf = localWorkflowFromIntent(combinedText, commandLocale);
        if (wf) setWorkflows((prev) => [...prev, { ...wf, steps: wf.steps.map((step) => step.kind === "email_read" ? { ...step, status: "done" } : step) }]);
      }
      setPending(null);
      return;
    }

    // Phase 2: resolve calls/messages/email against Future Contacts before web or AI fallback.
    const contactIntent = parseContactIntent(combinedText);
    if (contactIntent) {
      const resolved = findContact(contacts, contactIntent.target);
      if (resolved.match) {
        if (contactIntent.kind === "email" && resolved.match.emails[0]) {
          const explicitSend = /^(?:send|email|mail|ส่งอีเมล|envoie)/i.test(combinedText.trim()) && !/^(?:write|draft|compose|เขียน|ร่าง|écris|rédige)/i.test(combinedText.trim());
          const wf = buildEmailWorkflow(commandLocale, { to: resolved.match.emails[0], subject: commandLocale === "th" ? `ข้อความถึง ${resolved.match.name}` : commandLocale === "fr" ? `Message pour ${resolved.match.name}` : `Message for ${resolved.match.name}`, body: contactIntent.body || combinedText, summary: combinedText, sendRequested: explicitSend });
          setWorkflows((prev) => [...prev, wf]);
          setApprovals((prev) => [...prev, ...approvalsForWorkflow(wf)]);
          setPending(null);
          const reply = explicitSend ? (commandLocale === "th" ? `ฉันเตรียมอีเมลถึง ${resolved.match.name} แล้ว ตรวจรายละเอียดใน Approval Center ก่อนส่งจริง` : commandLocale === "fr" ? `J’ai préparé l’e-mail pour ${resolved.match.name}. Vérifiez-le dans le Centre d’approbation avant l’envoi.` : `I prepared the email to ${resolved.match.name}. Review it in Approval Center before it is sent.`) : (commandLocale === "th" ? `ฉันเตรียมร่างอีเมลถึง ${resolved.match.name} แล้ว และยังไม่ได้ส่ง` : commandLocale === "fr" ? `J’ai préparé le brouillon pour ${resolved.match.name}. Il n’a pas été envoyé.` : `I prepared the draft to ${resolved.match.name}. It has not been sent.`);
          setStatus(reply); say(reply, commandLocale);
          return;
        }
        const contactAction = contactIntentToAction(contactIntent, resolved.match, commandLocale);
        if (contactAction) {
          setActions((prev) => [...prev, contactAction]);
          setPending(null);
          const reply = contactIntent.kind === "call"
            ? (commandLocale === "th" ? `เจอ ${resolved.match.name} แล้ว ฉันเตรียมปุ่มโทรให้คุณ` : commandLocale === "fr" ? `J’ai trouvé ${resolved.match.name}. L’appel est prêt.` : `I found ${resolved.match.name}. The call is ready.`)
            : (commandLocale === "th" ? `เจอ ${resolved.match.name} แล้ว ฉันเตรียมข้อความให้คุณตรวจและเปิดแอปข้อความ` : commandLocale === "fr" ? `J’ai trouvé ${resolved.match.name}. Le message est prêt à vérifier.` : `I found ${resolved.match.name}. The message is ready to review.`);
          setStatus(reply); say(reply, commandLocale);
          return;
        }
        const missing = contactIntent.kind === "email" ? "email" : "phone";
        const reply = commandLocale === "th" ? `ฉันเจอ ${resolved.match.name} แต่ยังไม่มี${missing === "email" ? "อีเมล" : "เบอร์โทร"}ใน Future Contacts` : commandLocale === "fr" ? `J’ai trouvé ${resolved.match.name}, mais il manque ${missing === "email" ? "l’e-mail" : "le numéro de téléphone"}.` : `I found ${resolved.match.name}, but the ${missing} is missing.`;
        setStatus(reply); say(reply, commandLocale); return;
      }
      if (contacts.length) {
        const names = resolved.alternatives.map(c => c.name).join(", ");
        const reply = commandLocale === "th" ? `ฉันยังไม่พบ “${contactIntent.target}” ใน Future Contacts${names ? ` ใกล้เคียง: ${names}` : ""}` : commandLocale === "fr" ? `Je ne trouve pas « ${contactIntent.target} » dans Future Contacts${names ? `. Proches : ${names}` : ""}.` : `I can't find “${contactIntent.target}” in Future Contacts${names ? `. Closest: ${names}` : ""}.`;
        setStatus(reply); say(reply, commandLocale); return;
      }
    }

    // Future 3.0: ask the optional server-side AI planner first.
    // If no OPENAI_API_KEY exists, the route returns immediately and Day 2.3 remains the fallback.
    const likelyAgentAction = /(?:send|email|mail|book|booking|buy|purchase|pay|schedule|remind|call|message|reserve|cancel|ส่ง|อีเมล|จอง|ซื้อ|จ่าย|เตือน|โทร|ข้อความ|réserver|acheter|payer|envoyer|rappeler|appeler)/i.test(combinedText);
    const agentPlan = likelyAgentAction ? await requestAgentPlan(combinedText, commandLocale) : { enabled: false, mode: "fallback" as const, reply: undefined, workflow: undefined };
    if (agentPlan.workflow) {
      setAgentMode("ai");
      setWorkflows((prev) => [...prev, agentPlan.workflow!]);
      setApprovals((prev) => [...prev, ...approvalsForWorkflow(agentPlan.workflow!)]);
      setPending(null);
      const reply = agentPlan.reply || (commandLocale === "th" ? "ฉันวางแผนงานหลายขั้นตอนให้แล้ว ตรวจดูแผนและจุดที่ต้องอนุมัติได้เลย" : commandLocale === "fr" ? "J’ai préparé un plan en plusieurs étapes. Vérifiez le workflow et les validations nécessaires." : "I prepared a multi-step plan. Review the workflow and any approvals before Future continues.");
      setStatus(reply); say(reply, commandLocale);
      return;
    }

    // €0 fallback: detect useful multi-step intents locally without any AI API cost.
    const localWorkflow = localWorkflowFromIntent(combinedText, commandLocale);
    if (localWorkflow) {
      setAgentMode("local");
      setWorkflows((prev) => [...prev, localWorkflow]);
      setApprovals((prev) => [...prev, ...approvalsForWorkflow(localWorkflow)]);
      setPending(null);
      const reply = commandLocale === "th" ? "ฉันแยกคำสั่งนี้เป็น workflow ให้แล้ว งานสำคัญจะหยุดรอการอนุมัติจากคุณ" : commandLocale === "fr" ? "J’ai transformé cette demande en workflow. Les actions sensibles attendront votre validation." : "I turned that into a workflow. Sensitive actions will wait for your approval.";
      setStatus(reply); say(reply, commandLocale);
      return;
    }

    const routed = routeAssistantInput(combinedText, commandLocale);
    const actionCommands = routed.filter((x): x is Extract<typeof x, { kind: "action" }> => x.kind === "action");
    const questionCommands = routed.filter((x): x is Extract<typeof x, { kind: "question" }> => x.kind === "question");
    const memoryCommands = routed.filter((x): x is Extract<typeof x, { kind: "memory" }> => x.kind === "memory");

    const nextActions = actionCommands.map((x) => x.action);
    if (nextActions.length) {
      setActions((prev) => [...prev, ...nextActions]);
      // Typed Send is a user gesture, so immediate actions can usually open now.
      // Safari may block extra tabs or actions originating from speech callbacks; cards remain as fallback.
      nextActions.forEach((action) => { try { window.open(action.url, "_blank", "noopener,noreferrer"); } catch {} });
    }

    const answers: string[] = [];
    for (const question of questionCommands) {
      let aiText = "";
      try {
        const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: question.text, locale: commandLocale }) });
        const data = await response.json();
        if (response.ok && typeof data?.answer === "string") aiText = data.answer.trim();
        else if (response.status === 429) aiText = commandLocale === "th" ? "คุณใช้โควตา AI ของเดือนนี้ครบแล้ว สามารถอัปเกรดแพ็กเกจได้ที่ Account" : commandLocale === "fr" ? "Votre quota IA mensuel est atteint. Vous pouvez changer de formule dans Account." : "You've reached this month's AI allowance. You can upgrade in Account.";
      } catch {}
      if (!aiText) {
        const answered = await answerQuestion(question.text, commandLocale);
        if (answered?.text) aiText = answered.text;
      }
      if (aiText) {
        answers.push(aiText);
        setMessages((prev) => [...prev, makeMessage("assistant", aiText)]);
        speakFuture(aiText, commandLocale);
      }
    }

    try {
      const incomingItems: FutureItem[] = [];
      for (const memory of memoryCommands) {
        const parsed = parseCommands(memory.text, new Date(), commandLocale);
        incomingItems.push(...parsed.map(materialize));
      }

      if (incomingItems.length) {
        const firstDuplicate = incomingItems
          .map((incoming) => ({ incoming, existing: items.find((item) => isLikelyDuplicate(item, incoming)) }))
          .find((x) => x.existing);
        if (firstDuplicate?.existing) {
          setDuplicate({ existing: firstDuplicate.existing, incoming: firstDuplicate.incoming });
          setPending(null);
          const reply = commandLocale === "th" ? "ฉันพบรายการที่อาจซ้ำ ต้องการเก็บรายการไหน?" : commandLocale === "fr" ? "J’ai trouvé un élément qui semble déjà exister. Lequel souhaitez-vous garder ?" : "I found something that looks duplicated. Which one should I keep?";
          setStatus(reply); say(reply, commandLocale); return;
        }
        persist([...items, ...incomingItems]);
        incomingItems.forEach((incoming) => resetNotifiedStateForItem(incoming.id));
      }

      setPending(null);
      let reply = "";
      if (incomingItems.length && nextActions.length) {
        reply = commandLocale === "th"
          ? `เรียบร้อย ฉันบันทึก ${incomingItems.length} รายการ และเตรียม ${nextActions.length} งานให้ทำทันทีแล้ว`
          : commandLocale === "fr"
          ? `C’est prêt. J’ai enregistré ${incomingItems.length} élément(s) et préparé ${nextActions.length} action(s) immédiate(s).`
          : `Done. I saved ${incomingItems.length} item(s) and prepared ${nextActions.length} immediate action(s).`;
      } else if (incomingItems.length) {
        reply = assistantSavedReply(commandLocale, incomingItems);
      } else if (nextActions.length) {
        reply = nextActions.length === 1
          ? webActionSpeech(nextActions[0])
          : commandLocale === "th"
          ? `ฉันแยกและเตรียม ${nextActions.length} งานให้ทำทันทีแล้ว`
          : commandLocale === "fr"
          ? `J’ai séparé et préparé ${nextActions.length} actions immédiates.`
          : `I separated and prepared ${nextActions.length} immediate actions.`;
      } else if (answers.length) {
        reply = answers[answers.length - 1];
      } else {
        try {
          const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: combinedText, locale: commandLocale }) });
          const data = await response.json();
          reply = response.ok && typeof data?.answer === "string" ? data.answer : (commandLocale === "th" ? "ฉันยังตอบคำถามนี้ไม่ได้ในตอนนี้" : commandLocale === "fr" ? "Je ne peux pas répondre à cette question pour le moment." : "I can't answer that right now.");
        } catch {
          reply = commandLocale === "th" ? "ฉันยังตอบคำถามนี้ไม่ได้ในตอนนี้" : commandLocale === "fr" ? "Je ne peux pas répondre à cette question pour le moment." : "I can't answer that right now.";
        }
      }
      setStatus(reply);
      if (!answers.length || incomingItems.length || nextActions.length) say(reply, commandLocale);
    } catch (error) {
      if (error instanceof ClarificationError) {
        setPending({ text: combinedText, locale: commandLocale });
        setStatus(error.message); say(error.message, commandLocale); return;
      }
      const reply = commandLocale === "th" ? "ฉันยังไม่แน่ใจว่าต้องทำอะไร ลองพูดใหม่อีกครั้งได้ไหม?" : commandLocale === "fr" ? "Je ne suis pas encore certaine d’avoir compris. Pouvez-vous reformuler ?" : "I’m not quite sure what you want me to do yet. Could you say that another way?";
      setStatus(reply); say(reply, commandLocale);
    }
  }


  async function handleApproval(approval: Approval, approved: boolean) {
    if (!approved) {
      setApprovals((prev) => prev.filter((item) => item.id !== approval.id));
      setWorkflows((prev) => prev.map((workflow) => workflow.id === approval.workflowId ? applyApproval(workflow, approval, false) : workflow));
      const reply = locale === "th" ? `ยกเลิกแล้ว: ${approval.title}` : locale === "fr" ? `Annulé : ${approval.title}` : `Cancelled: ${approval.title}`;
      setStatus(reply); say(reply, locale); return;
    }

    if (approval.kind === "email_send") {
      const payload = approval.payload || {};
      if (!emailConnection.connected) {
        const reply = locale === "th" ? "ยังส่งไม่ได้ เพราะยังไม่ได้เชื่อม Outlook ใน Connections" : locale === "fr" ? "Impossible d’envoyer : Outlook n’est pas connecté dans Connexions." : "I can’t send yet because Outlook is not connected in Connections.";
        setStatus(reply); say(reply, locale); return;
      }
      if (!payload.to || !payload.subject || !payload.body) {
        const reply = locale === "th" ? "ยังส่งไม่ได้ ต้องมีผู้รับ หัวข้อ และข้อความครบก่อน" : locale === "fr" ? "Impossible d’envoyer : destinataire, objet et message sont requis." : "I can’t send yet. Recipient, subject and message are required.";
        setStatus(reply); say(reply, locale); return;
      }
      const response = await fetch("/api/email/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, approved: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reply = String(data.error || "Email send failed");
        setStatus(reply); say(reply, locale); return;
      }
      setApprovals((prev) => prev.filter((item) => item.id !== approval.id));
      setWorkflows((prev) => prev.map((workflow) => workflow.id === approval.workflowId ? applyApproval(workflow, approval, true, true) : workflow));
      const reply = locale === "th" ? `ส่งอีเมลจริงแล้วถึง ${payload.to}` : locale === "fr" ? `E-mail envoyé à ${payload.to}.` : `Email sent to ${payload.to}.`;
      setStatus(reply); say(reply, locale); return;
    }

    setApprovals((prev) => prev.filter((item) => item.id !== approval.id));
    setWorkflows((prev) => prev.map((workflow) => workflow.id === approval.workflowId ? applyApproval(workflow, approval, true) : workflow));
    const reply = locale === "th" ? `อนุมัติแล้ว: ${approval.title} — Future จะยังไม่จ่ายเงินหรือจองจริงจนกว่าจะเชื่อมบริการนั้น` : locale === "fr" ? `Approuvé : ${approval.title}. Future n’exécutera pas de paiement ou réservation sans connexion réelle.` : `Approved: ${approval.title}. Future still will not pay or book until that real service is connected.`;
    setStatus(reply); say(reply, locale);
  }

  function addCalendarItem(item: Omit<FutureItem, "id" | "createdAt">) {
    const incoming: FutureItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    persist([...items, incoming]);
    resetNotifiedStateForItem(incoming.id);
  }
  function updateCalendarItem(id: string, patch: Partial<FutureItem>) {
    resetNotifiedStateForItem(id);
    persist(items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  function deleteWorkflow(id: string) {
    setWorkflows((prev) => prev.filter((workflow) => workflow.id !== id));
    setApprovals((prev) => prev.filter((approval) => approval.workflowId !== id));
  }
  function toggleWorkflowPause(id: string) {
    setWorkflows((prev) => prev.map((workflow) => workflow.id === id ? { ...workflow, status: workflow.status === "paused" ? (workflow.steps.some((s) => s.status === "waiting_approval") ? "awaiting_approval" : "ready") : "paused" } : workflow));
  }
  function editWorkflow(id: string, title: string, summary: string) {
    setWorkflows((prev) => prev.map((workflow) => workflow.id === id ? { ...workflow, title, summary } : workflow));
  }

  function deleteItem(id: string) { resetNotifiedStateForItem(id); persist(items.filter((item) => item.id !== id)); }
  function restoreItem(id: string) { persist(items.map((item) => item.id === id ? { ...item, completedAt: undefined } : item)); }
  function completeItem(id: string) {
    resetNotifiedStateForItem(id);
    persist(items.map((item) => item.id === id ? { ...item, completedAt: new Date().toISOString() } : item));
    const item = items.find((x) => x.id === id);
    if (item) { const msg = locale === "th" ? `ทำเครื่องหมายเสร็จแล้ว: ${item.title}` : locale === "fr" ? `Terminé : ${item.title}` : `Marked done: ${item.title}`; say(msg, locale); }
  }

  const todayItems = useMemo(() => {
    const now = new Date();
    return items.filter((item) => !item.completedAt && new Date(item.startsAt ?? item.dueAt ?? item.remindAt ?? 0).toDateString() === now.toDateString());
  }, [items]);

  const nextItem = useMemo(() => items.filter((item)=>!item.completedAt).map((item) => ({ item, date: new Date(item.startsAt ?? item.dueAt ?? item.remindAt ?? 0) })).filter((x) => x.date.getTime() >= Date.now()).sort((a,b)=>a.date.getTime()-b.date.getTime())[0], [items]);

  return (
    <SaaSGate>
      <CloudSync />
      <main className="futureAppShell">
      <aside className={`futureSidebar ${mobileMenuOpen ? "mobileOpen" : ""}`}>
        <div className="sideBrand"><EclipseBrand /></div>
        <div className="sideNavTabs" aria-label="Sidebar navigation shortcuts">
          <button onClick={()=>document.querySelector<HTMLElement>(".sideNav")?.scrollTo({top:0,behavior:"smooth"})}>Main</button>
          <button onClick={()=>document.querySelector<HTMLElement>(".sideNav")?.scrollTo({top:700,behavior:"smooth"})}>More</button>
        </div>
        <nav className="sideNav" onClick={()=>setMobileMenuOpen(false)}>
          <button className="active" onClick={()=>setActiveWorkspace(null)}>⌂ <span>Home</span></button>
          <button onClick={()=>setActiveWorkspace("tasks")}>☑ <span>Tasks</span></button>
          <button onClick={()=>setActiveWorkspace("calendar")}>▦ <span>Calendar</span></button>
          <button onClick={()=>setActiveWorkspace("email")}>✉ <span>Email</span></button>
          <button onClick={()=>setActiveWorkspace("whatsapp")}>◉ <span>WhatsApp</span><b className="navNew">NEW</b></button>
          <button onClick={()=>setActiveWorkspace("search")}>⌕ <span>Search & Discover</span></button>
          <button onClick={()=>setActiveWorkspace("map")}>⌖ <span>Map & Places</span></button>
          <button onClick={()=>setActiveWorkspace("travel")}>✈ <span>Travel & Booking</span></button>
          <button onClick={()=>setActiveWorkspace("shopping")}>◇ <span>Shopping</span></button>
          <button onClick={()=>setActiveWorkspace("orders")}>▣ <span>Orders & Deliveries</span></button>
          <button onClick={()=>setActiveWorkspace("contacts")}>☎ <span>Calls & Contacts</span></button>
          <button onClick={()=>setActiveWorkspace("accounting")}>▤ <span>Accounting</span><b className="navNew">NEW</b></button>
          <button onClick={()=>setActiveWorkspace("workflow")}>⌘ <span>Workflows</span></button>
          <button onClick={()=>setActiveWorkspace("history")}>◴ <span>History</span></button>
          <div className="sideDivider" />
          <button onClick={()=>setActiveWorkspace("connections")}>◎ <span>Connections</span></button>
          <button onClick={()=>setActiveWorkspace("approval")}>✓ <span>Approval Center</span>{approvals.length > 0 && <b className="navCount">{approvals.length}</b>}</button>
          <button onClick={()=>setActiveWorkspace("settings")}>⚙ <span>Settings</span></button>
          <button onClick={()=>setActiveWorkspace("customize")}>✦ <span>Customize Layout</span>{accountMode.plan!=="guest"&&accountMode.plan!=="free"&&<b className="navNew">PRO</b>}</button>
          <button onClick={()=>{location.href=accountMode.signedIn?"/account":"/login"}}>◌ <span>{accountMode.signedIn?"Account & Usage":"Sign in (optional)"}</span></button>
        </nav>
        <div className="mobileMenuExtras">
          <div className="localeSwitch">{([['fr','FR'],['en','EN'],['th','TH']] as [Locale,string][]).map(([key,label]) => <button key={key} className={locale===key?'active':''} onClick={()=>changeLocale(key)}>{label}</button>)}</div>
          <a href={accountMode.signedIn?"/account":"/login"}>{accountMode.signedIn?"Account & Usage":"Guest · Sign in"}</a>
        </div>
        <div className="sideFooter">
          <span>Future 5.2</span><small>AI Secretary · Launch Candidate</small>
        </div>
      </aside>

      <div className="futureMain">
        <header className="futureTopbar">
          <button className="mobileMenuButton" aria-label="Open menu" onClick={()=>setMobileMenuOpen(true)}>☰</button>
          <div className="topLinks"><a href="#home" className="active">Home</a><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#approval">Privacy</a></div>
          <div className="topActions">
            <div className="localeSwitch">{([['fr','FR'],['en','EN'],['th','TH']] as [Locale,string][]).map(([key,label]) => <button key={key} className={locale===key?'active':''} onClick={()=>changeLocale(key)}>{label}</button>)}</div>
            <a className="accountTopLink" href={accountMode.signedIn?"/account":"/login"}>{accountMode.signedIn?(accountMode.name||"Future Account"):"Guest · Sign in"}</a>{accountMode.signedIn&&<button type="button" className="accountTopLink" onClick={signOut}>Sign out</button>}
            <span className="emailStatusPill">{emailConnection.connected ? `✉ ${emailConnection.email}` : "Email not connected"}</span>
          </div>
        </header>

        <section className="v32Hero" id="home">
          <div className="v32Greeting">
            <div className="v32OrbMini" />
            <div><h1>{locale === "th" ? "สวัสดี วันนี้ให้ Future ช่วยอะไรดี?" : locale === "fr" ? "Bonjour, que voulez-vous faire aujourd’hui ?" : "Good morning. What would you like to do today?"}</h1><p>Think it. Say it. Done.</p></div>
          </div>
          <div className="v32AskWrap"><FutureInput onSubmit={handleCommand} status={status} locale={locale} /></div>
          <div className="v32Quick">
            <button onClick={()=>handleCommand(locale === "th" ? "พรุ่งนี้มีอะไรบ้าง" : "What do I have tomorrow?", locale)}>{locale === "th" ? "พรุ่งนี้มีอะไรบ้าง?" : "Tomorrow's schedule"}</button>
            <button onClick={()=>handleCommand(locale === "th" ? "เพิ่มนัดหมายวันศุกร์" : "Add an appointment Friday", locale)}>{locale === "th" ? "เพิ่มนัดหมาย" : "Add appointment"}</button>
            <button onClick={()=>handleCommand("Check my latest emails", locale)}>{locale === "th" ? "สรุปอีเมลล่าสุด" : "Latest email summary"}</button>
            <a href="#search">Find anything on the web</a>
          </div>
        </section>

        <section className="v32SummaryRow">
          <button onClick={()=>setActiveWorkspace("tasks")}><span>☑</span><div><small>SCHEDULE & TASKS</small><strong>{todayItems.length}</strong><em>items today</em></div></button>
          <button onClick={()=>setActiveWorkspace("travel")}><span>✈</span><div><small>TRAVEL & BOOKING</small><strong>{items.filter(i=>/flight|hotel|บิน|โรงแรม/i.test(i.title)).length}</strong><em>saved plans</em></div></button>
          <button onClick={()=>setActiveWorkspace("email")}><span>✉</span><div><small>EMAIL</small><strong>{emailMessages.length}</strong><em>recent loaded</em></div></button>
          <button onClick={()=>setActiveWorkspace("workflow")}><span>⌘</span><div><small>WORKFLOWS</small><strong>{workflows.length}</strong><em>active / saved</em></div></button>
        </section>

        <section className="v32Workspace">
          <CalendarMonthView items={items} locale={locale} selectedDate={selectedCalendarDate} onSelectDate={setSelectedCalendarDate} onAdd={addCalendarItem} onUpdate={updateCalendarItem} onDelete={deleteItem} />
          <SchedulePanel items={items} selectedDate={selectedCalendarDate} locale={locale} onAdd={addCalendarItem} onDelete={deleteItem} onComplete={completeItem} />
          <NotesPanel locale={locale} />
        </section>

        <section className="operationsGrid v46PriorityOperations">
          <div id="workflow"><WorkflowPanel workflows={workflows} locale={locale} onOpen={(url) => window.open(url, "_blank", "noopener,noreferrer")} onDelete={deleteWorkflow} onTogglePause={toggleWorkflowPause} onEdit={editWorkflow} /></div>
          <div id="approval"><ApprovalCenter approvals={approvals} locale={locale} onDecision={handleApproval} /></div>
        </section>

        <section className="v42DiscoverSplit" id="discover">
          <SearchDiscover locale={locale} onOpenPlace={(place)=>{setSelectedMapPlace(place);setActiveWorkspace("map")}} />
          <EmailInboxCard locale={locale} messages={emailMessages} loading={emailLoading} connected={emailConnection.connected} onCheck={()=>checkInbox(locale)} />
        </section>

        <section className="v32ServiceGrid">
          <div className="dashboardCard" id="travel"><div className="panelHeading"><div><span className="eyebrow">TRAVEL & BOOKING</span><h3>Your saved trips & bookings</h3></div></div><div className="travelSearch">⌕ Find flights, hotels, cars…</div>{items.filter(i=>/flight|hotel|บิน|โรงแรม|trip|travel/i.test(i.title)).slice(0,4).map(i=><div className="flightRow" key={i.id}><div><strong>{i.title}</strong><span>{new Date(i.startsAt ?? i.dueAt ?? i.remindAt ?? Date.now()).toLocaleString()}</span></div><button onClick={()=>document.getElementById("search")?.scrollIntoView({behavior:"smooth"})}>Search</button></div>)}<small className="approvalHint">Future will always ask before booking or paying.</small></div>
          <AccountingPanel locale={locale} />
        </section>

        <section className="secondaryGrid">
          <div id="contacts"><ContactsHub contacts={contacts} locale={locale} onChange={persistContacts} /></div>
          <div id="connections"><ConnectionsPanel locale={locale} email={emailConnection} onRefresh={refreshEmailConnection} /></div>
        </section>

        {actions.length > 0 && <section className="actionStack dashboardCard">
          <div className="actionStackHead"><span className="eyebrow">READY TO DO NOW</span><span>{actions.length} action{actions.length > 1 ? "s" : ""}</span></div>
          {actions.map((action, index) => <ActionCard key={`${action.kind}-${action.url}-${index}`} action={action} onDone={() => setActions((prev) => prev.filter((_, i) => i !== index))} />)}
        </section>}

        <section className="v33UtilityRow">
          <NotificationCenter locale={locale} />
          <InstallPanel />
        </section>

        {duplicate && <section className="duplicateCard"><div><span className="eyebrow">POSSIBLE DUPLICATE</span><strong>{duplicate.existing.title}</strong><span>{duplicate.incoming.title}</span></div><div className="actions"><button className="ghost" onClick={()=>{setDuplicate(null);setStatus(t.keep)}}>{t.keep}</button><button className="ghost" onClick={()=>{persist([...items,duplicate.incoming]);setDuplicate(null);setStatus(t.both)}}>{t.both}</button><button className="ghost" onClick={()=>{persist(items.map((item)=>item.id===duplicate.existing.id?{...duplicate.incoming,id:item.id,createdAt:item.createdAt}:item));setDuplicate(null);setStatus(t.merge)}}>{t.merge}</button></div></section>}

        <MapLauncher locale={locale} onOpen={()=>setActiveWorkspace("map")} />
        <nav className="mobileBottomNav" aria-label="Mobile navigation">
          <button onClick={()=>{setActiveWorkspace(null);setMobileMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"})}}>⌂<span>Home</span></button>
          <button onClick={()=>setActiveWorkspace("tasks")}>☑<span>Tasks</span></button>
          <button onClick={()=>setActiveWorkspace("search")}>⌕<span>Search</span></button>
          <button onClick={()=>setActiveWorkspace("calendar")}>▦<span>Calendar</span></button>
          <button onClick={()=>setMobileMenuOpen(true)}>☰<span>More</span></button>
        </nav>
        {mobileMenuOpen && <button className="mobileMenuBackdrop" aria-label="Close menu" onClick={()=>setMobileMenuOpen(false)} />}
        <MiniChat messages={messages} locale={locale} status={status} onSubmit={handleCommand} />

        {activeWorkspace && <WorkspaceModal title={{tasks:"Tasks",calendar:"Calendar",email:"Email",whatsapp:"WhatsApp",search:"Search & Discover",map:"Map & Places",travel:"Travel & Booking",shopping:"Shopping",orders:"Orders & Deliveries",contacts:"Calls & Contacts",accounting:"Accounting",workflow:"Workflows",history:"History",connections:"Connections",approval:"Approval Center",settings:"Settings",customize:"Customize Layout"}[activeWorkspace]} subtitle="A focused workspace with more room to read and work." onClose={()=>setActiveWorkspace(null)}>
          {activeWorkspace === "tasks" && <SchedulePanel items={items} selectedDate={selectedCalendarDate} locale={locale} onAdd={addCalendarItem} onDelete={deleteItem} onComplete={completeItem} />}
          {activeWorkspace === "calendar" && <CalendarMonthView items={items} locale={locale} selectedDate={selectedCalendarDate} onSelectDate={setSelectedCalendarDate} onAdd={addCalendarItem} onUpdate={updateCalendarItem} onDelete={deleteItem} />}
          {activeWorkspace === "email" && <EmailInboxCard locale={locale} messages={emailMessages} loading={emailLoading} connected={emailConnection.connected} onCheck={()=>checkInbox(locale)} />}
          {activeWorkspace === "whatsapp" && <WhatsAppPanel />}
          {activeWorkspace === "search" && <SearchDiscover locale={locale} onOpenPlace={(place)=>{setSelectedMapPlace(place);setActiveWorkspace("map")}} />}
          {activeWorkspace === "map" && <PlaceMap locale={locale} initialPlace={selectedMapPlace} />}
          {activeWorkspace === "travel" && <div className="dashboardCard"><div className="panelHeading"><div><span className="eyebrow">TRAVEL & BOOKING</span><h3>Your saved trips & bookings</h3></div></div>{items.filter(i=>/flight|hotel|บิน|โรงแรม|trip|travel/i.test(i.title)).map(i=><div className="flightRow" key={i.id}><div><strong>{i.title}</strong><span>{new Date(i.startsAt ?? i.dueAt ?? i.remindAt ?? Date.now()).toLocaleString()}</span></div></div>)}</div>}
          {activeWorkspace === "shopping" && <div className="v33PanelPage"><div className="v33PageIntro"><div><span>SHOPPING</span><h3>Research, compare, then approve</h3><p>Future can research products and prepare a purchase. Payment remains behind Approval Center.</p></div></div><SearchDiscover locale={locale}/></div>}
          {activeWorkspace === "orders" && <OrdersPanel orders={orders} tasks={items} onChange={persistOrders} onOpenTask={()=>setActiveWorkspace("tasks")} />}
          {activeWorkspace === "contacts" && <ContactsHub contacts={contacts} locale={locale} onChange={persistContacts} />}
          {activeWorkspace === "accounting" && <AccountingPanel locale={locale} />}
          {activeWorkspace === "workflow" && <WorkflowPanel workflows={workflows} locale={locale} onOpen={(url)=>window.open(url,"_blank","noopener,noreferrer")} onDelete={deleteWorkflow} onTogglePause={toggleWorkflowPause} onEdit={editWorkflow} />}
          {activeWorkspace === "history" && <HistoryPanel items={items} locale={locale} onRestore={restoreItem} onDelete={deleteItem} />}
          {activeWorkspace === "connections" && <div className="v33ConnectionsStack"><ConnectionsPanel locale={locale} email={emailConnection} onRefresh={refreshEmailConnection}/><WhatsAppPanel/></div>}
          {activeWorkspace === "approval" && <ApprovalCenter approvals={approvals} locale={locale} onDecision={handleApproval} />}
          {activeWorkspace === "settings" && <div className="v33Settings"><NotificationCenter locale={locale}/><InstallPanel/></div>}
          {activeWorkspace === "customize" && <CustomizeLayoutPanel paid={accountMode.plan!=="guest"&&accountMode.plan!=="free"}/>}
        </WorkspaceModal>}

        {liveAlert && <div className="liveReminder" role="alert"><div><strong>Future</strong><div>{liveAlert.title}</div></div><button className="ghost" onClick={()=>setLiveAlert(null)}>OK</button></div>}
        <footer className="executiveFooter"><div>© 2026 KÄN inc. · Future AI Assistance</div><nav><a href="/legal">Mentions légales</a><a href="/cgv">CGV</a><a href="/privacy">Privacy</a><a href="/cookies">Cookies</a><a href="/terms">Terms</a><a href="/cancel-subscription">Cancel subscription</a><a href="/contact">Contact</a><a href="/alerts-safety">Alerts & safety</a></nav></footer>
      </div>
    </main>
    </SaaSGate>
  );
}

