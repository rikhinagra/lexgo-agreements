/** A calendar day with no time and no timezone. Month is 1 to 12. */
export interface CalDate {
  year: number;
  month: number;
  day: number;
}

/** A calendar month. Month is 1 to 12. */
export interface YearMonth {
  year: number;
  month: number;
}

export type BillingMode = "ADVANCE" | "ARREARS";
export type InvoiceKind = "INITIAL" | "MONTHLY" | "FINAL";
