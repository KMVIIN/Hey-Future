import type { Locale } from "./i18n";
import { hasMemoryCue, hasSchedulingCue, parseAssistantAction, type WebAction } from "./actions";
import { isQuestionCommand } from "./questions";
import { routeFutureIntent } from "./intent-router";
import { addAccountingEntry } from "./accounting-events";

export type RoutedCommand =
  | { kind: "handled"; text: string }
  | { kind: "action"; text: string; action: WebAction }
  | { kind: "question"; text: string }
  | { kind: "memory"; text: string };

function split(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/\s*(?:;|\n|\band then\b|\bthen\b|\bet puis\b|\bpuis\b|แล้วก็|จากนั้น|แล้ว)\s*/i)
    .map(x => x.trim()).filter(Boolean);
}

function label(locale: Locale, en: string, fr: string, th: string) {
  return locale === "fr" ? fr : locale === "th" ? th : en;
}

function specializedAction(text: string, locale: Locale): RoutedCommand | null {
  const intent = routeFutureIntent(text);
  if (intent.kind === "chat") return null;

  if (intent.kind === "accounting") {
    addAccountingEntry({ type: intent.type, amount: intent.amount, description: intent.description, category: intent.category });
    return { kind: "handled", text };
  }

  if (intent.kind === "map") {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(intent.query)}&travelmode=${intent.travelMode}`;
    return { kind: "action", text, action: { kind: "maps", title: label(locale, "Open route in Maps", "Ouvrir l’itinéraire", "เปิดเส้นทางใน Maps"), detail: intent.query, url, locale } };
  }

  const destination = intent.destination;
  const uber = `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(destination)}`;
  const bolt = `https://bolt.eu/en/cities/?search=${encodeURIComponent(destination)}`;
  const links = intent.provider === "uber" ? [{ label: "Uber", url: uber }] : intent.provider === "bolt" ? [{ label: "Bolt", url: bolt }] : [{ label: "Uber", url: uber }, { label: "Bolt", url: bolt }];
  return { kind: "action", text, action: { kind: "travel", title: label(locale, "Choose a ride", "Choisir une course", "เลือกรถ"), detail: destination, url: links[0].url, links, locale } };
}

export function routeAssistantInput(text: string, locale: Locale): RoutedCommand[] {
  const parts = split(text);
  const units = parts.length ? parts : [text];
  return units.map((part) => {
    if (hasSchedulingCue(part) || hasMemoryCue(part)) return { kind: "memory", text: part } as const;

    // Future first-party intents run before generic web/chat routing. Voice and text
    // both arrive here through FutureInput -> handleCommand, so behavior is shared.
    const specialized = specializedAction(part, locale);
    if (specialized) return specialized;

    const action = parseAssistantAction(part, locale);
    if (action) return { kind: "action", text: part, action } as const;
    if (isQuestionCommand(part)) return { kind: "question", text: part } as const;
    return { kind: "question", text: part } as const;
  });
}
