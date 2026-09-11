"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { localeTag } from "@/lib/i18n";

export type VoiceMode = "auto" | Locale;

type Props = {
  onTranscript: (text: string, meta: { confidence?: number; recognitionLocale: Locale }) => void;
  onInterim?: (text: string) => void;
  locale: Locale;
  voiceMode: VoiceMode;
};

function message(locale: Locale, kind: "https" | "unsupported" | "permission") {
  const table = {
    en: {
      https: "On iPhone/iPad Safari, voice needs HTTPS. Open Future from an HTTPS link or installed Home Screen web app.",
      unsupported: "Speech recognition is not available in this browser. Safari on iPhone works best from an HTTPS Future link.",
      permission: "Microphone access was blocked. In Safari, allow Microphone for this website in Website Settings.",
    },
    fr: {
      https: "Sur Safari iPhone/iPad, la voix nécessite HTTPS. Ouvrez Future avec un lien HTTPS ou depuis l’app ajoutée à l’écran d’accueil.",
      unsupported: "La reconnaissance vocale n’est pas disponible dans ce navigateur. Sur iPhone, utilisez Safari avec un lien HTTPS.",
      permission: "L’accès au micro est bloqué. Dans Safari, autorisez le microphone dans Réglages du site web.",
    },
    th: {
      https: "บน Safari iPhone/iPad ระบบเสียงต้องใช้ HTTPS ให้เปิด Future จากลิงก์ HTTPS หรือจากเว็บแอปที่เพิ่มไว้บนหน้าจอโฮม",
      unsupported: "เบราว์เซอร์นี้ยังใช้การรู้จำเสียงไม่ได้ บน iPhone ให้ใช้ Safari ผ่านลิงก์ HTTPS",
      permission: "Safari ไม่อนุญาตไมโครโฟน กรุณาเปิดสิทธิ์ Microphone ใน Website Settings",
    },
  } as const;
  return table[locale][kind];
}

export default function VoiceButton({ onTranscript, onInterim, locale, voiceMode }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function startVoice() {
    const w = window as any;
    if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      alert(message(locale, "https"));
      return;
    }
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      alert(message(locale, "unsupported"));
      return;
    }

    const recognitionLocale: Locale = voiceMode === "auto" ? locale : voiceMode;
    const r = new Recognition();
    recognitionRef.current = r;
    r.lang = localeTag[recognitionLocale];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 3;

    r.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      let confidence: number | undefined;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (result.isFinal) { finalText += `${piece} `; confidence = result?.[0]?.confidence; }
        else interim += `${piece} `;
      }
      if (interim.trim()) onInterim?.(interim.trim());
      if (finalText.trim()) onTranscript(finalText.trim(), { confidence, recognitionLocale });
    };

    r.onend = () => { setListening(false); onInterim?.(""); };
    r.onerror = (event: any) => {
      setListening(false); onInterim?.("");
      if (["not-allowed","service-not-allowed"].includes(event?.error)) alert(message(locale, "permission"));
    };

    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }

  function stopVoice() { recognitionRef.current?.stop?.(); }

  return (
    <button className="voice" data-listening={listening} onClick={listening ? stopVoice : startVoice} type="button" aria-label={listening ? "Stop listening" : "Talk to Future"} title={listening ? "Stop" : "Talk to Future"}>
      {listening ? "●" : "🎙"}
    </button>
  );
}
