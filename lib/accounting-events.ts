export const FUTURE_ACCOUNTING_EVENT = "future:accounting-entry";

export type FutureAccountingEntryInput = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category?: string;
  date?: string;
};

export function addAccountingEntry(input: FutureAccountingEntryInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FUTURE_ACCOUNTING_EVENT, { detail: input }));
}
