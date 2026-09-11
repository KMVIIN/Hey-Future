import type { Locale } from "./i18n";

export type AssistantActionKind = "open_url" | "search_web" | "phone" | "email" | "maps" | "calendar" | "shopping" | "media" | "travel";

export type WebAction = {
  kind: AssistantActionKind;
  title: string;
  detail: string;
  url: string;
  locale: Locale;
  links?: { label: string; url: string }[];
  comparison?: { name: string; price: string; why: string; url: string }[];
};

function stripWakeWord(text: string) {
  return text.replace(/^\s*(?:hey\s+future|เฮ้\s*future|salut\s+future)[,!]?\s*/i, "").trim();
}

export function hasSchedulingCue(text: string) {
  return /\b(today|tomorrow|tonight|next\s+|in\s+\d+\s+(?:minutes?|hours?|days?)|at\s+\d|remind|reminder|later|aujourd'hui|demain|ce soir|prochain|dans\s+\d+\s+(?:minutes?|heures?|jours?)|à\s+\d|rappelle|rappel)\b|วันนี้|พรุ่งนี้|คืนนี้|อีก\s*\d+\s*(?:นาที|ชั่วโมง|วัน)|ตอน\s*\d|\d+\s*โมง|บ่าย|ทุ่ม|เตือน/i.test(text);
}

function label(locale: Locale, en: string, fr: string, th: string) {
  return locale === "fr" ? fr : locale === "th" ? th : en;
}

function normalizeSite(site: string) {
  const clean = site.trim().replace(/[.,!?]+$/, "");
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(clean)) return `https://${clean}`;
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}

