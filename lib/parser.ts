import type { ParsedCommand, FutureItemType } from "./types";
import type { Locale } from "./i18n";

const DAY = 24 * 60 * 60 * 1000;

export type ClarificationCode = "missing_time" | "weekend_day" | "ambiguous_time";

export class ClarificationError extends Error {
  code: ClarificationCode;
  constructor(code: ClarificationCode, message: string) {
    super(message);
    this.name = "ClarificationError";
    this.code = code;
  }
}

const clarificationCopy: Record<Locale, Record<ClarificationCode, string>> = {
  en: {
    missing_time: "What time should I put this in your schedule?",
    weekend_day: "Do you mean Saturday or Sunday?",
    ambiguous_time: "What exact time do you mean? For example, 2 PM or 14:00.",
  },
  fr: {
    missing_time: "À quelle heure dois-je l’ajouter à votre agenda ?",
    weekend_day: "Vous voulez dire samedi ou dimanche ?",
    ambiguous_time: "Quelle heure exacte voulez-vous dire ? Par exemple, 14h ou 14:00.",
  },
  th: {
    missing_time: "ต้องการให้ Future ใส่รายการนี้เวลาเท่าไรครับ?",
    weekend_day: "หมายถึงวันเสาร์หรือวันอาทิตย์ครับ?",
    ambiguous_time: "หมายถึงเวลากี่โมงครับ? เช่น บ่าย 2 หรือ 14:00",
  },
};

