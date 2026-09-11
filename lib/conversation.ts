import type { FutureItem } from "./types";
import type { Locale } from "./i18n";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

export function assistantSavedReply(locale: Locale, items: FutureItem[]) {
  const count = items.length;
  if (locale === "th") {
    if (count === 1) return `เรียบร้อย ฉันบันทึก “${items[0].title}” ให้แล้ว`;
    return `เรียบร้อย ฉันแยกและบันทึกให้ ${count} รายการแล้ว`;
  }
  if (locale === "fr") {
    if (count === 1) return `C’est noté. J’ai enregistré « ${items[0].title} ».`;
    return `C’est noté. J’ai séparé et enregistré ${count} éléments.`;
  }
  if (count === 1) return `Done. I saved “${items[0].title}”.`;
  return `Done. I separated that into ${count} items and saved them.`;
}

export function assistantActionReply(locale: Locale, label: string) {
  if (locale === "th") return `ได้เลย ฉันเตรียม ${label} ให้แล้ว`;
  if (locale === "fr") return `Bien sûr. J’ai préparé ${label}.`;
  return `Of course. I prepared ${label}.`;
}

export function makeMessage(role: ConversationMessage["role"], text: string): ConversationMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, at: new Date().toISOString() };
}
