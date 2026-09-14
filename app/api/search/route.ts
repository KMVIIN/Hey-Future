import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { estimateOpenAICost, getUsageAccess, recordUsage } from "@/lib/usage";

type Result = { title: string; url: string; snippet?: string; source?: string; publishedAt?: string; lat?: number; lng?: number; address?: string; category?: string; distanceKm?: number };
type SearchKind = "general" | "place" | "news" | "shopping" | "travel";
const USER_AGENT = process.env.PUBLIC_SEARCH_USER_AGENT || "Future-AI-Secretary/4.7 (public web search)";

function extractText(data: any) { if (typeof data?.output_text === "string") return data.output_text; for (const item of data?.output ?? []) for (const part of item?.content ?? []) if (part?.type === "output_text" && typeof part.text === "string") return part.text; return ""; }
function safeJson(text: string) { return JSON.parse(text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()); }
function webCalls(data: any) { return (Array.isArray(data?.output) ? data.output : []).filter((x: any) => String(x?.type || "").includes("web_search")).length; }
function decodeHtml(s: string) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim(); }
function uniq(xs: Result[]) { const seen = new Set<string>(); return xs.filter((x) => { const key = x.url.replace(/\/$/, ""); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function unwrapDuckUrl(raw: string) { try { const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw, "https://duckduckgo.com"); const uddg = u.searchParams.get("uddg"); return uddg ? decodeURIComponent(uddg) : u.href; } catch { return raw; } }

const STOP = new Set(["the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "is", "are", "with", "from", "under", "latest", "best", "find", "show", "me", "search", "what", "where", "how", "de", "du", "des", "le", "la", "les", "et", "ou", "pour", "dans", "sur", "à", "au", "aux", "un", "une", "en", "ล่าสุด", "หา", "ค้นหา", "ข้อมูล", "ที่", "ใน", "ของ", "และ", "ให้", "ฉัน"]);
function words(s: string) { return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}€$£]+/gu, " ").split(/\s+/).filter(Boolean); }
function keyWords(s: string) { return words(s).filter((w) => w.length > 1 && !STOP.has(w)); }
function intentOf(q: string, preferred?: string): SearchKind { if (["place", "news", "shopping", "general"].includes(String(preferred))) return preferred as SearchKind; const s = q.toLowerCase(); if (/\b(news|headline|breaking|today|latest|actualité|actualites|nouvelles|ข่าว)\b/.test(s)) return "news"; if (/\b(restaurant|restaurants|cafe|coffee|hotel|bar|museum|place|near|nearby|location|address|เที่ยว|ร้าน|โรงแรม|สถานที่)\b/.test(s)) return "place"; if (/\b(buy|price|shop|shopping|gift|deal|compare|cadeau|prix|acheter|ของขวัญ|ราคา|ซื้อ|สินค้า)\b/.test(s)) return "shopping"; if (/\b(flight|train|trip|travel|booking|voyage|vol|เที่ยวบิน|เดินทาง)\b/.test(s)) return "travel"; return "general"; }
function locationHint(q: string) { const m = q.match(/(?:\bin\b|\bnear\b|\bà\b|\ba\b|\bใน\b|\bที่\b)\s+([\p{L}][\p{L}\-' ]{1,40})/iu); if (!m) return ""; return m[1].split(/\b(?:for|under|with|today|now|open|ราคา|สำหรับ)\b/i)[0].trim().split(/[,.;]/)[0].trim(); }
function categoryTerms(q: string) { const s = q.toLowerCase(); if (/restaurant|restaurants|resto|ร้านอาหาร/.test(s)) return ["restaurant", "restaurants", "resto", "dining", "cuisine"]; if (/cafe|coffee|café|กาแฟ/.test(s)) return ["cafe", "coffee", "café"]; if (/hotel|โรงแรม/.test(s)) return ["hotel", "hôtel", "accommodation"]; if (/museum|พิพิธภัณฑ์/.test(s)) return ["museum", "musée"]; return []; }
function scoreResult(r: Result, q: string, intent: SearchKind, location: string) { const hay = words(`${r.title} ${r.snippet || ""} ${r.url}`).join(" "); const keys = keyWords(q); let matched = 0, score = 0; for (const k of keys) if (hay.includes(k)) { matched += 1; score += 3; } if (keys.length > 1 && matched === 0) return -100; if (location) { const lk = words(location).join(" "); if (lk && hay.includes(lk)) score += 10; else if (intent === "place") return -100; } const cats = categoryTerms(q); if (intent === "place" && cats.length && !cats.some((c) => hay.includes(words(c)[0] || c))) return -100; const host = (() => { try { return new URL(r.url).hostname; } catch { return ""; } })(); if (intent === "news" && /(reuters|apnews|bbc|france24|lemonde|theguardian|cnn|nytimes|techcrunch|theverge|arstechnica|wired|news\.google)/i.test(host)) score += 4; if (intent === "shopping" && /(amazon|etsy|fnac|darty|cdiscount|ikea|sephora|decathlon|zalando|ebay|idealo)/i.test(host)) score += 3; if (/microsoft\.com|support\.microsoft|answers\.microsoft/i.test(host) && !/microsoft|windows|office|xbox/i.test(q)) score -= 20; if (/wikipedia/i.test(host) && intent !== "general") score -= 8; return score; }
function rank(xs: Result[], q: string, intent: SearchKind, location: string) { return uniq(xs).map((x) => ({ x, s: scoreResult(x, q, intent, location) })).sort((a, b) => b.s - a.s).filter((v) => v.s >= 3).map((v) => v.x).slice(0, 10); }

async function bingRssSearch(q: string) { const out: Result[] = []; try { const r = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(q)}`, { cache: "no-store", headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/xml,text/xml,*/*", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" } }); if (!r.ok) return out; const xml = await r.text(); for (const item of (xml.match(/<item>[\s\S]*?<\/item>/gi) || []).slice(0, 15)) { const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ""); const url = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || ""); const snippet = decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || ""); if (title && /^https?:\/\//i.test(url)) out.push({ title, url, snippet: snippet.slice(0, 420), source: "Bing" }); } } catch {} return out; }
async function duckHtmlSearch(q: string) { const out: Result[] = []; try { const r = await fetch("https://html.duckduckgo.com/html/", { method: "POST", cache: "no-store", headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" }, body: new URLSearchParams({ q }).toString() }); if (!r.ok) return out; const html = await r.text(); const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*"[^>]*>[\s\S]*?(?=<div[^>]+class="[^"]*result[^"]*"|<div[^>]+class="nav-link|<\/body>)/gi) || []; for (const block of blocks.slice(0, 15)) { const a = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i); if (!a) continue; const url = unwrapDuckUrl(decodeHtml(a[1])); const title = decodeHtml(a[2]); const sn = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)/i); const snippet = decodeHtml(sn?.[1] || ""); if (title && /^https?:\/\//i.test(url)) out.push({ title, url, snippet: snippet.slice(0, 420), source: "DuckDuckGo" }); } } catch {} return out; }
async function googleNewsSearch(q: string, locale: string) { const out: Result[] = []; try { const conf = locale === "fr" ? { hl: "fr", gl: "FR", ceid: "FR:fr" } : locale === "th" ? { hl: "th", gl: "TH", ceid: "TH:th" } : { hl: "en", gl: "US", ceid: "US:en" }; const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${conf.hl}&gl=${conf.gl}&ceid=${encodeURIComponent(conf.ceid)}`; const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT } }); if (!r.ok) return out; const xml = await r.text(); for (const item of (xml.match(/<item>[\s\S]*?<\/item>/gi) || []).slice(0, 15)) { const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ""); const link = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || ""); const publishedAt = decodeHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || ""); const source = decodeHtml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "Google News"); if (title && /^https?:\/\//.test(link)) out.push({ title, url: link, source, publishedAt, snippet: publishedAt ? `Published ${publishedAt}` : "" }); } } catch {} return out; }
async function wikipediaSearch(q: string, locale: string) { const lang = locale === "th" ? "th" : locale === "fr" ? "fr" : "en"; const results: Result[] = []; let answer = ""; try { const wr = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&utf8=1&format=json&origin=*`, { cache: "no-store", headers: { "User-Agent": USER_AGENT } }); if (wr.ok) { const w = await wr.json(); const items = Array.isArray(w?.query?.search) ? w.query.search : []; for (const it of items) results.push({ title: String(it.title), url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(it.title).replace(/ /g, "_"))}`, snippet: decodeHtml(String(it.snippet || "")), source: "Wikipedia" }); const qKeys = keyWords(q); const first = items[0]; const titleKeys = first ? keyWords(String(first.title)) : []; if (first && titleKeys.some((k) => qKeys.includes(k))) { const sr = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(first.title))}`, { cache: "no-store", headers: { "User-Agent": USER_AGENT } }); if (sr.ok) answer = String((await sr.json())?.extract || "").slice(0, 800); } } } catch {} return { results, answer }; }
function placeQuery(q: string) { const loc = locationHint(q); const s = q.toLowerCase(); let what = ""; if (/restaurant|restaurants|ร้านอาหาร/.test(s)) what = "restaurant"; else if (/cafe|coffee|café|กาแฟ/.test(s)) what = "cafe"; else if (/hotel|โรงแรม/.test(s)) what = "hotel"; else if (/museum|พิพิธภัณฑ์/.test(s)) what = "museum"; return [what || q.replace(/\b(in|near|à|a)\b[\s\S]*/i, "").trim(), loc, loc && !/france/i.test(loc) ? "France" : ""].filter(Boolean).join(", "); }
function osmTagFor(q: string) {
  const s = q.toLowerCase();
  if (/restaurant|restaurants|ร้านอาหาร/.test(s)) return { key: "amenity", value: "restaurant" };
  if (/cafe|coffee|café|กาแฟ/.test(s)) return { key: "amenity", value: "cafe" };
  if (/bar|pub|บาร์/.test(s)) return { key: "amenity", value: "bar" };
  if (/hotel|โรงแรม/.test(s)) return { key: "tourism", value: "hotel" };
  if (/museum|พิพิธภัณฑ์/.test(s)) return { key: "tourism", value: "museum" };
  return null;
}
async function geocodeLocation(location: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${location}${/france/i.test(location) ? "" : ", France"}`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  const first = Array.isArray(rows) ? rows[0] : null;
  const lat = Number(first?.lat), lng = Number(first?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
async function overpassCategorySearch(q: string, originLat?: number, originLng?: number): Promise<Result[]> {
  const location = locationHint(q);
  const tag = osmTagFor(q);
  if (!location || !tag) return [];
  const center = await geocodeLocation(location);
  if (!center) return [];
  const query = `[out:json][timeout:15];(node["${tag.key}"="${tag.value}"](around:7000,${center.lat},${center.lng});way["${tag.key}"="${tag.value}"](around:7000,${center.lat},${center.lng});relation["${tag.key}"="${tag.value}"](around:7000,${center.lat},${center.lng}););out center tags 30;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => null);
  const rows = Array.isArray(data?.elements) ? data.elements : [];
  const out: Result[] = [];
  for (const row of rows) {
    const lat = Number(row?.lat ?? row?.center?.lat), lng = Number(row?.lon ?? row?.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const tags = row?.tags || {};
    const title = String(tags.name || tags.brand || `${tag.value[0].toUpperCase()}${tag.value.slice(1)}`);
    const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"], tags["addr:city"] || location].filter(Boolean).join(" ");
    let distanceKm: number | undefined;
    if (Number.isFinite(originLat) && Number.isFinite(originLng)) {
      const R = 6371, dLat = ((lat - Number(originLat)) * Math.PI) / 180, dLon = ((lng - Number(originLng)) * Math.PI) / 180, a1 = (Number(originLat) * Math.PI) / 180, a2 = (lat * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
      distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
    }
    out.push({ title, address: address || `${location}, France`, lat, lng, category: tag.value, distanceKm, source: "OpenStreetMap", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`, snippet: address || `${tag.value} in ${location}` });
  }
  return out.sort((a,b)=>(a.distanceKm ?? 999)-(b.distanceKm ?? 999)).slice(0,10);
}
async function osmPlaceSearch(q: string, lat?: number, lng?: number) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", placeQuery(q));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "fr,en,th");
  const r = await fetch(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  const rows = r.ok ? await r.json().catch(() => []) : [];
  const location = locationHint(q).toLowerCase();
  const cats = categoryTerms(q);
  const out: Result[] = [];
  if (Array.isArray(rows)) for (const row of rows) {
    const rlat = Number(row?.lat), rlng = Number(row?.lon);
    if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) continue;
    const address = String(row?.display_name || "");
    const title = String(row?.namedetails?.name || row?.name || address.split(",")[0] || "Place");
    const hay = `${title} ${address} ${row?.type || ""}`.toLowerCase();
    if (location && !hay.includes(location)) continue;
    if (cats.length && !cats.some((c) => hay.includes(c))) { const type = String(row?.type || "").toLowerCase(); if (!cats.some((c) => type.includes(c))) continue; }
    let distanceKm: number | undefined;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const R = 6371, dLat = ((rlat - Number(lat)) * Math.PI) / 180, dLon = ((rlng - Number(lng)) * Math.PI) / 180, a1 = (Number(lat) * Math.PI) / 180, a2 = (rlat * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
      distanceKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
    }
    out.push({ title, address, lat: rlat, lng: rlng, category: String(row?.type || row?.category || "place"), distanceKm, source: "OpenStreetMap", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rlat},${rlng}`)}`, snippet: address });
  }
  if (out.length >= 3 || !osmTagFor(q)) return out.slice(0,10);
  const fallback = await overpassCategorySearch(q, lat, lng).catch(() => []);
  return uniq([...out, ...fallback]).slice(0,10);
}
function fallbackLinks(q: string, intent: SearchKind, locale: string) { const lang = locale === "fr" ? "fr" : locale === "th" ? "th" : "en"; const out: Result[] = [{ title: locale === "th" ? "ค้นหาคำนี้บน Google" : "Search this query on Google", url: `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=${lang}`, source: "Google" }, { title: locale === "th" ? "ค้นหาคำนี้บน Bing" : "Search this query on Bing", url: `https://www.bing.com/search?q=${encodeURIComponent(q)}`, source: "Bing" }]; if (intent === "place") out.unshift({ title: locale === "th" ? "เปิดการค้นหานี้ใน Google Maps" : "Open this search in Google Maps", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, source: "Google Maps" }); return out; }
async function freePublicSearch(q: string, locale: string, preferredKind?: string, lat?: number, lng?: number) { const intent = intentOf(q, preferredKind); const location = locationHint(q); if (intent === "place") { const results = await osmPlaceSearch(q, lat, lng); const answer = results.length ? (locale === "th" ? `พบสถานที่ ${results.length} แห่งที่ตรงกับ “${q}” จากข้อมูลแผนที่สาธารณะ` : locale === "fr" ? `${results.length} lieux trouvés pour « ${q} » à partir de données cartographiques publiques.` : `Found ${results.length} place result(s) for “${q}” from public map data.`) : (locale === "th" ? "ไม่พบสถานที่ที่ตรงพอ จึงไม่แสดงผลลัพธ์ที่อาจอยู่ผิดเมือง" : "No sufficiently matching place results were found, so Future is not showing potentially wrong locations."); return { answer, results: results.length ? results : fallbackLinks(q, intent, locale), sources: results.length ? [{ name: "OpenStreetMap" }] : [], kind: intent, freeMode: true }; } if (intent === "news") { const results = rank(await googleNewsSearch(q, locale), q, intent, location); const answer = results.length ? (locale === "th" ? `พบข่าวล่าสุด ${results.length} รายการสำหรับ “${q}”` : `Found ${results.length} current news result(s) for “${q}”.`) : (locale === "th" ? "ยังดึงข่าวที่ตรงคำค้นไม่ได้ จึงแสดงลิงก์ค้นหาสำรองแทน" : "No sufficiently relevant current news results were returned; direct search fallbacks are shown instead."); return { answer, results: results.length ? results : fallbackLinks(q, intent, locale), sources: [...new Set(results.map((x) => x.source || "News"))].slice(0, 6).map((name) => ({ name })), kind: intent, freeMode: true }; } const variants = intent === "shopping" ? [`${q} France EUR`, q] : intent === "travel" ? [`${q} France travel`, q] : [q]; const batches = await Promise.all(variants.flatMap((v) => [bingRssSearch(v), duckHtmlSearch(v)])); let combined = batches.flat(); let wiki = { results: [] as Result[], answer: "" }; if (intent === "general") wiki = await wikipediaSearch(q, locale); combined = [...combined, ...wiki.results]; let results = rank(combined, q, intent, location); const sources = [...new Set(results.map((x) => { try { return new URL(x.url).hostname.replace(/^www\./, ""); } catch { return x.source || "Web"; } }))].slice(0, 6).map((name) => ({ name })); let answer = intent === "general" && wiki.answer ? wiki.answer : results.length ? (locale === "th" ? `พบ ${results.length} ผลลัพธ์ที่ผ่านการกรองความเกี่ยวข้องสำหรับ “${q}”` : locale === "fr" ? `${results.length} résultats pertinents vérifiés pour « ${q} ».` : `Found ${results.length} relevance-filtered result(s) for “${q}”.`) : ""; if (!results.length) { results = fallbackLinks(q, intent, locale); answer = locale === "th" ? "แหล่งค้นหาฟรียังไม่ส่งผลลัพธ์ที่เกี่ยวข้องพอ Future จึงไม่แสดงข้อมูลที่อาจผิด และให้ลิงก์ค้นหาตรงแทน" : "The free providers did not return sufficiently relevant results, so Future is showing direct search links instead of potentially wrong information."; } return { answer, results, sources, kind: intent, freeMode: true }; }

