import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  computeServiceLine,
  daysInMonth,
  dollarsToCents,
  dueDateFor,
  dueInvoices,
  formatCents,
  formatInvoiceNumber,
  formatLongDate,
  roundHalfUpDiv,
  toBusinessDate,
  yearMonthKey,
} from "./index";

const RATE = 180_000; // $1,800.00

describe("toBusinessDate (Pacific time)", () => {
  it("uses the Pacific day, not the UTC day", () => {
    // 05:00 UTC on Nov 4 is 21:00 on Nov 3 in California (UTC-8 in November).
    expect(toBusinessDate(new Date("2026-11-04T05:00:00Z"))).toEqual({ year: 2026, month: 11, day: 3 });
  });
  it("rolls to the next day once Pacific midnight passes", () => {
    expect(toBusinessDate(new Date("2026-11-04T08:00:00Z"))).toEqual({ year: 2026, month: 11, day: 4 });
  });
  it("treats an India evening signing as the earlier Pacific day", () => {
    // 11:00 PM India time on Nov 3 is 09:30 UTC, which is 01:30 Nov 3 in California.
    expect(toBusinessDate(new Date("2026-11-03T17:30:00Z"))).toEqual({ year: 2026, month: 11, day: 3 });
  });
  it("handles daylight saving (PDT is UTC-7 in summer)", () => {
    expect(toBusinessDate(new Date("2026-07-01T06:59:00Z"))).toEqual({ year: 2026, month: 6, day: 30 });
    expect(toBusinessDate(new Date("2026-07-01T07:00:00Z"))).toEqual({ year: 2026, month: 7, day: 1 });
  });
  it("handles the new year boundary", () => {
    expect(toBusinessDate(new Date("2027-01-01T07:59:00Z"))).toEqual({ year: 2026, month: 12, day: 31 });
  });
});

