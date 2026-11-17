import { DateTime } from "luxon";
import { BUSINESS_TIMEZONE } from "./constants";
import type { CalDate, YearMonth } from "./types";

/** Convert an exact instant into the calendar day in the business timezone. */
export function toBusinessDate(
  instant: Date,
  timezone: string = BUSINESS_TIMEZONE,
): CalDate {
  const dt = DateTime.fromJSDate(instant, { zone: timezone });
  if (!dt.isValid) {
    throw new Error(`Invalid instant or timezone: ${timezone}`);
  }
  return { year: dt.year, month: dt.month, day: dt.day };
}

export function isValidCalDate(d: CalDate): boolean {
  return DateTime.utc(d.year, d.month, d.day).isValid;
}

function assertValid(d: CalDate): void {
  if (!Number.isInteger(d.year) || !Number.isInteger(d.month) || !Number.isInteger(d.day) || !isValidCalDate(d)) {
    throw new Error(`Invalid calendar date: ${JSON.stringify(d)}`);
  }
}

export function daysInMonth(year: number, month: number): number {
  const n = DateTime.utc(year, month, 1).daysInMonth;
  if (!n) throw new Error(`Invalid month: ${year}-${month}`);
  return n;
}

/** Negative if a is before b, zero if equal, positive if a is after b. */
export function compareCalDate(a: CalDate, b: CalDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function addDays(d: CalDate, n: number): CalDate {
  assertValid(d);
  const dt = DateTime.utc(d.year, d.month, d.day).plus({ days: n });
  return { year: dt.year, month: dt.month, day: dt.day };
}

export function firstOfMonth(ym: YearMonth): CalDate {
  return { year: ym.year, month: ym.month, day: 1 };
}

export function lastOfMonth(ym: YearMonth): CalDate {
  return { year: ym.year, month: ym.month, day: daysInMonth(ym.year, ym.month) };
}

/** "2026-11-03" */
export function calDateToIso(d: CalDate): string {
  assertValid(d);
  return `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function isoToCalDate(iso: string): CalDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  assertValid(d);
  return d;
}

/** "2026-11" */
export function yearMonthKey(ym: YearMonth): string {
  return `${String(ym.year).padStart(4, "0")}-${String(ym.month).padStart(2, "0")}`;
}

/** A JS Date at UTC midnight, suitable for a Postgres DATE column. */
export function calDateToDbDate(d: CalDate): Date {
  assertValid(d);
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

/** Read a Postgres DATE value (UTC midnight) back into a calendar day. */
export function dbDateToCalDate(date: Date): CalDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** "November 3, 2026" for invoices and emails. */
export function formatLongDate(d: CalDate): string {
  assertValid(d);
  return DateTime.utc(d.year, d.month, d.day).setLocale("en-US").toFormat("LLLL d, yyyy");
}

/** "November" */
export function monthName(month: number): string {
  return DateTime.utc(2000, month, 1).setLocale("en-US").toFormat("LLLL");
}