function addDaysLocal(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function atLocal(date: Date, hours: number, minutes = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function normalizeApostrophes(text: string) {
  return text.replace(/[’‘]/g, "'");
}

function extractTime(text: string): { hours: number; minutes: number } | null {
  const lower = normalizeApostrophes(text.toLowerCase());

  // Universal 24-hour clock: 09:30 / 18.45
  const colon = lower.match(/(?:^|\s|à|at|ตอน)([01]?\d|2[0-3])\s*[:.]\s*([0-5]\d)(?=\s|$|[,.!?])/);
  if (colon) return { hours: Number(colon[1]), minutes: Number(colon[2]) };

  // English 12-hour clock: 10 am / 6:30 pm
  const ampm = lower.match(/\b(1[0-2]|0?[1-9])(?:\s*[:.]\s*([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if (ampm[3].startsWith("p")) hours += 12;
    return { hours, minutes: Number(ampm[2] ?? 0) };
  }

  // French: 14h / 14h30 / 18 heures / à 14
  const frH = lower.match(/\b([01]?\d|2[0-3])\s*h(?:eures?)?\s*([0-5]\d)?\b|\b([01]?\d|2[0-3])\s+heures?\b/);
  if (frH) return { hours: Number(frH[1] ?? frH[3]), minutes: Number(frH[2] ?? 0) };
  const frAt = lower.match(/\bà\s+([01]?\d|2[0-3])\b/);
  if (frAt) return { hours: Number(frAt[1]), minutes: 0 };

  // English: "at 10". Keep it strict so unrelated numbers (Cap3000, bills, prices) are ignored.
  const enAt = lower.match(/\bat\s+([01]?\d|2[0-3])\b/);
  if (enAt) return { hours: Number(enAt[1]), minutes: 0 };

  // Thai fixed expressions.
  if (/เที่ยงคืน/.test(lower)) return { hours: 0, minutes: 0 };
  if (/(?:ตอน)?เที่ยง(?!คืน)/.test(lower)) return { hours: 12, minutes: 0 };

  const thaiNight = lower.match(/(?:ตอน)?\s*(\d{1,2})\s*ทุ่ม(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiNight) {
    const n = Number(thaiNight[1]);
    if (n >= 1 && n <= 5) return { hours: 18 + n, minutes: Number(thaiNight[2] ?? 0) };
  }

  const thaiEarly = lower.match(/(?:ตอน)?\s*ตี\s*(\d{1,2})(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiEarly) {
    const n = Number(thaiEarly[1]);
    if (n >= 1 && n <= 5) return { hours: n, minutes: Number(thaiEarly[2] ?? 0) };
  }

  const thaiAfternoon = lower.match(/(?:ตอน)?\s*บ่าย\s*(\d{1,2})(?:\s*โมง)?(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiAfternoon) {
    const n = Number(thaiAfternoon[1]);
    if (n >= 1 && n <= 5) return { hours: 12 + n, minutes: Number(thaiAfternoon[2] ?? 0) };
  }

  const thaiEvening = lower.match(/(?:ตอน)?\s*(\d{1,2})\s*โมง\s*เย็น(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiEvening) {
    const n = Number(thaiEvening[1]);
    const hours = n >= 1 && n <= 11 ? n + 12 : n;
    if (hours <= 23) return { hours, minutes: Number(thaiEvening[2] ?? 0) };
  }

  const thaiMorning = lower.match(/(?:ตอน)?\s*(\d{1,2})\s*โมง\s*(?:เช้า|ตอนเช้า)(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiMorning) {
    const n = Number(thaiMorning[1]);
    if (n <= 11) return { hours: n, minutes: Number(thaiMorning[2] ?? 0) };
  }

  const thaiClock = lower.match(/(?:ตอน)?\s*(\d{1,2})\s*โมง(?:\s*(\d{1,2})\s*นาที)?/);
  if (thaiClock) {
    const n = Number(thaiClock[1]);
    if (n <= 23) return { hours: n, minutes: Number(thaiClock[2] ?? 0) };
  }

  return null;
}

function resolveDate(text: string, now: Date, locale: Locale): Date {
  const lower = normalizeApostrophes(text.toLowerCase());

  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b|\bdans\s+(\d+)\s+jours?\b|อีก\s*(\d+)\s*วัน/);
  if (inDays) return addDaysLocal(now, Number(inDays[1] ?? inDays[2] ?? inDays[3]));

  if (/\bday after tomorrow\b|\baprès-demain\b|\bapres-demain\b|มะรืน/.test(lower)) return addDaysLocal(now, 2);
  if (/\btomorrow\b|\bdemain\b|พรุ่งนี้/.test(lower)) return addDaysLocal(now, 1);
  if (/\btoday\b|\baujourd'hui\b|วันนี้/.test(lower)) return new Date(now);

  if (/\bthis weekend\b|\bce week[- ]?end\b|สุดสัปดาห์นี้|เสาร์อาทิตย์นี้/.test(lower)) {
    throw new ClarificationError("weekend_day", clarificationCopy[locale].weekend_day);
  }

  const weekdays: Array<[RegExp, number]> = [
    [/\bsunday\b|\bdimanche\b|วันอาทิตย์/, 0],
    [/\bmonday\b|\blundi\b|วันจันทร์/, 1],
    [/\btuesday\b|\bmardi\b|วันอังคาร/, 2],
    [/\bwednesday\b|\bmercredi\b|วันพุธ/, 3],
    [/\bthursday\b|\bjeudi\b|วันพฤหัส(?:บดี)?/, 4],
    [/\bfriday\b|\bvendredi\b|วันศุกร์/, 5],
    [/\bsaturday\b|\bsamedi\b|วันเสาร์/, 6],
  ];

  for (const [pattern, target] of weekdays) {
    if (pattern.test(lower)) {
      const current = now.getDay();
      let delta = (target - current + 7) % 7;
      const explicitNext = /\bnext\b|\bprochain(?:e)?\b|หน้า/.test(lower);
      if (explicitNext && delta === 0) delta = 7;
      // If the user says the weekday with no "next" and it is today, keep today.
      return addDaysLocal(now, delta);
    }
  }

  return new Date(now);
}

function cleanTitle(text: string) {
  return normalizeApostrophes(text)
    .replace(/^hey\s+future[,!]?\s*/i, "")
    .replace(/^เฮ้\s*future[,!]?\s*/i, "")
    .replace(/\b(remind me to|remind me|please remind me to|i have to|i need to|i have an?|i have|please)\b/gi, " ")
    .replace(/\b(rappelle-moi de|rappelle moi de|rappelle-moi|rappelle moi|je dois|j'ai une?|j'ai|s'il te plaît|s'il vous plaît)\b/gi, " ")
    .replace(/(?:เตือนฉัน|ช่วยเตือนฉัน|ช่วยเตือน|ฉันต้อง|ฉันจะ|ต้อง)/g, " ")
    .replace(/\b(day after tomorrow|tomorrow|today|in\s+\d+\s+(?:days?|minutes?)|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi, " ")
    .replace(/\b(après-demain|apres-demain|demain|aujourd'hui|dans\s+\d+\s+(?:jours?|minutes?)|ce\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche))\b/gi, " ")
    .replace(/(?:มะรืน|พรุ่งนี้|วันนี้|อีก\s*\d+\s*(?:วัน|นาที)|วัน(?:จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์|อาทิตย์)(?:นี้|หน้า)?)/g, " ")
    .replace(/\b(?:at\s*)?(?:1[0-2]|0?[1-9])(?:\s*[:.]\s*[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, " ")
    .replace(/\b(?:at\s+|à\s+)(?:[01]?\d|2[0-3])\b/gi, " ")
    .replace(/\b(?:[01]?\d|2[0-3])\s*h(?:eures?)?\s*(?:[0-5]\d)?\b/gi, " ")
    .replace(/(?:ตอน)?\s*(?:บ่าย\s*\d{1,2}(?:\s*โมง)?|ตี\s*\d{1,2}|\d{1,2}\s*ทุ่ม|\d{1,2}\s*โมง(?:\s*(?:เช้า|เย็น|ตอนเช้า))?|เที่ยงคืน|เที่ยง)(?:\s*\d{1,2}\s*นาที)?/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-–—\s]+|[,;:\-–—\s]+$/g, "")
    .trim();
}

function inferType(text: string): FutureItemType {
  const lower = normalizeApostrophes(text.toLowerCase());
  if (/\bremind\b|\brappel(?:le)?\b|เตือน/.test(lower)) return "reminder";
  if (/\bmeeting\b|\bmeet\b|\bappointment\b|\bdinner\b|\blunch\b|\bréunion\b|\breunion\b|\brendez[- ]vous\b|\bdéjeuner\b|\bdejeuner\b|\bdîner\b|\bdiner\b|ประชุม|นัด|กินข้าว|เจอ/.test(lower)) return "event";
  return "task";
}

function capitalizeTitle(title: string) {
  return title ? title[0].toUpperCase() + title.slice(1) : title;
}

export function parseCommand(rawText: string, now = new Date(), locale: Locale = "en"): ParsedCommand {
  const text = rawText.trim();
  if (!text) throw new Error(clarificationCopy[locale].ambiguous_time);

  const type = inferType(text);
  const lower = normalizeApostrophes(text.toLowerCase());
  const relativeMinutes = lower.match(/\bin\s+(\d+)\s+minutes?\b|\bdans\s+(\d+)\s+minutes?\b|อีก\s*(\d+)\s*นาที/);
  const time = extractTime(text);
  const date = resolveDate(text, now, locale);

  // Day 1.2 rule: never invent a meeting/appointment time.
  if (type === "event" && !time) {
    throw new ClarificationError("missing_time", clarificationCopy[locale].missing_time);
  }

  // Relative-minute reminders are useful for quick reminders and testing notifications.
  const relativeMinuteCount = Number(relativeMinutes?.[1] ?? relativeMinutes?.[2] ?? relativeMinutes?.[3] ?? 0);
  const when = relativeMinuteCount > 0
    ? new Date(now.getTime() + relativeMinuteCount * 60 * 1000)
    : atLocal(date, time?.hours ?? 9, time?.minutes ?? 0);
  const title = capitalizeTitle(cleanTitle(text) || (locale === "fr" ? "Élément sans titre" : locale === "th" ? "รายการไม่มีชื่อ" : "Untitled item"));

  if (type === "event") {
    return {
      type,
      title,
      startsAt: when.toISOString(),
      reminderMinutesBefore: 30,
      remindAt: new Date(when.getTime() - 30 * 60 * 1000).toISOString(),
      rawText,
    };
  }

  return {
    type,
    title,
    dueAt: when.toISOString(),
    remindAt: when.toISOString(),
    rawText,
  };
}
