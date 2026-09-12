import type { Locale } from "./i18n";

export type AssistantActionKind =
  | "open_url" | "search_web" | "phone" | "email" | "maps" | "calendar"
  | "shopping" | "media" | "travel" | "translate" | "news" | "weather";

export type WebAction = {
  kind: AssistantActionKind;
  title: string;
  detail: string;
  url: string;
  locale: Locale;
  links?: { label: string; url: string }[];
  comparison?: { name: string; price: string; why: string; url: string }[];
};

function label(locale: Locale, en: string, fr: string, th: string) {
  return locale === "fr" ? fr : locale === "th" ? th : en;
}

function stripWakeWord(text: string) {
  return text.replace(/^\s*(?:hey\s+future|เฮ้\s*future|salut\s+future)[,!]?\s*/i, "").trim();
}

/** Remove common spoken-language wrappers without changing the actual request. */
export function normalizeAssistantText(raw: string) {
  let text = stripWakeWord(raw).replace(/\s+/g, " ").trim();
  const leading = [
    /^(?:please\s+)?(?:can|could|would)\s+you\s+/i,
    /^(?:please\s+)?(?:i\s+want\s+you\s+to|i'd\s+like\s+you\s+to)\s+/i,
    /^(?:please\s+)?/i,
    /^(?:s['’]il\s+te\s+pla[iî]t|s['’]il\s+vous\s+pla[iî]t)[, ]+/i,
    /^(?:est-ce\s+que\s+tu\s+peux|peux-tu|pourrais-tu|je\s+veux\s+que\s+tu|j['’]aimerais\s+que\s+tu)\s+/i,
    /^(?:ช่วย|ช่วยฉัน|ช่วยหน่อย|รบกวน|อยากให้ช่วย|ฉันอยากให้(?:เธอ|คุณ)?|ขอให้)\s*/i,
  ];
  for (const p of leading) text = text.replace(p, "").trim();
  text = text
    .replace(/\s+(?:please|for me|thanks?|thank you)[.!?]*$/i, "")
    .replace(/\s+(?:s['’]il te pla[iî]t|s['’]il vous pla[iî]t|merci)[.!?]*$/i, "")
    .replace(/(?:ให้หน่อย|หน่อยนะ|ทีนะ|ที|หน่อย|ให้ฉันหน่อย)[.!?]*$/i, "")
    .trim();
  return text;
}

export function hasSchedulingCue(text: string) {
  return /\b(today|tomorrow|tonight|next\s+|in\s+\d+\s+(?:minutes?|hours?|days?)|at\s+\d|remind|reminder|later|aujourd'hui|demain|ce soir|prochain|dans\s+\d+\s+(?:minutes?|heures?|jours?)|à\s+\d|rappelle|rappel)\b|วันนี้|พรุ่งนี้|คืนนี้|อีก\s*\d+\s*(?:นาที|ชั่วโมง|วัน)|ตอน\s*\d|\d+\s*โมง|บ่าย|ทุ่ม|เตือน/i.test(text);
}

export function hasMemoryCue(text: string) {
  const t = normalizeAssistantText(text);
  return /^(?:remember|note|save|add\s+(?:a\s+)?task|make\s+(?:a\s+)?note|create\s+(?:a\s+)?task|to-?do|rappelle-moi|note|enregistre|ajoute\s+(?:une\s+)?tâche|ajoute\s+(?:une\s+)?tache|crée\s+(?:une\s+)?tâche|cree\s+(?:une\s+)?tache|จำ|จด|บันทึก|เพิ่มงาน|สร้างงาน|ทำรายการ)/i.test(t);
}

function normalizeSite(site: string) {
  const clean = site.trim().replace(/[.,!?]+$/, "");
  if (/^https?:\/\//i.test(clean)) return clean;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(clean)) return `https://${clean}`;
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}

function googleSearch(q: string) { return `https://www.google.com/search?q=${encodeURIComponent(q)}`; }
function youtubeSearch(q: string) { return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`; }

function shoppingAction(query: string, locale: Locale): WebAction {
  const links = [
    { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}` },
    { label: "Amazon FR", url: `https://www.amazon.fr/s?k=${encodeURIComponent(query)}` },
    { label: "Etsy", url: `https://www.etsy.com/search?q=${encodeURIComponent(query)}` },
  ];
  return {
    kind: "shopping",
    title: label(locale, `Compare ${query}`, `Comparer : ${query}`, `เปรียบเทียบ ${query}`),
    detail: label(locale, "Research first — no purchase is made automatically.", "Recherche d’abord — aucun achat automatique.", "ค้นหาและเปรียบเทียบก่อน — ยังไม่ซื้ออัตโนมัติ"),
    url: links[0].url,
    links,
    locale,
  };
}

export function parseAssistantAction(raw: string, locale: Locale): WebAction | null {
  const text = normalizeAssistantText(raw);
  if (!text || hasSchedulingCue(text)) return null;

  // Music/video: accept normal speech even when the user does not explicitly say YouTube.
  const mediaPatterns = [
    /^(?:play|put on|listen to|open|find|search for)\s+(?:the\s+song\s+|song\s+|music\s+|video\s+)?(.+?)(?:\s+(?:on\s+)?(?:youtube|you tube))?$/i,
    /^(?:joue|mets|écoute|ecoute|ouvre|trouve|cherche)\s+(?:la\s+chanson\s+|chanson\s+|musique\s+|vidéo\s+|video\s+)?(.+?)(?:\s+(?:sur\s+)?youtube)?$/i,
    /^(?:เปิด|เล่น|ฟัง|หา|ค้นหา)\s*(?:เพลง|วิดีโอ|คลิป)?\s*(.+?)(?:\s*(?:ใน|บน)?\s*(?:ยูทูบ|youtube))?$/i,
  ];
  // Avoid letting generic "open/find" swallow maps/shopping/search requests.
  if (/^(?:play|put on|listen to|joue|mets|écoute|ecoute|เล่น|ฟัง|เปิดเพลง)/i.test(text) || /(?:youtube|ยูทูบ)$/i.test(text)) {
    for (const p of mediaPatterns) {
      const m = text.match(p);
      if (m?.[1]?.trim()) {
        const q = m[1].trim().replace(/\s+(?:on|sur)\s+youtube$/i, "");
        return { kind: "media", title: label(locale, `Play ${q} on YouTube`, `Lire ${q} sur YouTube`, `เล่น ${q} บน YouTube`), detail: q, url: youtubeSearch(q), locale };
      }
    }
  }

  if (/\b(?:open|launch)\s+(?:youtube|you tube)\b/i.test(text) || /\b(?:ouvre|ouvrir)\s+youtube\b/i.test(text) || /(?:เปิด|เข้า)\s*(?:ยูทูบ|youtube)/i.test(text))
    return { kind: "open_url", title: label(locale, "Open YouTube", "Ouvrir YouTube", "เปิด YouTube"), detail: "youtube.com", url: "https://www.youtube.com/", locale };
  if (/\b(?:open|launch)\s+google\b/i.test(text) || /\b(?:ouvre|ouvrir)\s+google\b/i.test(text) || /(?:เปิด|เข้า)\s*google/i.test(text))
    return { kind: "open_url", title: label(locale, "Open Google", "Ouvrir Google", "เปิด Google"), detail: "google.com", url: "https://www.google.com/", locale };

  // Calendar
  if (/\b(?:open|show)\s+(?:my\s+)?calendar\b/i.test(text) || /\b(?:ouvre|affiche)\s+(?:mon\s+)?calendrier\b/i.test(text) || /(?:เปิด|ดู)\s*(?:ปฏิทิน|calendar)/i.test(text))
    return { kind: "calendar", title: label(locale, "Open Calendar", "Ouvrir le calendrier", "เปิดปฏิทิน"), detail: "Google Calendar", url: "https://calendar.google.com/calendar/u/0/r", locale };

  // Maps, restaurants, shops and places.
  const place = text.match(/^(?:find|show|search for|look for|nearby|where(?:'s| is)|cherche|trouve|montre|où est|ou est|หา|ค้นหา|มี|แถวนี้มี)\s+(?:a\s+|an\s+|un\s+|une\s+)?(.+?(?:restaurant|café|cafe|hotel|pharmacy|doctor|hospital|supermarket|shop|store|garage|station|ร้านอาหาร|คาเฟ่|ร้านกาแฟ|โรงแรม|ร้านขายยา|หมอ|โรงพยาบาล|ซูเปอร์|ร้านค้า|อู่|ปั๊ม).*)$/i);
  if (place?.[1]) {
    const q = place[1].trim();
    return { kind: "maps", title: label(locale, `Find ${q}`, `Trouver ${q}`, `ค้นหา ${q}`), detail: q, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, locale };
  }
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
      return { kind: "maps", title: label(locale, `Find ${q} on Maps`, `Rechercher ${q} sur Maps`, `ค้นหา ${q} ใน Maps`), detail: q, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, locale };
    }
  }

  // Phone
  const phone = text.match(/^(?:call|phone|dial|appelle|téléphone à|telephone a|โทร(?:หา)?)\s+(.+)/i);
  if (phone?.[1]) {
    const target = phone[1].trim();
    const numeric = target.match(/\+?[\d\s().-]{6,}/)?.[0]?.replace(/[^\d+]/g, "");
    return { kind: "phone", title: label(locale, `Call ${target}`, `Appeler ${target}`, `โทรหา ${target}`), detail: numeric || target, url: numeric ? `tel:${numeric}` : googleSearch(`phone ${target}`), locale };
  }

  // Email draft
  const email = text.match(/^(?:email|write\s+(?:an\s+)?email\s+to|send\s+(?:an\s+)?email\s+to|écris\s+(?:un\s+)?(?:e-?mail|mail)\s+à|envoie\s+(?:un\s+)?(?:e-?mail|mail)\s+à|เขียนอีเมล(?:ถึง)?|ส่งอีเมล(?:ถึง)?)\s+(.+)/i);
  if (email?.[1]) {
    const rest = email[1].trim();
    const address = rest.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const subjectMatch = rest.match(/(?:about|subject|objet|เรื่อง)\s+(.+)/i);
    const subject = subjectMatch?.[1]?.trim() || "";
    const url = address ? `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}` : "https://mail.google.com/mail/u/0/#inbox?compose=new";
    return { kind: "email", title: label(locale, `Draft email to ${address || rest}`, `Rédiger un e-mail à ${address || rest}`, `เขียนอีเมลถึง ${address || rest}`), detail: subject || address || rest, url, locale };
  }

  // Shopping/gifts — accepts conversational wording, budgets and recipients.
  if (/(?:gift|present|cadeau|ของขวัญ)/i.test(text) && /(?:find|compare|search|buy|idea|trouve|compare|cherche|achète|achete|idée|idee|หา|เปรียบเทียบ|ค้นหา|ซื้อ|ไอเดีย)/i.test(text)) {
    const q = text.replace(/^(?:find|compare|search for|buy|give me ideas for|trouve|compare|cherche|achète|achete|donne-moi des idées pour|หา|เปรียบเทียบ|ค้นหา|ซื้อ|ขอไอเดีย)\s*/i, "").trim() || "gift";
    const action = shoppingAction(q, locale);
    action.comparison = [
      { name: label(locale, "Personalized", "Personnalisé", "ของขวัญเฉพาะบุคคล"), price: "€20–60", why: label(locale, "Easy to tailor to the recipient.", "Facile à adapter au destinataire.", "ปรับให้เข้ากับผู้รับได้ง่าย"), url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`personalized ${q}`)}` },
      { name: label(locale, "Experience", "Expérience", "ประสบการณ์"), price: "€50–150", why: label(locale, "Memorable and useful when they already own enough things.", "Mémorable si la personne possède déjà beaucoup d’objets.", "เหมาะกับคนที่มีของเยอะแล้วและอยากได้ความทรงจำ"), url: googleSearch(`${q} experience voucher`) },
      { name: label(locale, "Premium option", "Option premium", "ตัวเลือกพรีเมียม"), price: "€80–200", why: label(locale, "A polished choice for someone important.", "Un choix soigné pour quelqu’un d’important.", "เหมาะกับคนสำคัญและดูเป็นทางการขึ้น"), url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`premium ${q}`)}` },
    ];
    return action;
  }
  const genericShop = text.match(/^(?:find|compare|search for|look for|buy|trouve|compare|cherche|achète|achete|หา|เปรียบเทียบ|ค้นหา|ซื้อ)\s+(.+?)(?:\s+(?:to buy|à acheter|ที่จะซื้อ))?$/i);
  if (genericShop && /(?:price|cheap|best|deal|under|budget|€|eur|euro|ราคา|งบ|ยูโร|โปรโมชั่น|promo|achat|acheter|buy)/i.test(text)) return shoppingAction(genericShop[1].trim(), locale);

  // Travel research (never auto-book/spend).
  if (/(?:flight|vol|เที่ยวบิน|ตั๋วเครื่องบิน)/i.test(text) && /(?:find|search|compare|book|cherche|trouve|compare|réserve|reserve|หา|ค้นหา|เปรียบเทียบ|จอง)/i.test(text))
    return { kind: "travel", title: label(locale, "Compare flights", "Comparer les vols", "เปรียบเทียบเที่ยวบิน"), detail: text, url: `https://www.google.com/travel/flights?q=${encodeURIComponent(text)}`, locale };
  if (/(?:hotel|hôtel|โรงแรม)/i.test(text) && /(?:find|search|compare|book|cherche|trouve|compare|réserve|reserve|หา|ค้นหา|เปรียบเทียบ|จอง)/i.test(text))
    return { kind: "travel", title: label(locale, "Compare hotels", "Comparer les hôtels", "เปรียบเทียบโรงแรม"), detail: text, url: `https://www.google.com/travel/hotels?q=${encodeURIComponent(text)}`, locale };
  if (/(?:car rental|rent a car|location de voiture|louer une voiture|เช่ารถ|รถเช่า)/i.test(text))
    return { kind: "travel", title: label(locale, "Compare car rentals", "Comparer les locations de voiture", "เปรียบเทียบรถเช่า"), detail: text, url: googleSearch(text), locale };

  // Weather / news / translation helpers.
  const weather = text.match(/^(?:what(?:'s| is) the weather(?: like)?(?: in)?|weather(?: in)?|météo(?: à| a| de)?|meteo(?: à| a| de)?|quel temps fait-il(?: à| a)?|อากาศ(?:ที่)?|เช็คอากาศ(?:ที่)?)\s*(.*)$/i);
  if (weather) {
    const place = (weather[1] || "").trim(); const q = `weather ${place}`.trim();
    return { kind: "weather", title: label(locale, `Check weather${place ? ` in ${place}` : ""}`, `Voir la météo${place ? ` à ${place}` : ""}`, `ดูอากาศ${place ? `ที่ ${place}` : ""}`), detail: q, url: googleSearch(q), locale };
  }
  const news = text.match(/^(?:news(?: about| on)?|latest news(?: about)?|actualités(?: sur)?|actualites(?: sur)?|ข่าว(?:เกี่ยวกับ)?|ข่าวล่าสุด(?:เกี่ยวกับ)?)\s*(.*)$/i);
  if (news) {
    const topic = (news[1] || "").trim();
    return { kind: "news", title: label(locale, `Latest news${topic ? `: ${topic}` : ""}`, `Actualités${topic ? ` : ${topic}` : ""}`, `ข่าวล่าสุด${topic ? `: ${topic}` : ""}`), detail: topic || "news", url: `https://news.google.com/search?q=${encodeURIComponent(topic || "latest")}`, locale };
  }
  const trans = text.match(/^(?:translate|traduis|traduire|แปล)\s+(.+)/i);
  if (trans?.[1]) {
    const q = trans[1].trim();
    return { kind: "translate", title: label(locale, "Open translation", "Ouvrir la traduction", "เปิดคำแปล"), detail: q, url: `https://translate.google.com/?sl=auto&tl=${locale === "fr" ? "fr" : locale === "th" ? "th" : "en"}&text=${encodeURIComponent(q)}&op=translate`, locale };
  }

  // Explicit web research/search.
  const searchPatterns = [
    /^(?:search\s+(?:google\s+)?(?:for\s+)?|look\s+up\s+|research\s+|find\s+information\s+(?:about|on)\s+)(.+)/i,
    /^(?:cherche\s+(?:sur\s+google\s+)?|recherche\s+(?:google\s+)?|fais\s+une\s+recherche\s+sur\s+)(.+)/i,
    /^(?:ค้นหา(?:ในกูเกิล)?|ค้นในกูเกิล|หาในกูเกิล|หาข้อมูล(?:เกี่ยวกับ)?|ค้นข้อมูล(?:เกี่ยวกับ)?)\s*(.+)/i,
  ];
  for (const p of searchPatterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) {
      const q = m[1].trim();
      return { kind: "search_web", title: label(locale, `Search ${q}`, `Rechercher ${q}`, `ค้นหา ${q}`), detail: q, url: googleSearch(q), locale };
    }
  }

  // Generic website.
  const site = text.match(/^(?:open|go\s+to|visit|ouvre|va\s+sur|เปิด|เข้า(?:เว็บ)?)\s+(.+)/i);
  if (site?.[1]) {
    const target = site[1].trim();
    return { kind: "open_url", title: label(locale, `Open ${target}`, `Ouvrir ${target}`, `เปิด ${target}`), detail: target, url: normalizeSite(target), locale };
  }

  return null;
}

/** Safe fallback for an unfamiliar request: search it instead of accidentally saving it as a task. */
export function fallbackResearchAction(raw: string, locale: Locale): WebAction | null {
  const q = normalizeAssistantText(raw).replace(/[?？]+$/, "").trim();
  if (q.length < 2 || hasSchedulingCue(q) || hasMemoryCue(q)) return null;
  return { kind: "search_web", title: label(locale, `Search: ${q}`, `Rechercher : ${q}`, `ค้นหา: ${q}`), detail: q, url: googleSearch(q), locale };
}

export function webActionSpeech(action: WebAction) {
  if (action.locale === "th") {
    if (action.kind === "phone") return `ฉันเตรียมการโทร ${action.detail} ให้แล้ว`;
    if (action.kind === "email") return "ฉันเตรียมอีเมลให้แล้ว";
    if (action.kind === "maps") return "ฉันเตรียมแผนที่และสถานที่ให้แล้ว";
    if (action.kind === "calendar") return "ฉันเตรียมเปิดปฏิทินให้แล้ว";
    if (action.kind === "shopping") return "ฉันเตรียมตัวเลือกสินค้าและลิงก์เปรียบเทียบราคาให้แล้ว ยังไม่มีการซื้ออัตโนมัติ";
    if (action.kind === "media") return `ฉันเตรียมเล่น ${action.detail} บน YouTube ให้แล้ว`;
    if (action.kind === "travel") return "ฉันเตรียมตัวเลือกการเดินทางให้เปรียบเทียบแล้ว ยังไม่ได้จองหรือชำระเงิน";
    if (action.kind === "translate") return "ฉันเปิดเครื่องมือแปลให้แล้ว";
    if (action.kind === "news") return "ฉันเตรียมข่าวล่าสุดให้แล้ว";
    if (action.kind === "weather") return "ฉันเตรียมข้อมูลสภาพอากาศให้แล้ว";
    if (action.kind === "search_web") return `ฉันค้นหา ${action.detail} ให้แล้ว`;
    return `ฉันเตรียมเปิด ${action.detail} ให้แล้ว`;
  }
  if (action.locale === "fr") {
    if (action.kind === "phone") return `J’ai préparé l’appel vers ${action.detail}.`;
    if (action.kind === "email") return "J’ai préparé votre e-mail.";
    if (action.kind === "maps") return "J’ai préparé Maps et les lieux correspondants.";
    if (action.kind === "calendar") return "J’ai préparé votre calendrier.";
    if (action.kind === "shopping") return "J’ai préparé des options et des liens de comparaison. Aucun achat automatique.";
    if (action.kind === "media") return `J’ai préparé ${action.detail} sur YouTube.`;
    if (action.kind === "travel") return "J’ai préparé les options de voyage. Aucune réservation ni paiement automatique.";
    if (action.kind === "translate") return "J’ai préparé la traduction.";
    if (action.kind === "news") return "J’ai préparé les dernières actualités.";
    if (action.kind === "weather") return "J’ai préparé la météo.";
    if (action.kind === "search_web") return `J’ai lancé la recherche pour ${action.detail}.`;
    return `J’ai préparé l’ouverture de ${action.detail}.`;
  }
  if (action.kind === "phone") return `I prepared the call to ${action.detail}.`;
  if (action.kind === "email") return "I prepared the email draft.";
  if (action.kind === "maps") return "I prepared Maps and relevant places.";
  if (action.kind === "calendar") return "I prepared your calendar.";
  if (action.kind === "shopping") return "I prepared options and price-comparison links. No purchase was made automatically.";
  if (action.kind === "media") return `I prepared ${action.detail} on YouTube.`;
  if (action.kind === "travel") return "I prepared travel options to compare. Nothing was booked or paid automatically.";
  if (action.kind === "translate") return "I prepared the translation.";
  if (action.kind === "news") return "I prepared the latest news.";
  if (action.kind === "weather") return "I prepared the weather search.";
  if (action.kind === "search_web") return `I searched for ${action.detail}.`;
  return `I prepared ${action.detail}.`;
}
