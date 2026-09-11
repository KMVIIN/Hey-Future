import type { Locale } from "./i18n";

export type AssistantAnswer = { text: string; sourceUrl?: string };

function normalizeMathWords(text: string) {
  return text
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\bplus\b|บวก/g, "+")
    .replace(/\bmoins\b|ลบ/g, "-")
    .replace(/\b(?:fois|multiplié par|multiplie par)\b|คูณ/g, "*")
    .replace(/\b(?:divisé par|divise par|over)\b|หาร/g, "/")
    .replace(/[×x]/g, "*")
    .replace(/÷/g, "/");
}

function extractExpression(text: string) {
  const normalized = normalizeMathWords(text);
  const matches = normalized.match(/[\d.()+\-*/\s]+/g) || [];
  return matches.map(x => x.trim()).filter(x => /\d/.test(x) && /[+\-*/]/.test(x)).sort((a,b)=>b.length-a.length)[0] || null;
}

function tokenize(expr: string) {
  const cleaned = expr.replace(/\s+/g, "");
  const tokens = cleaned.match(/\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== cleaned) return null;
  return tokens;
}

function evaluateSafe(expr: string): number | null {
  const tokens = tokenize(expr);
  if (!tokens) return null;
  let i = 0;
  const parseExpression = (): number => {
    let value = parseTerm();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++]; const rhs = parseTerm(); value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++]; const rhs = parseFactor(); value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  };
  const parseFactor = (): number => {
    if (tokens[i] === "+") { i++; return parseFactor(); }
    if (tokens[i] === "-") { i++; return -parseFactor(); }
    if (tokens[i] === "(") { i++; const v = parseExpression(); if (tokens[i] !== ")") throw new Error("paren"); i++; return v; }
    const value = Number(tokens[i++]); if (!Number.isFinite(value)) throw new Error("number"); return value;
  };
  try { const result = parseExpression(); if (i !== tokens.length || !Number.isFinite(result)) return null; return result; } catch { return null; }
}

export function isQuestionCommand(text: string) {
  if (extractExpression(text)) return true;
  return /\?|^(?:what|who|where|when|why|how|tell me about|explain|combien|qui|où|ou |quand|pourquoi|comment|c['’]est quoi|qu['’]est-ce que|parle-moi de|อธิบาย|อะไร|ใคร|ที่ไหน|เมื่อไหร่|ทำไม|อย่างไร|เท่าไหร่|คืออะไร)/i.test(text.trim()) || /(?:คืออะไร|เท่าไหร่|เป็นใคร|อยู่ที่ไหน)\s*$/i.test(text.trim());
}

function cleanKnowledgeQuery(text: string) {
  return text
    .replace(/[?？]+$/g, "")
    .replace(/^(?:what is|what are|who is|who are|tell me about|explain|where is|combien font)\s+/i, "")
    .replace(/^(?:qui est|qu['’]est-ce que|c['’]est quoi|parle-moi de|où est|ou est)\s+/i, "")
    .replace(/^(?:อธิบาย|ใครคือ|อะไรคือ|คืออะไร|ที่ไหนคือ)\s*/i, "")
    .replace(/(?:คืออะไร|เป็นใคร|อยู่ที่ไหน)\s*$/i, "")
    .trim();
}

export async function answerQuestion(text: string, locale: Locale): Promise<AssistantAnswer | null> {
  const expr = extractExpression(text);
  if (expr) {
    const result = evaluateSafe(expr);
    if (result !== null) {
      const pretty = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(8)));
      const answer = locale === "fr" ? `${expr} = ${pretty}.` : locale === "th" ? `${expr} = ${pretty}` : `${expr} = ${pretty}.`;
      return { text: answer };
    }
  }

  const q = cleanKnowledgeQuery(text);
  if (!q || q.length < 2) return null;
  try {
    const res = await fetch(`/api/knowledge?q=${encodeURIComponent(q)}&lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.summary) return { text: data.summary, sourceUrl: data.url };
  } catch {}
  return null;
}
