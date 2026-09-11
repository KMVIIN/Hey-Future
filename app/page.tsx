"use client";

import { useEffect, useMemo, useState } from "react";
import FutureInput from "@/components/FutureInput";
import Timeline from "@/components/Timeline";
import NotificationCenter from "@/components/NotificationCenter";
import ConversationPanel from "@/components/ConversationPanel";
import ActionCard from "@/components/ActionCard";
import InstallPanel from "@/components/InstallPanel";
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

export default function Home() {
  const [items, setItems] = useState<FutureItem[]>([]);
  const [locale, setLocale] = useState<Locale>("fr");
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState<{ existing: FutureItem; incoming: FutureItem } | null>(null);
  const [pending, setPending] = useState<{ text: string; locale: Locale } | null>(null);
  const [liveAlert, setLiveAlert] = useState<{ title: string; locale: Locale } | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [actions, setActions] = useState<WebAction[]>([]);
  const t = copy[locale];

  useEffect(() => {
    setItems(loadItems());
    const stored = localStorage.getItem("future.locale") as Locale | null;
    const detected: Locale = navigator.language.startsWith("th") ? "th" : navigator.language.startsWith("fr") ? "fr" : "en";
    const nextLocale = stored && ["en", "fr", "th"].includes(stored) ? stored : detected;
    setLocale(nextLocale);
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

  function changeLocale(next: Locale) {
    setLocale(next); localStorage.setItem("future.locale", next); setStatus("");
  }
  function persist(next: FutureItem[]) { const clean = purgeExpiredCompleted(next); setItems(clean); saveItems(clean); }
  function say(text: string, commandLocale: Locale) {
    setMessages((prev) => [...prev, makeMessage("assistant", text)]);
    speakFuture(text, commandLocale);
  }

  async function handleCommand(text: string, detectedLocale: Locale) {
    const commandLocale = detectedLocale;
    const combinedText = pending ? `${pending.text} ${text}` : text;
    setMessages((prev) => [...prev, makeMessage("user", text)]);

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
    <main className="executiveShell">
      <header className="topbar">
        <div className="brandBlock"><div className="brandMark">F</div><div><div className="logo">FUTURE</div><div className="tag">Executive AI Secretary</div></div></div>
        <div className="topActions">
          <div className="localeSwitch">{([['fr','FR'],['en','EN'],['th','TH']] as [Locale,string][]).map(([key,label]) => <button key={key} className={locale===key?'active':''} onClick={()=>changeLocale(key)}>{label}</button>)}</div>
          <div className="privacyBadge">Local · €0</div>
        </div>
      </header>

      <section className="executiveIntro">
        <div>
          <div className="eyebrow">TODAY</div>
          <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}.</h1>
          <p>{todayItems.length ? `You have ${todayItems.length} item${todayItems.length > 1 ? "s" : ""} today.` : "Your schedule is clear for now."} {nextItem ? `Next: ${nextItem.item.title}.` : "Tell Future what comes next."}</p>
        </div>
        <div className="summaryGrid">
          <div className="summaryCard"><span>Today</span><strong>{todayItems.length}</strong></div>
          <div className="summaryCard"><span>Saved</span><strong>{items.length}</strong></div>
          <div className="summaryCard"><span>Assistant</span><strong className="onlineText">Online</strong></div>
        </div>
      </section>

      <div className="workspaceGrid">
        <div className="mainColumn">
          <InstallPanel />
          <FutureInput onSubmit={handleCommand} status={status} locale={locale} />
          <ConversationPanel messages={messages} />
          {actions.length > 0 && <section className="actionStack">
            <div className="actionStackHead"><span className="eyebrow">READY TO DO NOW</span><span>{actions.length} action{actions.length > 1 ? "s" : ""}</span></div>
            {actions.map((action, index) => <ActionCard key={`${action.kind}-${action.url}-${index}`} action={action} onDone={() => setActions((prev) => prev.filter((_, i) => i !== index))} />)}
          </section>}
          <NotificationCenter locale={locale} />
          {duplicate && <section className="duplicateCard"><div><span className="eyebrow">POSSIBLE DUPLICATE</span><strong>{duplicate.existing.title}</strong><span>{duplicate.incoming.title}</span></div><div className="actions"><button className="ghost" onClick={()=>{setDuplicate(null);setStatus(t.keep)}}>{t.keep}</button><button className="ghost" onClick={()=>{persist([...items,duplicate.incoming]);setDuplicate(null);setStatus(t.both)}}>{t.both}</button><button className="ghost" onClick={()=>{persist(items.map((item)=>item.id===duplicate.existing.id?{...duplicate.incoming,id:item.id,createdAt:item.createdAt}:item));setDuplicate(null);setStatus(t.merge)}}>{t.merge}</button></div></section>}
        </div>

        <aside className="agendaColumn">
          <div className="agendaHead"><div><span className="eyebrow">AGENDA</span><h2>Coming up</h2></div><span>{items.length} saved</span></div>
          <Timeline items={items} onDelete={deleteItem} onComplete={completeItem} locale={locale} />
        </aside>
      </div>

      {liveAlert && <div className="liveReminder" role="alert"><div><strong>Future</strong><div>{liveAlert.title}</div></div><button className="ghost" onClick={()=>setLiveAlert(null)}>OK</button></div>}
      <footer className="executiveFooter">Future Day 2.2 · Free HTTPS + iPhone Web App · Safari-ready PWA · €0 MVP.</footer>
    </main>
  );
}