export function parseAssistantAction(raw: string, locale: Locale): WebAction | null {
  const text = stripWakeWord(raw);
  if (!text || hasSchedulingCue(text)) return null;

  // Music / video on YouTube. We can open the search automatically from a typed Send gesture.
  // Browsers/YouTube may still require one tap before media playback starts.
  const mediaPatterns = [
    /^(?:play|open|find|search for)\s+(.+?)\s+(?:on\s+)?(?:youtube|you tube)$/i,
    /^(?:joue|mets|ouvre|trouve|cherche)\s+(.+?)\s+(?:sur\s+)?youtube$/i,
    /^(?:เปิด|เล่น|หา|ค้นหา)\s*(?:เพลง|วิดีโอ)?\s*(.+?)\s*(?:ใน|บน)?\s*(?:ยูทูบ|youtube)$/i,
  ];
  for (const p of mediaPatterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) {
      const q = m[1].trim();
      return { kind:"media", title:label(locale,`Play ${q} on YouTube`,`Lire ${q} sur YouTube`,`เปิด ${q} บน YouTube`), detail:q, url:`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, locale };
    }
  }

  // YouTube / Google shortcuts
  if (/\b(?:open|launch)\s+(?:youtube|you tube)\b/i.test(text) || /\b(?:ouvre|ouvrir)\s+youtube\b/i.test(text) || /(?:เปิด|เข้า)\s*(?:ยูทูบ|youtube)/i.test(text)) {
    return { kind:"open_url", title:label(locale,"Open YouTube","Ouvrir YouTube","เปิด YouTube"), detail:"youtube.com", url:"https://www.youtube.com/", locale };
  }
  if (/\b(?:open|launch)\s+google\b/i.test(text) || /\b(?:ouvre|ouvrir)\s+google\b/i.test(text) || /(?:เปิด|เข้า)\s*google/i.test(text)) {
    return { kind:"open_url", title:label(locale,"Open Google","Ouvrir Google","เปิด Google"), detail:"google.com", url:"https://www.google.com/", locale };
  }

  // Calendar
  if (/\b(?:open|show)\s+(?:my\s+)?calendar\b/i.test(text) || /\b(?:ouvre|affiche)\s+(?:mon\s+)?calendrier\b/i.test(text) || /(?:เปิด|ดู)\s*(?:ปฏิทิน|calendar)/i.test(text)) {
    return { kind:"calendar", title:label(locale,"Open Calendar","Ouvrir le calendrier","เปิดปฏิทิน"), detail:"Google Calendar", url:"https://calendar.google.com/calendar/u/0/r", locale };
  }

  // Maps / navigation search
  const mapPatterns = [
    /^(?:open\s+)?(?:google\s+)?maps?(?:\s+(?:for|to|and\s+find))?\s+(.+)/i,
    /^(?:ouvre\s+)?(?:google\s+)?maps?(?:\s+(?:pour|vers))?\s+(.+)/i,
    /^(?:เปิด\s*)?(?:google\s*)?(?:maps?|แผนที่)(?:\s*(?:ไป|หา))?\s*(.+)/i,
    /^(?:พาไป|นำทางไป)\s+(.+)/i,
  ];
  for (const p of mapPatterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) {
      const q = m[1].trim();
      return { kind:"maps", title:label(locale,`Find ${q} on Maps`,`Rechercher ${q} sur Maps`,`ค้นหา ${q} ใน Maps`), detail:q, url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, locale };
    }
  }
  if (/\b(?:open|launch)\s+(?:google\s+)?maps?\b/i.test(text) || /\bouvre\s+(?:google\s+)?maps?\b/i.test(text) || /(?:เปิด)\s*(?:google\s*)?(?:maps?|แผนที่)/i.test(text)) {
    return { kind:"maps", title:label(locale,"Open Google Maps","Ouvrir Google Maps","เปิด Google Maps"), detail:"maps.google.com", url:"https://maps.google.com/", locale };
  }

  // Phone: tel: works on phones and on Windows if a calling app handles it.
  const phone = text.match(/^(?:call|phone|dial|appelle|téléphone à|telephone a|โทร(?:หา)?)\s+(.+)/i);
  if (phone?.[1]) {
    const target = phone[1].trim();
    const numeric = target.match(/\+?[\d\s().-]{6,}/)?.[0]?.replace(/[^\d+]/g, "");
    const url = numeric ? `tel:${numeric}` : `https://www.google.com/search?q=${encodeURIComponent(`phone ${target}`)}`;
    return { kind:"phone", title:label(locale,`Call ${target}`,`Appeler ${target}`,`โทรหา ${target}`), detail:numeric || target, url, locale };
  }

  // Email draft. If an email address is present, use mailto; otherwise open Gmail compose/search fallback.
  const email = text.match(/^(?:email|write\s+(?:an\s+)?email\s+to|send\s+(?:an\s+)?email\s+to|écris\s+(?:un\s+)?(?:e-?mail|mail)\s+à|envoie\s+(?:un\s+)?(?:e-?mail|mail)\s+à|เขียนอีเมล(?:ถึง)?|ส่งอีเมล(?:ถึง)?)\s+(.+)/i);
  if (email?.[1]) {
    const rest = email[1].trim();
    const address = rest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const subjectMatch = rest.match(/(?:about|subject|objet|เรื่อง)\s+(.+)/i);
    const subject = subjectMatch?.[1]?.trim() || "";
    const url = address
      ? `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
      : `https://mail.google.com/mail/u/0/#inbox?compose=new`;
    return { kind:"email", title:label(locale,`Draft email to ${address || rest}`,`Rédiger un e-mail à ${address || rest}`,`เขียนอีเมลถึง ${address || rest}`), detail:subject || address || rest, url, locale };
  }

  // Gift / shopping research. Free edition opens live search sources; it does not purchase.
  const giftPatterns = [
    /^(?:find|compare|search for|buy)\s+(?:a\s+)?(?:birthday\s+)?gift(?:s)?(?:\s+for)?\s*(.*)/i,
    /^(?:trouve|compare|cherche|achète|achete)\s+(?:un\s+)?cadeau(?:x)?(?:\s+d[’']anniversaire)?(?:\s+pour)?\s*(.*)/i,
    /^(?:หา|เปรียบเทียบ|ค้นหา|ซื้อ)\s*(?:ของขวัญ|ของขวัญวันเกิด)(?:ให้|สำหรับ)?\s*(.*)/i,
  ];
  for (const p of giftPatterns) {
    const m = text.match(p);
    if (m) {
      const who = (m[1] || "").trim();
      const q = who ? `birthday gift ${who}` : "birthday gift";
      const links = [
        { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
        { label: "Amazon FR", url: `https://www.amazon.fr/s?k=${encodeURIComponent(q)}` },
        { label: "Etsy", url: `https://www.etsy.com/search?q=${encodeURIComponent(q)}` },
      ];
      const comparison = [
        { name: label(locale,"Personalized gift","Cadeau personnalisé","ของขวัญเฉพาะบุคคล"), price:"€20–60", why:label(locale,"Personal and easy to tailor to the recipient.","Personnel et facile à adapter au destinataire.","ดูใส่ใจและปรับให้เข้ากับผู้รับได้"), url:`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`personalized ${q}`)}` },
        { name: label(locale,"Experience","Expérience","ประสบการณ์"), price:"€50–150", why:label(locale,"Good when you want a memorable gift rather than another object.","Idéal pour offrir un souvenir plutôt qu’un objet.","เหมาะเมื่ออยากให้ความทรงจำมากกว่าสิ่งของ"), url:`https://www.google.com/search?q=${encodeURIComponent(`${q} experience voucher`)}` },
        { name: label(locale,"Premium accessory","Accessoire premium","ของใช้พรีเมียม"), price:"€80–200", why:label(locale,"A polished option for close family, partners or important clients.","Une option soignée pour un proche, partenaire ou client important.","เหมาะกับคนใกล้ชิด คู่รัก หรือลูกค้าสำคัญ"), url:`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`premium ${q}`)}` },
      ];
      return { kind:"shopping", title:label(locale,`Gift comparison${who ? ` for ${who}` : ""}`,`Comparatif de cadeaux${who ? ` pour ${who}` : ""}`,`เปรียบเทียบของขวัญ${who ? `สำหรับ ${who}` : ""}`), detail:label(locale,"Indicative ideas and price ranges — live prices open in shopping sources.","Idées et fourchettes indicatives — les prix en direct s’ouvrent dans les sources shopping.","ตัวเลือกและช่วงราคาโดยประมาณ — ราคาจริงเปิดดูจากแหล่งช้อปปิ้ง"), url:links[0].url, links, comparison, locale };
    }
  }

  // Travel research starters — search/prepare only, never book or spend money automatically.
  const flight = text.match(/^(?:find|search|compare|cherche|trouve|compare|หา|ค้นหา|เปรียบเทียบ)\s+(?:flights?|vols?|ตั๋วเครื่องบิน)(?:\s+(?:from|de|จาก)\s+(.+?))?(?:\s+(?:to|à|a|ไป)\s+(.+))?$/i);
  if (flight) {
    const q = text.replace(/^(?:find|search|compare|cherche|trouve|compare|หา|ค้นหา|เปรียบเทียบ)\s+/i, "");
    return { kind:"travel", title:label(locale,"Compare flights","Comparer les vols","เปรียบเทียบเที่ยวบิน"), detail:q, url:`https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`, locale };
  }
  const hotel = text.match(/^(?:find|search|compare|cherche|trouve|compare|หา|ค้นหา|เปรียบเทียบ)\s+(?:hotels?|hôtels?|โรงแรม)(?:\s+(?:in|à|a|ที่)\s+)?(.+)?$/i);
  if (hotel) {
    const place = (hotel[1] || "").trim();
    const q = place ? `hotels ${place}` : "hotels";
    return { kind:"travel", title:label(locale,`Compare hotels${place ? ` in ${place}` : ""}`,`Comparer les hôtels${place ? ` à ${place}` : ""}`,`เปรียบเทียบโรงแรม${place ? `ที่ ${place}` : ""}`), detail:q, url:`https://www.google.com/travel/hotels?q=${encodeURIComponent(q)}`, locale };
  }

  // Search web
  const searchPatterns = [
    /^(?:search\s+(?:google\s+)?(?:for\s+)?|look\s+up\s+|find\s+)(.+)/i,
    /^(?:cherche\s+(?:sur\s+google\s+)?|recherche\s+(?:google\s+)?|trouve\s+)(.+)/i,
    /^(?:ค้นหา(?:ในกูเกิล)?|ค้นในกูเกิล|หาในกูเกิล|หา)\s*(.+)/i,
  ];
  for (const p of searchPatterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) {
      const q = m[1].trim();
      return { kind:"search_web", title:label(locale,`Search ${q}`,`Rechercher ${q}`,`ค้นหา ${q}`), detail:q, url:`https://www.google.com/search?q=${encodeURIComponent(q)}`, locale };
    }
  }

  // Generic website
  const site = text.match(/^(?:open|go\s+to|visit|ouvre|va\s+sur|เปิด|เข้า(?:เว็บ)?)\s+(.+)/i);
  if (site?.[1]) {
    const target = site[1].trim();
    const url = normalizeSite(target);
    return { kind:"open_url", title:label(locale,`Open ${target}`,`Ouvrir ${target}`,`เปิด ${target}`), detail:target, url, locale };
  }

  return null;
}

export function webActionSpeech(action: WebAction) {
  if (action.locale === "th") {
    if (action.kind === "phone") return `ฉันเตรียมการโทร ${action.detail} ให้แล้ว`;
    if (action.kind === "email") return `ฉันเตรียมอีเมลให้แล้ว`;
    if (action.kind === "maps") return `ฉันเตรียมแผนที่ให้แล้ว`;
    if (action.kind === "calendar") return `ฉันเตรียมเปิดปฏิทินให้แล้ว`;
    if (action.kind === "shopping") return `ฉันเปรียบเทียบแนวทางของขวัญให้แล้ว และเตรียมลิงก์ดูราคาจริง`;
    if (action.kind === "media") return `ฉันเตรียมเปิด ${action.detail} บน YouTube ให้แล้ว`;
    if (action.kind === "travel") return `ฉันเตรียมตัวเลือกการเดินทางให้เปรียบเทียบแล้ว`;
    if (action.kind === "search_web") return `ฉันเตรียมผลการค้นหา ${action.detail} ให้แล้ว`;
    return `ฉันเตรียมเปิด ${action.detail} ให้แล้ว`;
  }
  if (action.locale === "fr") {
    if (action.kind === "phone") return `J’ai préparé l’appel vers ${action.detail}.`;
    if (action.kind === "email") return `J’ai préparé votre e-mail.`;
    if (action.kind === "maps") return `J’ai préparé l’itinéraire sur Maps.`;
    if (action.kind === "calendar") return `J’ai préparé votre calendrier.`;
    if (action.kind === "shopping") return `J’ai préparé un comparatif de cadeaux et des liens vers les prix en direct.`;
    if (action.kind === "media") return `J’ai préparé ${action.detail} sur YouTube.`;
    if (action.kind === "travel") return `J’ai préparé les options de voyage à comparer.`;
    if (action.kind === "search_web") return `J’ai préparé la recherche pour ${action.detail}.`;
    return `J’ai préparé l’ouverture de ${action.detail}.`;
  }
  if (action.kind === "phone") return `I prepared the call to ${action.detail}.`;
  if (action.kind === "email") return `I prepared the email draft.`;
  if (action.kind === "maps") return `I prepared Google Maps.`;
  if (action.kind === "calendar") return `I prepared your calendar.`;
  if (action.kind === "shopping") return `I prepared a gift comparison and links to live shopping prices.`;
  if (action.kind === "media") return `I prepared ${action.detail} on YouTube.`;
  if (action.kind === "travel") return `I prepared travel options to compare.`;
  if (action.kind === "search_web") return `I prepared search results for ${action.detail}.`;
  return `I prepared ${action.detail}.`;
}
