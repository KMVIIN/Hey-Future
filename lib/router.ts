import type { Locale } from "./i18n";
import { fallbackResearchAction, hasMemoryCue, hasSchedulingCue, parseAssistantAction, type WebAction } from "./actions";
import { isQuestionCommand } from "./questions";

export type RoutedCommand =
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
    // Time/reminder language should always go to Future's agenda parser.
    if (hasSchedulingCue(part) || hasMemoryCue(part)) return { kind: "memory", text: part } as const;

    const action = parseAssistantAction(part, locale);
    if (action) return { kind: "action", text: part, action } as const;

    // Questions get a local/Wikipedia answer first.
    if (isQuestionCommand(part)) return { kind: "question", text: part } as const;

    // Anything else is treated as research, not accidentally saved as a reminder.
    const fallback = fallbackResearchAction(part, locale);
    if (fallback) return { kind: "action", text: part, action: fallback } as const;

    return { kind: "memory", text: part } as const;
  });
}
