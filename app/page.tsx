"use client";

import { useEffect, useMemo, useState } from "react";
import FutureInput from "@/components/FutureInput";
import Timeline from "@/components/Timeline";
import NotificationCenter from "@/components/NotificationCenter";
import ConversationPanel from "@/components/ConversationPanel";
import ActionCard from "@/components/ActionCard";
import InstallPanel from "@/components/InstallPanel";
import EclipseBrand from "@/components/EclipseBrand";
import WorkflowPanel from "@/components/WorkflowPanel";
import ApprovalCenter from "@/components/ApprovalCenter";
import ConnectionsPanel, { type EmailConnectionState } from "@/components/ConnectionsPanel";
import EmailInboxCard from "@/components/EmailInboxCard";
import ContactsHub from "@/components/ContactsHub";
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
import { applyApproval, approvalsForWorkflow, type Approval, type Workflow } from "@/lib/workflows";
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
  const [agentMode, setAgentMode] = useState<"local" | "ai">("local");
  const [contacts, setContacts] = useState<FutureContact[]>([]);
  const [emailConnection, setEmailConnection] = useState<EmailConnectionState>({ configured: false, connected: false });
  const [emailMessages, setEmailMessages] = useState<EmailMessageSummary[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    setItems(loadItems());
    setContacts(loadContacts());
    const stored = localStorage.getItem("future.locale") as Locale | null;
    const detected: Locale = navigator.language.startsWith("th") ? "th" : navigator.language.startsWith("fr") ? "fr" : "en";
    const nextLocale = stored && ["en", "fr", "th"].includes(stored) ? stored : detected;
    setLocale(nextLocale);
    refreshEmailConnection();
  }, []);

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
    const agentPlan = await requestAgentPlan(combinedText, commandLocale);
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
      const answered = await answerQuestion(question.text, commandLocale);
      if (answered?.text) {
        answers.push(answered.text);
        setMessages((prev) => [...prev, makeMessage("assistant", answered.text)]);
        speakFuture(answered.text, commandLocale);
        if (answered.sourceUrl) {
          const sourceAction: WebAction = { kind: "open_url", title: commandLocale === "fr" ? "Voir la source" : commandLocale === "th" ? "เปิดแหล่งข้อมูล" : "Open source", detail: "Wikipedia", url: answered.sourceUrl, locale: commandLocale };
          setActions((prev) => [...prev, sourceAction]);
        }
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
        reply = commandLocale === "th" ? "ฉันยังตอบเรื่องนี้แบบออฟไลน์ไม่ได้ ลองให้ฉันค้นหาเว็บแทนได้" : commandLocale === "fr" ? "Je ne peux pas encore répondre à cela hors ligne. Je peux lancer une recherche web à la place." : "I can’t answer that locally yet. I can open a web search instead.";
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

  function deleteItem(id: string) { resetNotifiedStateForItem(id); persist(items.filter((item) => item.id !== id)); }
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
    <main className="futureAppShell">
      <aside className="futureSidebar">
        <div className="sideBrand"><EclipseBrand /></div>
        <nav className="sideNav">
          <a className="active" href="#home">⌂ <span>Home</span></a>
          <a href="#tasks">☑ <span>Tasks</span></a>
          <a href="#calendar">▦ <span>Calendar</span></a>
          <a href="#email">✉ <span>Email</span></a>
          <a href="#search">⌕ <span>Search</span></a>
          <a href="#travel">✈ <span>Travel</span></a>
          <a href="#shopping">◇ <span>Shopping</span></a>
          <a href="#contacts">☎ <span>Calls & Contacts</span></a>
          <a href="#workflow">⌘ <span>Workflows</span></a>
          <div className="sideDivider" />
          <a href="#connections">◎ <span>Connections</span></a>
          <a href="#approval">✓ <span>Approval Center</span>{approvals.length > 0 && <b className="navCount">{approvals.length}</b>}</a>
        </nav>
        <div className="sideFooter">
          <span>Future 3.0</span><small>Private by design</small>
        </div>
      </aside>

      <div className="futureMain">
        <header className="futureTopbar">
          <div className="topLinks"><a href="#home" className="active">Home</a><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#approval">Privacy</a></div>
          <div className="topActions">
            <div className="localeSwitch">{([['fr','FR'],['en','EN'],['th','TH']] as [Locale,string][]).map(([key,label]) => <button key={key} className={locale===key?'active':''} onClick={()=>changeLocale(key)}>{label}</button>)}</div>
            <span className="emailStatusPill">{emailConnection.connected ? `✉ ${emailConnection.email}` : "Email not connected"}</span>
          </div>
        </header>

        <section className="futureHero" id="home">
          <div className="heroCopy">
            <span className="eyebrow">YOUR AI SECRETARY</span>
            <h1>Think it.<br/>Say it.<br/><em>Done.</em></h1>
            <p>Natural language. Real actions. A calmer, smarter day — powered by Future.</p>
            <div className="heroBadges"><span>Natural conversation</span><span>Works on iPhone</span><span>{agentMode === "ai" ? "AI planner on" : "Free fallback ready"}</span></div>
          </div>
          <div className="heroOrbWrap"><div className="heroOrb"><div className="heroOrbCore" /></div><span className="handNote">More time<br/>for what<br/>matters. ♡</span></div>
          <div className="heroAskCard">
            <h3>A calmer day<br/>starts here.</h3>
            <FutureInput onSubmit={handleCommand} status={status} locale={locale} />
            <div className="quickPrompts">
              <button onClick={()=>handleCommand("Find a birthday gift for my mom under 50 euros", locale)}>◇ Find a birthday gift</button>
              <button onClick={()=>handleCommand("Find flights to Bangkok next month", locale)}>✈ Find flights</button>
              <button onClick={()=>handleCommand("Check my latest emails", locale)}>✉ Check latest emails</button>
              <button onClick={()=>handleCommand("Remind me to call Alex tomorrow at 10", locale)}>◎ Remind me to call Alex</button>
            </div>
          </div>
        </section>

        <section className="featureStrip" id="features">
          {[
            ["▦","Manage","Your Schedule"],["✉","Email","& Messages"],["⌕","Find Anything","on the Web"],["✈","Plan Travel","& Compare"],["◇","Find & Shop","with approval"],["☎","Calls &","Contacts"],["▶","Play on","YouTube"],["文","Translate","TH / EN / FR"],["☷","Notes","& To-do"],["⌘","Custom","Workflows"]
          ].map(([icon,a,b])=><div className="featureTile" key={a}><span>{icon}</span><strong>{a}</strong><small>{b}</small></div>)}
        </section>

        <section className="dashboardGrid">
          <div className="dashboardCard scheduleCard" id="tasks">
            <div className="panelHeading"><div><span className="eyebrow">SCHEDULE & TASKS</span><h3>Today</h3></div><span>{items.length} saved</span></div>
            <Timeline items={items} onDelete={deleteItem} onComplete={completeItem} locale={locale} />
          </div>

          <div className="dashboardCard discoverCard" id="search">
            <div className="panelHeading"><div><span className="eyebrow">SEARCH & DISCOVER</span><h3>Find what you need</h3></div></div>
            <div className="searchMock">⌕ Find a cozy café near me with good Wi-Fi</div>
            <div className="mapMock"><div className="mapRoad one"/><div className="mapRoad two"/><span className="mapPin">●</span></div>
            <div className="resultMock"><strong>Café Kitsuné</strong><span>4.5 ★ · 200 m</span></div>
            <div className="resultMock"><strong>Holybelly</strong><span>4.7 ★ · 350 m</span></div>
            <button className="softButton" onClick={()=>window.open("https://www.google.com/search?q=cafe+near+me", "_blank")}>More results on Google →</button>
          </div>

          <div className="dashboardCard travelCard" id="travel">
            <div className="panelHeading"><div><span className="eyebrow">TRAVEL & BOOKING</span><h3>Compare before booking</h3></div></div>
            <div className="travelSearch">⌕ Find flights to Bangkok next month</div>
            {[['Air France','€620','12h 15m · 1 stop'],['Thai Airways','€650','11h 45m · Non-stop'],['Emirates','€680','13h 10m · 1 stop']].map(([name,price,meta])=><div className="flightRow" key={name}><div><strong>{name}</strong><span>{meta}</span></div><b>{price}</b><button>View</button></div>)}
            <small className="approvalHint">I’ll wait for your confirmation before booking.</small>
          </div>

          <EmailInboxCard locale={locale} messages={emailMessages} loading={emailLoading} connected={emailConnection.connected} onCheck={()=>checkInbox(locale)} />
        </section>

        <section className="operationsGrid">
          <div id="workflow"><WorkflowPanel workflows={workflows} locale={locale} onOpen={(url) => window.open(url, "_blank", "noopener,noreferrer")} /></div>
          <div id="approval"><ApprovalCenter approvals={approvals} locale={locale} onDecision={handleApproval} /></div>
        </section>

        <section className="secondaryGrid">
          <div id="contacts"><ContactsHub contacts={contacts} locale={locale} onChange={persistContacts} /></div>
          <div id="connections"><ConnectionsPanel locale={locale} email={emailConnection} onRefresh={refreshEmailConnection} /></div>
        </section>

        {actions.length > 0 && <section className="actionStack dashboardCard">
          <div className="actionStackHead"><span className="eyebrow">READY TO DO NOW</span><span>{actions.length} action{actions.length > 1 ? "s" : ""}</span></div>
          {actions.map((action, index) => <ActionCard key={`${action.kind}-${action.url}-${index}`} action={action} onDone={() => setActions((prev) => prev.filter((_, i) => i !== index))} />)}
        </section>}

        <section className="lowerGrid">
          <ConversationPanel messages={messages} />
          <NotificationCenter locale={locale} />
          <InstallPanel />
        </section>

        {duplicate && <section className="duplicateCard"><div><span className="eyebrow">POSSIBLE DUPLICATE</span><strong>{duplicate.existing.title}</strong><span>{duplicate.incoming.title}</span></div><div className="actions"><button className="ghost" onClick={()=>{setDuplicate(null);setStatus(t.keep)}}>{t.keep}</button><button className="ghost" onClick={()=>{persist([...items,duplicate.incoming]);setDuplicate(null);setStatus(t.both)}}>{t.both}</button><button className="ghost" onClick={()=>{persist(items.map((item)=>item.id===duplicate.existing.id?{...duplicate.incoming,id:item.id,createdAt:item.createdAt}:item));setDuplicate(null);setStatus(t.merge)}}>{t.merge}</button></div></section>}

        {liveAlert && <div className="liveReminder" role="alert"><div><strong>Future</strong><div>{liveAlert.title}</div></div><button className="ghost" onClick={()=>setLiveAlert(null)}>OK</button></div>}
        <footer className="executiveFooter">Future 3.0 Phase 3 · Real Outlook connection · visible approvals · eclipse interface.</footer>
      </div>
    </main>
  );
}
