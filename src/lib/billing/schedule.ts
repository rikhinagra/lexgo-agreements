import {
  addDays,
  addMonths,
  compareCalDate,
  compareYearMonth,
  firstOfMonth,
  lastOfMonth,
  yearMonthKey,
} from "./dates";
import type { BillingMode, CalDate, InvoiceKind, YearMonth } from "./types";

export interface DueInvoice {
  month: YearMonth;
  kind: InvoiceKind;
  /** The day the invoice is issued and emailed. */
  issueDate: CalDate;
}

export interface ScheduleInput {
  /** Today's calendar day in the business timezone. */
  asOf: CalDate;
  startDate: CalDate;
  endDate?: CalDate | null;
  billingMode: BillingMode;
  /** Service months that already have an invoice, as "YYYY-MM". */
  alreadyInvoiced: ReadonlySet<string>;
}

/**
 * Which invoices should exist as of a given day, and do not yet?
 *
 * ADVANCE: the invoice for a month is issued on the first day of that month.
 *   For the start month it is issued on the start date, which is the signing day.
 * ARREARS: the invoice for a month is issued on the first day of the next month.
 *
 * Months that already have an invoice are skipped, so running the monthly job
 * twice never creates a duplicate. If the job was missed, every missed month
 * is returned (catch up).
 */
export function dueInvoices(input: ScheduleInput): DueInvoice[] {
  const { asOf, startDate, endDate, billingMode, alreadyInvoiced } = input;

  const startMonth: YearMonth = { year: startDate.year, month: startDate.month };
  const endMonth: YearMonth | null = endDate
    ? { year: endDate.year, month: endDate.month }
    : null;

  const result: DueInvoice[] = [];
  let cursor = startMonth;
  // Safety stop: never look more than 600 months ahead.
  for (let i = 0; i < 600; i++) {
    if (endMonth && compareYearMonth(cursor, endMonth) > 0) break;

    const isStart = compareYearMonth(cursor, startMonth) === 0;
    const isEnd = endMonth !== null && compareYearMonth(cursor, endMonth) === 0;
    const endsEarly =
      isEnd && endDate !== null && compareCalDate(endDate!, lastOfMonth(cursor)) < 0;

    let issueDate: CalDate;
    if (billingMode === "ADVANCE") {
      issueDate = isStart ? startDate : firstOfMonth(cursor);
    } else {
      issueDate = firstOfMonth(addMonths(cursor, 1));
    }

    // Issue dates only move forward, so once one is in the future we can stop.
    if (compareCalDate(issueDate, asOf) > 0) break;

    if (!alreadyInvoiced.has(yearMonthKey(cursor))) {
      const kind: InvoiceKind = isStart ? "INITIAL" : endsEarly ? "FINAL" : "MONTHLY";
      result.push({ month: cursor, kind, issueDate });
    }
    cursor = addMonths(cursor, 1);
  }
  return result;
}

/** Payment due date for an invoice. Zero days means due on the issue date. */
export function dueDateFor(issueDate: CalDate, paymentDueDays: number): CalDate {
  if (!Number.isInteger(paymentDueDays) || paymentDueDays < 0) {
    throw new Error("Payment due days must be a whole number of 0 or more");
  }
  return addDays(issueDate, paymentDueDays);
}
