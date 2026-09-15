import { NextRequest, NextResponse } from "next/server";

type Point = { lat: number; lng: number };
type PlaceResult = {
  title: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
  source: string;
  url: string;
  distanceKm?: number;
};

const USER_AGENT = process.env.PUBLIC_SEARCH_USER_AGENT || "Future-AI-Secretary/5.2 (public place search)";

function finiteNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function nominatimSearch(query: string, origin?: Point): Promise<PlaceResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "fr,en,th");
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) return [];
  const rows = await response.json().catch(() => []);
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row: any) => {
    const lat = finiteNumber(row?.lat);
    const lng = finiteNumber(row?.lon);
    if (lat === null || lng === null) return [];
    const title = String(row?.namedetails?.name || row?.name || row?.display_name?.split(",")?.[0] || "Place").trim();
    const address = String(row?.display_name || "").trim();
    const result: PlaceResult = {
      title,
      address,
      lat,
      lng,
      category: String(row?.type || row?.category || "place"),
      source: "OpenStreetMap",
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`,
    };
    if (origin) result.distanceKm = Number(haversineKm(origin, { lat, lng }).toFixed(1));
    return [result];
  });
}

function instruction(step: any) {
  const type = String(step?.maneuver?.type || "continue").replace(/_/g, " ");
  const modifier = String(step?.maneuver?.modifier || "").replace(/_/g, " ");
  const road = String(step?.name || "").trim();
  return [type, modifier, road ? `onto ${road}` : ""].filter(Boolean).join(" ").replace(/^./, (c) => c.toUpperCase());
}

async function osrmRoute(origin: Point, destination: Point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&steps=true&alternatives=false`;
  const response = await fetch(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const route = data?.routes?.[0];
  if (!route) return null;
  const steps = Array.isArray(route?.legs?.[0]?.steps)
    ? route.legs[0].steps.slice(0, 12).map((s: any) => ({ instruction: instruction(s), distanceM: Math.round(Number(s?.distance || 0)) }))
    : [];
  return {
    distanceKm: Number((Number(route.distance || 0) / 1000).toFixed(1)),
    durationMin: Math.max(1, Math.round(Number(route.duration || 0) / 60)),
    steps,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "search");

  if (action === "route") {
    const origin = { lat: finiteNumber(body?.origin?.lat), lng: finiteNumber(body?.origin?.lng) };
    const destination = { lat: finiteNumber(body?.destination?.lat), lng: finiteNumber(body?.destination?.lng) };
    if (origin.lat === null || origin.lng === null || destination.lat === null || destination.lng === null) {
      return NextResponse.json({ error: "Valid origin and destination coordinates are required." }, { status: 400 });
    }
    const route = await osrmRoute(origin as Point, destination as Point);
    if (!route) return NextResponse.json({ error: "Route is temporarily unavailable." }, { status: 502 });
    return NextResponse.json(route);
  }

  const q = String(body?.q || "").trim();
  if (!q) return NextResponse.json({ results: [] });
  const lat = finiteNumber(body?.lat);
  const lng = finiteNumber(body?.lng);
  const origin = lat !== null && lng !== null ? { lat, lng } : undefined;
  try {
    return NextResponse.json({ results: await nominatimSearch(q, origin) });
  } catch {
    return NextResponse.json({ results: [], error: "Place search is temporarily unavailable." }, { status: 502 });
  }
}

