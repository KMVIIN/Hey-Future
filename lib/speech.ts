import type { Locale } from './i18n';
import { localeTag } from './i18n';

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function bestVoice(locale: Locale) {
  if (!canSpeak()) return null;
  const voices = window.speechSynthesis.getVoices();
  const tag = localeTag[locale].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === tag) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(locale)) ||
    null
  );
}

export function speakFuture(text: string, locale: Locale) {
  if (!canSpeak() || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = localeTag[locale];
  const voice = bestVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function reminderSpeech(locale: Locale, title: string) {
  if (locale === 'fr') return `Rappel. ${title}`;
  if (locale === 'th') return `แจ้งเตือน ${title}`;
  return `Reminder. ${title}`;
}

export function savedSpeech(locale: Locale, title: string) {
  if (locale === 'fr') return `C'est noté. ${title}`;
  if (locale === 'th') return `จำไว้แล้ว ${title}`;
  return `Got it. ${title}`;
}
