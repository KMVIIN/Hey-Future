export type FutureIntent =
  | { kind: "accounting"; type: "income" | "expense"; amount: number; description: string; category: string }
  | { kind: "map"; query: string; travelMode: "walking" | "driving" }
  | { kind: "ride"; provider: "uber" | "bolt" | "any"; destination: string }
  | { kind: "chat" };

function extractAmount(text: string) {
  const match = text.match(/(?:€|eur|euro|euros)?\s*(\d+(?:[.,]\d{1,2})?)|(?:\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euro|euros)/i);
  if (!match) return 0;
  const raw = match[1] || match[0].match(/\d+(?:[.,]\d{1,2})?/)?.[0] || "0";
  return Number(raw.replace(",", "."));
}

export function routeFutureIntent(text: string): FutureIntent {
  const q = text.trim();
  const amount = extractAmount(q);
  const expense = /(ซื้อ|จ่าย|จ่ายเงิน|เสียเงิน|หมดไป|spent|bought|buy|paid|expense|dépens|acheté|payé)/i.test(q);
  const income = /(ได้รับเงิน|ได้เงิน|รายได้|เงินเข้า|รับเงิน|income|received|earned|reçu|recette|gagné)/i.test(q);

  if (amount > 0 && (expense || income)) {
    return {
      kind: "accounting",
      type: income && !expense ? "income" : "expense",
      amount,
      description: q,
      category: expense ? "General" : "Income",
    };
  }

  if (/(uber|bolt|เรียกรถ|จองรถ|taxi|ride)/i.test(q)) {
    const provider = /uber/i.test(q) ? "uber" : /bolt/i.test(q) ? "bolt" : "any";
    return { kind: "ride", provider, destination: q };
  }

  if (/(เดินไป|ไกลแค่ไหน|ระยะทาง|ที่อยู่ตอนนี้|จากที่นี่|map|maps|distance|walk|walking|itinéraire|à pied)/i.test(q)) {
    return { kind: "map", query: q, travelMode: /(เดิน|walk|pied)/i.test(q) ? "walking" : "driving" };
  }

  return { kind: "chat" };
}
