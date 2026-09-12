import { NextRequest, NextResponse } from "next/server";

const allowedKinds = ["research","open_url","contact_lookup","calendar_read","calendar_write","email_read","email_draft","email_send","booking","payment","note"];

function extractText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) if (part?.type === "output_text" && typeof part?.text === "string") return part.text;
  }
  return "";
}

function safeJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const locale = ["en","fr","th"].includes(body?.locale) ? body.locale : "en";
  if (!text) return NextResponse.json({ enabled: false, mode: "fallback" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ enabled: false, mode: "fallback", reason: "OPENAI_API_KEY not configured" });

  const instructions = `You are Future, an executive AI secretary planner. Interpret natural language in Thai, English and French. Convert the user's request into a concise multi-step workflow only when it genuinely benefits from multiple steps. Never claim an external action happened. Payment, purchase, booking, cancellation, and email sending MUST require explicit user approval. If the user only asks to check/read/show/summarize email, use email_read only and NEVER add email_send. Only create email_send when the user explicitly asks to send. Return JSON only with this shape: {"reply":"short helpful reply in the user's language","workflow":{"title":"...","summary":"...","steps":[{"kind":"research|open_url|contact_lookup|calendar_read|calendar_write|email_read|email_draft|email_send|booking|payment|note","title":"...","detail":"...","url":"optional https URL","requiresApproval":true|false,"payload":{"to":"optional recipient email","subject":"optional subject","body":"optional message"}}]}}. For research steps, use a safe relevant Google/Google Travel/YouTube URL when useful. If the request is simple and should be handled by the local assistant instead, return {"reply":"","workflow":null}. Locale: ${locale}.`;

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions,
        input: text,
        max_output_tokens: 1200,
      }),
    });
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return NextResponse.json({ enabled: true, mode: "fallback", error: errorText.slice(0, 300) });
    }
    const data = await apiResponse.json();
    const parsed = safeJson(extractText(data));
    if (!parsed?.workflow?.steps?.length) return NextResponse.json({ enabled: true, mode: "fallback", reply: parsed?.reply || "" });
    parsed.workflow.steps = parsed.workflow.steps
      .filter((step: any) => allowedKinds.includes(step?.kind))
      .map((step: any) => ({
        kind: step.kind,
        title: String(step.title || "Prepare action").slice(0, 160),
        detail: String(step.detail || "").slice(0, 500),
        url: typeof step.url === "string" && /^https?:\/\//.test(step.url) ? step.url : undefined,
        requiresApproval: Boolean(step.requiresApproval || ["booking","payment","email_send"].includes(step.kind)),
        payload: step?.payload && typeof step.payload === "object" ? {
          to: typeof step.payload.to === "string" ? step.payload.to.slice(0, 320) : undefined,
          subject: typeof step.payload.subject === "string" ? step.payload.subject.slice(0, 300) : undefined,
          body: typeof step.payload.body === "string" ? step.payload.body.slice(0, 5000) : undefined,
        } : undefined,
      }));
    return NextResponse.json({ enabled: true, mode: "ai", reply: parsed.reply || "", workflow: parsed.workflow });
  } catch (error) {
    return NextResponse.json({ enabled: true, mode: "fallback", error: error instanceof Error ? error.message : "AI planner failed" });
  }
}
