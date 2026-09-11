import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const rawLang = req.nextUrl.searchParams.get("lang") || "en";
  const lang = ["fr","th","en"].includes(rawLang) ? rawLang : "en";
  if (!q) return NextResponse.json({ error: "missing query" }, { status: 400 });
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=1&namespace=0&format=json&origin=*`;
    const search = await fetch(searchUrl, { headers: { "User-Agent": "Future-MVP/0.2.1" }, cache: "no-store" });
    const s = await search.json();
    const title = s?.[1]?.[0];
    if (!title) return NextResponse.json({ summary: null });
    const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers: { "User-Agent": "Future-MVP/0.2.1" }, cache: "no-store" });
    if (!summaryRes.ok) return NextResponse.json({ summary: null });
    const data = await summaryRes.json();
    const summary = String(data?.extract || "").slice(0, 650);
    return NextResponse.json({ summary, title: data?.title || title, url: data?.content_urls?.desktop?.page || s?.[3]?.[0] || null });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
