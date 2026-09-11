import type { FutureItem, ParsedCommand } from "./types";

const KEY = "future-mvp-items-v1";
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;

export function purgeExpiredCompleted(items: FutureItem[], now = Date.now()) {
  return items.filter((item) => !item.completedAt || now - new Date(item.completedAt).getTime() < COMPLETED_TTL_MS);
}

export function loadItems(): FutureItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as FutureItem[];
    const clean = purgeExpiredCompleted(parsed);
    if (clean.length !== parsed.length) localStorage.setItem(KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return [];
  }
}

export function saveItems(items: FutureItem[]) {
  localStorage.setItem(KEY, JSON.stringify(purgeExpiredCompleted(items)));
}

export function materialize(parsed: ParsedCommand): FutureItem {
  return { ...parsed, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

export function isLikelyDuplicate(a: FutureItem, b: FutureItem) {
  if (a.completedAt) return false;
  const timeA = new Date(a.startsAt ?? a.dueAt ?? a.remindAt ?? 0).getTime();
  const timeB = new Date(b.startsAt ?? b.dueAt ?? b.remindAt ?? 0).getTime();
  const nearTime = Math.abs(timeA - timeB) <= 15 * 60 * 1000;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]+/g, " ").trim();
  const wordsA = new Set(normalize(a.title).split(" ").filter(Boolean));
  const wordsB = new Set(normalize(b.title).split(" ").filter(Boolean));
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  const similarity = overlap / Math.max(wordsA.size, wordsB.size, 1);
  return a.type === b.type && nearTime && similarity >= 0.5;
}
