import { parseCommand } from "./parser";
import type { ParsedCommand } from "./types";
import type { Locale } from "./i18n";

function splitClauses(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // Strong separators first. We intentionally avoid splitting every plain English "and"
  // because it often belongs inside one task title.
  const strong = normalized
    .split(/\s*(?:;|\n|\band then\b|\bthen\b|\bet puis\b|\bpuis\b|แล้วก็|แล้ว|จากนั้น)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (strong.length > 1) return strong;

  // Split conjunctions only when the following clause starts like a new command/action.
  const cue = /\s+(?:and|et|และ)\s+(?=(?:remind|call|email|send|pay|buy|book|meet|go|drink|eat|take|rappelle|appelle|envoie|paie|achète|achete|réserve|reserve|va|bois|mange|prends|เตือน|โทร|ส่ง|จ่าย|ซื้อ|จอง|ไป|ดื่ม|กิน|ทาน|ประชุม|นัด))/i;
  return normalized.split(cue).map((part) => part.trim()).filter(Boolean);
}

function temporalPrefix(text: string): string {
  const patterns = [
    /\b(?:today|tomorrow|day after tomorrow|this (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b[^,;]*/i,
    /\b(?:aujourd'hui|demain|après-demain|apres-demain|ce (?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) prochain)\b[^,;]*/i,
    /(?:วันนี้|พรุ่งนี้|มะรืน|วัน(?:จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์|อาทิตย์)(?:นี้|หน้า)?)[^,;]*/,
    /\bin\s+\d+\s+(?:minutes?|days?)\b/i,
    /\bdans\s+\d+\s+(?:minutes?|jours?)\b/i,
    /อีก\s*\d+\s*(?:นาที|วัน)/,
  ];
  const timePatterns = [
    /\bat\s+(?:[01]?\d|2[0-3])(?::[0-5]\d)?(?:\s*(?:am|pm))?\b/i,
    /\bà\s+(?:[01]?\d|2[0-3])(?:h[0-5]?\d?)?\b/i,
    /(?:ตอน)?\s*(?:บ่าย\s*\d{1,2}(?:\s*โมง)?|ตี\s*\d{1,2}|\d{1,2}\s*ทุ่ม|\d{1,2}\s*โมง(?:\s*(?:เช้า|เย็น|ตอนเช้า))?|เที่ยงคืน|เที่ยง)/,
  ];

  const pieces: string[] = [];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) { pieces.push(m[0].trim()); break; }
  }
  for (const pattern of timePatterns) {
    const m = text.match(pattern);
    if (m && !pieces.join(" ").includes(m[0].trim())) { pieces.push(m[0].trim()); break; }
  }
  return pieces.join(" ");
}

function clauseHasTemporal(clause: string) {
  return /\b(today|tomorrow|day after tomorrow|in\s+\d+\s+(?:minutes?|days?)|at\s+\d|aujourd'hui|demain|après-demain|apres-demain|dans\s+\d+\s+(?:minutes?|jours?)|à\s+\d)\b|วันนี้|พรุ่งนี้|มะรืน|อีก\s*\d+\s*(?:นาที|วัน)|(?:บ่าย|ตี|โมง|ทุ่ม|เที่ยง)/i.test(clause);
}

export function parseCommands(rawText: string, now: Date, locale: Locale): ParsedCommand[] {
  const clauses = splitClauses(rawText);
  if (clauses.length <= 1) return [parseCommand(rawText, now, locale)];

  const prefix = temporalPrefix(rawText);
  return clauses.map((clause, index) => {
    const withContext = index === 0 || clauseHasTemporal(clause) || !prefix ? clause : `${prefix} ${clause}`;
    return parseCommand(withContext, now, locale);
  });
}
