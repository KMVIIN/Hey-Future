import type { Locale } from "./i18n";
import { hasMemoryCue, hasSchedulingCue, parseAssistantAction, type WebAction } from "./actions";
import { isQuestionCommand } from "./questions";
import { routeFutureIntent, type FutureIntent } from "./intent-router";

export type RoutedCommand =
  | { kind: "future_intent"; text: string; intent: Exclude<FutureIntent, { kind: "chat" }> }
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

export function routeAssistantInput(text: string, locale: Locale): RoutedCommand[] {
  const parts = split(text);
  const units = parts.length ? parts : [text];
  return units.map((part) => {
    // Agenda/memory language belongs to Future's local task parser.
    if (hasSchedulingCue(part) || hasMemoryCue(part)) return { kind: "memory", text: part } as const;

    // Future 5.2: route first-party capabilities before generic web actions/chat.
    // This keeps Voice and Text on the same path because both enter through FutureInput -> handleCommand.
    const futureIntent = routeFutureIntent(part);
    if (futureIntent.kind !== "chat") return { kind: "future_intent", text: part, intent: futureIntent } as const;

    // Only explicit executable/search intents open an external action.
    const action = parseAssistantAction(part, locale);
    if (action) return { kind: "action", text: part, action } as const;

    // Questions AND normal conversation go to Future AI chat. This prevents
    // greetings such as “Bonjour Future, présente-toi…” from opening Google.
    if (isQuestionCommand(part)) return { kind: "question", text: part } as const;
    return { kind: "question", text: part } as const;
  });
}
