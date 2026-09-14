import type { FutureItem } from './types';
import type { Locale } from './i18n';

const NOTIFIED_KEY = 'future.notified-reminders-v2';

export function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function registerFutureServiceWorker() {
  if (!canUseNotifications()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) return 'unsupported' as const;
  return await Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function subscribeFuturePush() {
  if (!canUseNotifications()) throw new Error('Notifications are not supported on this device.');
  const registration = await registerFutureServiceWorker();
  if (!registration) throw new Error('Could not register Future service worker.');
  if (Notification.permission !== 'granted') throw new Error('Notification permission is not granted.');
  const configResponse = await fetch('/api/push/subscribe', { cache: 'no-store' });
  const config = await configResponse.json();
  if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error || 'Web Push is not configured.');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
  }
  const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not save push subscription.');
  return subscription;
}

export async function currentFuturePushSubscription() {
  const registration = await registerFutureServiceWorker();
  return registration ? await registration.pushManager.getSubscription() : null;
}

export async function sendFutureTestPush() {
  const subscription = await currentFuturePushSubscription();
  if (!subscription) throw new Error('Enable notifications first.');
  const response = await fetch('/api/push/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Test push failed.');
  return true;
}

function getNotifiedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveNotifiedIds(ids: Set<string>) { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids].slice(-500))); }

function notificationCopy(locale: Locale, item: FutureItem) {
  const time = new Date(item.startsAt ?? item.dueAt ?? item.remindAt ?? Date.now());
  const formatted = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : locale === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(time);
  if (locale === 'fr') return { title: 'Future · Rappel', body: `${item.title} · ${formatted}` };
  if (locale === 'th') return { title: 'Future · แจ้งเตือน', body: `${item.title} · ${formatted}` };
  return { title: 'Future · Reminder', body: `${item.title} · ${formatted}` };
}

export async function showRawNotification(title: string, body: string, tag = 'future-test') {
  if (!canUseNotifications() || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, { body, tag, data: { url: '/' }, requireInteraction: false });
    return true;
  } catch {
    try { new Notification(title, { body, tag }); return true; } catch { return false; }
  }
}

export async function showFutureNotification(item: FutureItem, locale: Locale) {
  const copy = notificationCopy(locale, item);
  return await showRawNotification(copy.title, copy.body, `future-${item.id}`);
}

export async function runDueReminderCheck(items: FutureItem[], locale: Locale) {
  if (!canUseNotifications() || Notification.permission !== 'granted') return [] as FutureItem[];
  const now = Date.now(); const grace = 10 * 60 * 1000; const notified = getNotifiedIds(); const sent: FutureItem[] = [];
  for (const item of items) {
    if (!item.remindAt || notified.has(item.id)) continue;
    const reminderTime = new Date(item.remindAt).getTime();
    if (!Number.isFinite(reminderTime)) continue;
    if (reminderTime <= now && reminderTime >= now - grace && await showFutureNotification(item, locale)) { notified.add(item.id); sent.push(item); }
  }
  if (sent.length) saveNotifiedIds(notified);
  return sent;
}

export function resetNotifiedStateForItem(id: string) {
  const notified = getNotifiedIds();
  if (notified.delete(id)) saveNotifiedIds(notified);
}
