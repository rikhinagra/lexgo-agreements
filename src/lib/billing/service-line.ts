import {
  compareCalDate,
  daysInMonth,
  firstOfMonth,
  lastOfMonth,
} from "./dates";
import { roundHalfUpDiv } from "./money";
import type { CalDate, YearMonth } from "./types";

export interface ServiceLineInput {
  agents: number;
  rateCents: number;
  /** The calendar month being billed. */
  month: YearMonth;
  /** First day of service. Days before it are not billed. */
  startDate: CalDate;
  /** Last day of service, if the contract ends. Days after it are not billed. */
  endDate?: CalDate | null;
}

export interface ServiceLine {
  periodStart: CalDate;
  periodEnd: CalDate;
  daysBilled: number;
  daysInMonth: number;
  /** True when the whole calendar month is billed. */
  isFullMonth: boolean;
  amountCents: number;
}

/**
 * Work out what to bill for one calendar month.
 *
 * The amount is agents x rate x daysBilled / daysInMonth, calculated once on the
 * total (never per agent) and rounded half up to the nearest cent.
 * The first day of service counts as a billed day. Example: starting on
 * November 3 bills 28 of 30 days.
 */
export function computeServiceLine(input: ServiceLineInput): ServiceLine {
  const { agents, rateCents, month, startDate, endDate } = input;

  if (!Number.isInteger(agents) || agents < 0) {
    throw new Error("Agents must be a whole number of 0 or more");
  }
  if (!Number.isInteger(rateCents) || rateCents < 0) {
    throw new Error("Rate must be a whole number of cents, 0 or more");
  }

  const monthFirst = firstOfMonth(month);
  const monthLast = lastOfMonth(month);
  const dim = daysInMonth(month.year, month.month);

  const from = compareCalDate(startDate, monthFirst) > 0 ? startDate : monthFirst;
  const to = endDate && compareCalDate(endDate, monthLast) < 0 ? endDate : monthLast;

  // Service does not overlap this month at all.
  if (compareCalDate(from, to) > 0 || compareCalDate(from, monthLast) > 0) {
    return {
      periodStart: from,
      periodEnd: to,
      daysBilled: 0,
      daysInMonth: dim,
      isFullMonth: false,
      amountCents: 0,
    };
  }

  const daysBilled = to.day - from.day + 1;
  const isFullMonth = daysBilled === dim;
  const amountCents = isFullMonth
    ? agents * rateCents
    : roundHalfUpDiv(agents * rateCents * daysBilled, dim);

  return { periodStart: from, periodEnd: to, daysBilled, daysInMonth: dim, isFullMonth, amountCents };
}