describe("calendar helpers", () => {
  it("knows month lengths including leap years", () => {
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
  it("adds months across year ends", () => {
    expect(addMonths({ year: 2026, month: 11 }, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("adds days across month ends", () => {
    expect(addDays({ year: 2026, month: 11, day: 30 }, 7)).toEqual({ year: 2026, month: 12, day: 7 });
  });
  it("formats dates and keys", () => {
    expect(formatLongDate({ year: 2026, month: 11, day: 3 })).toBe("November 3, 2026");
    expect(yearMonthKey({ year: 2026, month: 3 })).toBe("2026-03");
  });
});

describe("money", () => {
  it("rounds half up", () => {
    expect(roundHalfUpDiv(335, 10)).toBe(34);
    expect(roundHalfUpDiv(334, 10)).toBe(33);
    expect(roundHalfUpDiv(1005, 30)).toBe(34); // 33.5 rounds up
  });
  it("formats cents", () => {
    expect(formatCents(336_000)).toBe("$3,360.00");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(180_000)).toBe("$1,800.00");
  });
  it("parses typed dollars", () => {
    expect(dollarsToCents("1800")).toBe(180_000);
    expect(dollarsToCents("$1,800.50")).toBe(180_050);
    expect(dollarsToCents("1600.5")).toBe(160_050);
    expect(() => dollarsToCents("abc")).toThrow();
    expect(() => dollarsToCents("12.345")).toThrow();
  });
});

describe("computeServiceLine (pro rating)", () => {
  const nov = { year: 2026, month: 11 };

  it("signing on Nov 3 bills 28 of 30 days (the client's example)", () => {
    const line = computeServiceLine({ agents: 2, rateCents: RATE, month: nov, startDate: { year: 2026, month: 11, day: 3 } });
    expect(line.daysBilled).toBe(28);
    expect(line.daysInMonth).toBe(30);
    expect(line.isFullMonth).toBe(false);
    expect(line.amountCents).toBe(336_000); // 2 x 1800 x 28/30 = 3360.00
    expect(line.periodStart).toEqual({ year: 2026, month: 11, day: 3 });
    expect(line.periodEnd).toEqual({ year: 2026, month: 11, day: 30 });
  });
  it("signing on the 1st is a full month", () => {
    const line = computeServiceLine({ agents: 2, rateCents: RATE, month: nov, startDate: { year: 2026, month: 11, day: 1 } });
    expect(line.isFullMonth).toBe(true);
    expect(line.amountCents).toBe(360_000);
  });
  it("signing on the last day bills exactly one day", () => {
    const line = computeServiceLine({ agents: 1, rateCents: RATE, month: nov, startDate: { year: 2026, month: 11, day: 30 } });
    expect(line.daysBilled).toBe(1);
    expect(line.amountCents).toBe(6_000); // 1800 / 30
  });
  it("rounds once on the total, half up", () => {
    // 1 agent x $1,800 x 1/31 = 58.0645... so 5806 cents
    const line = computeServiceLine({ agents: 1, rateCents: RATE, month: { year: 2026, month: 12 }, startDate: { year: 2026, month: 12, day: 31 } });
    expect(line.amountCents).toBe(5_806);
    // 1005 cents x 1/30 = 33.5 cents, rounds up to 34
    const half = computeServiceLine({ agents: 1, rateCents: 1_005, month: nov, startDate: { year: 2026, month: 11, day: 30 } });
    expect(half.amountCents).toBe(34);
  });
  it("uses the real length of February, including leap years", () => {
    const feb28 = computeServiceLine({ agents: 1, rateCents: RATE, month: { year: 2026, month: 2 }, startDate: { year: 2026, month: 2, day: 15 } });
    expect(feb28.daysBilled).toBe(14);
    expect(feb28.daysInMonth).toBe(28);
    const feb29 = computeServiceLine({ agents: 1, rateCents: RATE, month: { year: 2028, month: 2 }, startDate: { year: 2028, month: 2, day: 15 } });
    expect(feb29.daysBilled).toBe(15);
    expect(feb29.daysInMonth).toBe(29);
  });
  it("bills a full month when service began in an earlier month", () => {
    const line = computeServiceLine({ agents: 2, rateCents: 160_000, month: { year: 2026, month: 12 }, startDate: { year: 2026, month: 11, day: 3 } });
    expect(line.isFullMonth).toBe(true);
    expect(line.amountCents).toBe(320_000);
  });
  it("pro rates the final month when the contract ends mid month", () => {
    const line = computeServiceLine({
      agents: 2, rateCents: RATE, month: { year: 2026, month: 12 },
      startDate: { year: 2026, month: 11, day: 3 }, endDate: { year: 2026, month: 12, day: 15 },
    });
    expect(line.daysBilled).toBe(15);
    expect(line.amountCents).toBe(174_194); // 2 x 1800 x 15 / 31 = 1741.935 dollars, rounded to 1741.94
  });
  it("bills nothing for months outside the service period", () => {
    const before = computeServiceLine({ agents: 2, rateCents: RATE, month: { year: 2026, month: 10 }, startDate: { year: 2026, month: 11, day: 3 } });
    expect(before.daysBilled).toBe(0);
    expect(before.amountCents).toBe(0);
    const after = computeServiceLine({
      agents: 2, rateCents: RATE, month: { year: 2027, month: 1 },
      startDate: { year: 2026, month: 11, day: 3 }, endDate: { year: 2026, month: 12, day: 15 },
    });
    expect(after.amountCents).toBe(0);
  });
  it("rejects bad input", () => {
    expect(() => computeServiceLine({ agents: -1, rateCents: RATE, month: nov, startDate: { year: 2026, month: 11, day: 1 } })).toThrow();
    expect(() => computeServiceLine({ agents: 1.5, rateCents: RATE, month: nov, startDate: { year: 2026, month: 11, day: 1 } })).toThrow();
    expect(() => computeServiceLine({ agents: 1, rateCents: 10.5, month: nov, startDate: { year: 2026, month: 11, day: 1 } })).toThrow();
  });
});

describe("invoice numbering", () => {
  it("formats by service month with a three digit sequence", () => {
    expect(formatInvoiceNumber({ year: 2026, month: 11 }, 1)).toBe("INV-2026-11-001");
    expect(formatInvoiceNumber({ year: 2026, month: 3 }, 42)).toBe("INV-2026-03-042");
    expect(formatInvoiceNumber({ year: 2026, month: 3 }, 1234)).toBe("INV-2026-03-1234");
  });
  it("rejects a zero sequence", () => {
    expect(() => formatInvoiceNumber({ year: 2026, month: 3 }, 0)).toThrow();
  });
});

describe("dueDateFor", () => {
  it("adds the payment term in days", () => {
    expect(dueDateFor({ year: 2026, month: 11, day: 25 }, 7)).toEqual({ year: 2026, month: 12, day: 2 });
    expect(dueDateFor({ year: 2026, month: 11, day: 25 }, 0)).toEqual({ year: 2026, month: 11, day: 25 });
  });
});

describe("dueInvoices, billing in advance", () => {
  const start = { year: 2026, month: 11, day: 3 };
  const base = { startDate: start, endDate: null, billingMode: "ADVANCE" as const };

  it("issues the first invoice at signing for the start month", () => {
    const due = dueInvoices({ ...base, asOf: start, alreadyInvoiced: new Set() });
    expect(due).toHaveLength(1);
    expect(due[0]).toEqual({ month: { year: 2026, month: 11 }, kind: "INITIAL", issueDate: start });
  });
  it("issues nothing more until the 1st of the next month", () => {
    const due = dueInvoices({ ...base, asOf: { year: 2026, month: 11, day: 30 }, alreadyInvoiced: new Set(["2026-11"]) });
    expect(due).toEqual([]);
  });
  it("issues the December invoice on December 1", () => {
    const due = dueInvoices({ ...base, asOf: { year: 2026, month: 12, day: 1 }, alreadyInvoiced: new Set(["2026-11"]) });
    expect(due).toEqual([{ month: { year: 2026, month: 12 }, kind: "MONTHLY", issueDate: { year: 2026, month: 12, day: 1 } }]);
  });
  it("never duplicates when the job runs twice", () => {
    const due = dueInvoices({ ...base, asOf: { year: 2026, month: 12, day: 1 }, alreadyInvoiced: new Set(["2026-11", "2026-12"]) });
    expect(due).toEqual([]);
  });
  it("catches up on every missed month", () => {
    const due = dueInvoices({ ...base, asOf: { year: 2027, month: 2, day: 1 }, alreadyInvoiced: new Set(["2026-11", "2026-12"]) });
    expect(due.map((d) => yearMonthKey(d.month))).toEqual(["2027-01", "2027-02"]);
    expect(due.every((d) => d.kind === "MONTHLY")).toBe(true);
  });
  it("stops after the contract end month and marks a partial last month FINAL", () => {
    const due = dueInvoices({
      ...base, endDate: { year: 2027, month: 1, day: 15 },
      asOf: { year: 2027, month: 6, day: 1 }, alreadyInvoiced: new Set(["2026-11", "2026-12"]),
    });
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("FINAL");
    expect(yearMonthKey(due[0].month)).toBe("2027-01");
  });
  it("treats an end on the last day of a month as a normal monthly invoice", () => {
    const due = dueInvoices({
      ...base, endDate: { year: 2026, month: 12, day: 31 },
      asOf: { year: 2027, month: 6, day: 1 }, alreadyInvoiced: new Set(["2026-11"]),
    });
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("MONTHLY");
  });
  it("signing on the 1st still creates an INITIAL invoice, for the full month", () => {
    const first = { year: 2026, month: 12, day: 1 };
    const due = dueInvoices({ ...base, startDate: first, asOf: first, alreadyInvoiced: new Set() });
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("INITIAL");
    const line = computeServiceLine({ agents: 1, rateCents: RATE, month: due[0].month, startDate: first });
    expect(line.isFullMonth).toBe(true);
  });
  it("is correct across the year end", () => {
    const due = dueInvoices({
      ...base, startDate: { year: 2026, month: 12, day: 20 },
      asOf: { year: 2027, month: 1, day: 1 }, alreadyInvoiced: new Set(["2026-12"]),
    });
    expect(due.map((d) => yearMonthKey(d.month))).toEqual(["2027-01"]);
  });
});

describe("dueInvoices, billing in arrears", () => {
  const start = { year: 2026, month: 11, day: 3 };
  const base = { startDate: start, endDate: null, billingMode: "ARREARS" as const };

  it("issues nothing at signing", () => {
    expect(dueInvoices({ ...base, asOf: start, alreadyInvoiced: new Set() })).toEqual([]);
  });
  it("issues the start month invoice on the 1st of the next month", () => {
    const due = dueInvoices({ ...base, asOf: { year: 2026, month: 12, day: 1 }, alreadyInvoiced: new Set() });
    expect(due).toEqual([{ month: { year: 2026, month: 11 }, kind: "INITIAL", issueDate: { year: 2026, month: 12, day: 1 } }]);
  });
  it("matches the real Spectrum pattern: October service invoiced on November 1", () => {
    const due = dueInvoices({
      startDate: { year: 2026, month: 10, day: 1 }, endDate: null, billingMode: "ARREARS",
      asOf: { year: 2026, month: 11, day: 1 }, alreadyInvoiced: new Set(),
    });
    expect(due.map((d) => yearMonthKey(d.month))).toEqual(["2026-10"]);
    expect(due[0].issueDate).toEqual({ year: 2026, month: 11, day: 1 });
  });
});
