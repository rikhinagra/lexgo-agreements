import type { YearMonth } from "./types";

/** Build an invoice number such as INV-2026-11-001. Numbered by service month. */
export function formatInvoiceNumber(ym: YearMonth, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Invoice sequence must be a whole number of 1 or more");
  }
  const y = String(ym.year).padStart(4, "0");
  const m = String(ym.month).padStart(2, "0");
  return `INV-${y}-${m}-${String(sequence).padStart(3, "0")}`;
}
