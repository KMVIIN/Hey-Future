"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import VoiceButton, { type VoiceMode } from "./VoiceButton";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { detectLocale, localeName } from "@/lib/language";

export default function FutureInput({ onSubmit, status, locale }: { onSubmit: (text: string, detectedLocale: Locale) => void | Promise<void>; status: string; locale: Locale; }) {
  const [value, setValue] = useState("");
  const [interim, setInterim] = useState("");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("auto");
  const [safariHint, setSafariHint] = useState("");
  const t = copy[locale];
  const detected = useMemo(() => detectLocale(value, locale), [value, locale]);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (isIOS && isSafari && !window.isSecureContext) {
      setSafariHint(locale === "fr" ? "Safari iPhone : le micro nécessite un lien HTTPS." : locale === "th" ? "Safari บน iPhone: ไมโครโฟนต้องเปิดผ่านลิงก์ HTTPS" : "iPhone Safari: microphone access requires an HTTPS Future link.");
    } else if (isIOS && !isSafari) {
      setSafariHint(locale === "fr" ? "Sur iPhone, la reconnaissance vocale web est généralement plus fiable dans Safari." : locale === "th" ? "บน iPhone ระบบเสียงบนเว็บมักทำงานได้ดีกว่าใน Safari" : "On iPhone, web speech recognition is generally most reliable in Safari.");
    } else setSafariHint("");
  }, [locale]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const text = value.trim();
    setValue("");
    setInterim("");
    await onSubmit(text, detected);
  }

  return (
    <form className="commandComposer" onSubmit={submit}>
      <div className="composerTopline">
        <div><div className="composerLabel">Ask Future</div><div className="composerSub">Understand natural speech · remember · research · act</div></div>
        <div className="languagePill">{localeName(detected)}</div>
      </div>
      <div className="composerRow">
        <textarea className="commandInput" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Talk naturally: play music, find a gift, search a place, plan travel, remind me, or ask anything…" rows={2} />
        <VoiceButton locale={locale} voiceMode={voiceMode} onInterim={setInterim} onTranscript={(text) => { setValue((current) => current.trim() ? `${current.trim()} ${text}` : text); setInterim(""); }} />
        <button className="primary" type="submit">Send</button>
      </div>
      <div className="composerFooter">
        <div className="voiceModes">
          {([['auto','Auto'],['fr','FR'],['en','EN'],['th','TH']] as Array<[VoiceMode,string]>).map(([mode,label]) => <button type="button" key={mode} className={`voiceMode ${voiceMode===mode?'active':''}`} onClick={()=>setVoiceMode(mode)}>{label}</button>)}
        </div>
        <span className="composerTip">Try: “เปิดเพลง La vie en rose ให้หน่อย”, “หาของขวัญให้แม่งบ 50 ยูโร”, or “พรุ่งนี้ 10 โมงเตือนให้โทรหา Alex”</span>
      </div>
      {safariHint && <div className="compatHint">{safariHint}</div>}
      {interim && <div className="liveTranscript">Listening: {interim}</div>}
      {status && <div className="statusLine">{status}</div>}
    </form>
  );
}