export async function POST(req: NextRequest) { const body = await req.json().catch(() => null); const q = typeof body?.q === "string" ? body.q.trim() : ""; const locale = ["th", "fr", "en"].includes(body?.locale) ? body.locale : "en"; const preferredKind = typeof body?.kind === "string" ? body.kind : undefined; const lat = Number(body?.lat), lng = Number(body?.lng); if (!q) return NextResponse.json({ answer: "", sources: [], results: [] }); const apiKey = process.env.OPENAI_API_KEY; const supabase = await createServerSupabase(); let userId: string | undefined; let plan = "free"; let usage: any = null; if (supabase) { const { data: { user } } = await supabase.auth.getUser(); userId = user?.id; } if (userId) { usage = await getUsageAccess(userId); plan = usage.plan || "free"; } const useAi = Boolean(apiKey && userId && plan !== "free" && usage && usage.webSearches < usage.limits.webSearches); if (useAi) { try { const model = process.env.OPENAI_MODEL || "gpt-5.6-luna"; const base: any = { model, instructions: `You are Future Search. Search the public web and answer directly inside the app. Return JSON only: {"answer":"clear useful answer in ${locale}","sources":[{"name":"publisher/domain","title":"source title"}],"kind":"general|place|news|shopping|travel"}. Respect the user's exact place, budget and freshness intent. Never silently substitute a different city or topic.`, input: q, max_output_tokens: 1800 }; let r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ ...base, tools: [{ type: "web_search" }] }) }); if (!r.ok) r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify(base) }); if (r.ok) { const data = await r.json(); const parsed = safeJson(extractText(data)); const wc = Math.max(1, webCalls(data)); const input = Number(data?.usage?.input_tokens || 0), output = Number(data?.usage?.output_tokens || 0); if (userId) { await recordUsage({ userId, kind: "ai_message", model, inputTokens: input, outputTokens: output, estimatedCostUsd: estimateOpenAICost(input, output, 0), metadata: { surface: "search" } }); await recordUsage({ userId, kind: "web_search", model, estimatedCostUsd: estimateOpenAICost(0, 0, wc), metadata: { surface: "search", count: wc } }); } return NextResponse.json({ answer: String(parsed?.answer || ""), sources: Array.isArray(parsed?.sources) ? parsed.sources.slice(0, 6) : [], results: [], kind: parsed?.kind || intentOf(q, preferredKind), freeMode: false }); } } catch {} } return NextResponse.json(await freePublicSearch(q, locale, preferredKind, Number.isFinite(lat) ? lat : undefined, Number.isFinite(lng) ? lng : undefined)); }
