import type { Locale } from "./i18n";

const FR_HINTS = /\b(demain|aujourd'hui|rappelle|rendez[- ]vous|réunion|reunion|samedi|dimanche|lundi|mardi|mercredi|jeudi|vendredi|avec|dans|jours?|heure|heures|agenda|dois)\b/i;
const EN_HINTS = /\b(tomorrow|today|remind|meeting|appointment|saturday|sunday|monday|tuesday|wednesday|thursday|friday|with|days?|hour|schedule|need|have)\b/i;

export function detectLocale(text: string, fallback: Locale = "en"): Locale {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  const thaiChars = (trimmed.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const latinChars = (trimmed.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  if (thaiChars > 0 && thaiChars >= latinChars * 0.35) return "th";

  let fr = 0;
  let en = 0;
  if (FR_HINTS.test(trimmed)) fr += 3;
  if (EN_HINTS.test(trimmed)) en += 3;
  fr += (trimmed.match(/[àâçéèêëîïôùûüÿœæ]/gi) ?? []).length;
  en += (trimmed.match(/\b(i|my|the|to|at|in|on)\b/gi) ?? []).length * 0.4;

  if (fr > en) return "fr";
  if (en > fr) return "en";
  return fallback;
}

export function localeName(locale: Locale) {
  return locale === "fr" ? "Français" : locale === "th" ? "ไทย" : "English";
}
