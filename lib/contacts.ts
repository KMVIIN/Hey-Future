import type { Locale } from "./i18n";
import type { WebAction } from "./actions";

export type FutureContact = {
  id: string;
  name: string;
  phones: string[];
  emails: string[];
  aliases: string[];
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const CONTACTS_KEY = "future.contacts.v1";

function cleanPhone(value: string) {
  return value.trim().replace(/[^+\d]/g, "");
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0E00-\u0E7F+]+/gi, " ").replace(/\s+/g, " ").trim();
}

export function loadContacts(): FutureContact[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveContacts(contacts: FutureContact[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function makeContact(input: { name: string; phone?: string; email?: string; aliases?: string; note?: string }): FutureContact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phones: input.phone?.trim() ? [cleanPhone(input.phone)] : [],
    emails: input.email?.trim() ? [input.email.trim()] : [],
    aliases: (input.aliases ?? "").split(/[,;|]/).map(x => x.trim()).filter(Boolean),
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function mergeContact(existing: FutureContact, incoming: FutureContact): FutureContact {
  const uniq = (items: string[]) => [...new Set(items.map(x => x.trim()).filter(Boolean))];
  return {
    ...existing,
    name: existing.name || incoming.name,
    phones: uniq([...existing.phones, ...incoming.phones]),
    emails: uniq([...existing.emails, ...incoming.emails]),
    aliases: uniq([...existing.aliases, ...incoming.aliases]),
    note: existing.note || incoming.note,
    updatedAt: new Date().toISOString(),
  };
}

export function importVCard(text: string): FutureContact[] {
  const cards = text.split(/END:VCARD/i).map(x => x.trim()).filter(x => /BEGIN:VCARD/i.test(x));
  const results: FutureContact[] = [];
  for (const raw of cards) {
    const lines = raw.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
    const field = (prefix: string) => lines.find(line => line.toUpperCase().startsWith(prefix))?.split(":").slice(1).join(":").trim();
    const fn = field("FN:") || field("N:")?.split(";").filter(Boolean).reverse().join(" ") || "Contact";
    const phones = lines.filter(line => /^TEL/i.test(line)).map(line => cleanPhone(line.split(":").slice(1).join(":"))).filter(Boolean);
    const emails = lines.filter(line => /^EMAIL/i.test(line)).map(line => line.split(":").slice(1).join(":").trim()).filter(Boolean);
    const note = field("NOTE:");
    const now = new Date().toISOString();
    results.push({ id: crypto.randomUUID(), name: fn, phones: [...new Set(phones)], emails: [...new Set(emails)], aliases: [], note, createdAt: now, updatedAt: now });
  }
  return results;
}

export type ContactIntent = { kind: "call" | "message" | "email"; target: string; body?: string };

export function parseContactIntent(raw: string): ContactIntent | null {
  const text = raw.trim().replace(/^\s*(?:hey\s+future|เฮ้\s*future|salut\s+future)[,!]?\s*/i, "");
  let m = text.match(/^(?:call|phone|dial|appelle|téléphone à|telephone a|โทร(?:หา)?)\s+(.+)$/i);
  if (m) return { kind: "call", target: m[1].trim() };
  m = text.match(/^(?:message|text|sms|send\s+(?:a\s+)?message\s+to|envoie\s+(?:un\s+)?message\s+à|envoie\s+(?:un\s+)?sms\s+à|ส่งข้อความ(?:หา|ถึง)?|ส่ง sms(?:หา|ถึง)?)\s+(.+?)(?:\s+(?:saying|say|ว่า|pour dire|en disant)\s+(.+))?$/i);
  if (m) return { kind: "message", target: m[1].trim(), body: m[2]?.trim() };
  m = text.match(/^(?:email|mail|write\s+(?:an\s+)?email\s+to|send\s+(?:an\s+)?email\s+to|écris\s+(?:un\s+)?(?:e-?mail|mail)\s+à|envoie\s+(?:un\s+)?(?:e-?mail|mail)\s+à|เขียนอีเมล(?:ถึง)?|ส่งอีเมล(?:ถึง)?)\s+(.+?)(?:\s+(?:saying|say|ว่า|pour dire|en disant|about|subject|objet|เรื่อง)\s+(.+))?$/i);
  if (m) return { kind: "email", target: m[1].trim(), body: m[2]?.trim() };
  return null;
}

function scoreContact(contact: FutureContact, query: string) {
  const q = normalize(query);
  if (!q) return 0;
  const candidates = [contact.name, ...contact.aliases].map(normalize).filter(Boolean);
  let best = 0;
  for (const value of candidates) {
    if (value === q) best = Math.max(best, 100);
    else if (value.startsWith(q) || q.startsWith(value)) best = Math.max(best, 82);
    else if (value.includes(q) || q.includes(value)) best = Math.max(best, 70);
    else {
      const qWords = q.split(" "); const vWords = value.split(" ");
      const overlap = qWords.filter(w => vWords.includes(w)).length;
      best = Math.max(best, overlap ? 45 + overlap * 10 : 0);
    }
  }
  return best;
}

export function findContact(contacts: FutureContact[], query: string) {
  const ranked = contacts.map(contact => ({ contact, score: scoreContact(contact, query) })).filter(x => x.score > 0).sort((a,b) => b.score - a.score);
  if (!ranked.length) return { match: null as FutureContact | null, alternatives: [] as FutureContact[] };
  const match = ranked[0].score >= 70 ? ranked[0].contact : null;
  return { match, alternatives: ranked.slice(0, 3).map(x => x.contact) };
}

function label(locale: Locale, en: string, fr: string, th: string) { return locale === "th" ? th : locale === "fr" ? fr : en; }

export function contactIntentToAction(intent: ContactIntent, contact: FutureContact, locale: Locale): WebAction | null {
  if (intent.kind === "call") {
    const phone = contact.phones[0]; if (!phone) return null;
    return { kind: "phone", title: label(locale, `Call ${contact.name}`, `Appeler ${contact.name}`, `โทรหา ${contact.name}`), detail: phone, url: `tel:${phone}`, locale };
  }
  if (intent.kind === "message") {
    const phone = contact.phones[0]; if (!phone) return null;
    const body = intent.body ?? "";
    const sep = /iPhone|iPad|iPod/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? "&" : "?";
    const url = `sms:${phone}${body ? `${sep}body=${encodeURIComponent(body)}` : ""}`;
    return { kind: "phone", title: label(locale, `Message ${contact.name}`, `Message à ${contact.name}`, `ส่งข้อความหา ${contact.name}`), detail: body || phone, url, locale };
  }
  const email = contact.emails[0]; if (!email) return null;
  const body = intent.body ?? "";
  return { kind: "email", title: label(locale, `Email ${contact.name}`, `E-mail à ${contact.name}`, `อีเมลถึง ${contact.name}`), detail: email, url: `mailto:${email}${body ? `?body=${encodeURIComponent(body)}` : ""}`, locale };
}
