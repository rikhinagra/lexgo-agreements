/**
 * Integer division that rounds half up, for non negative whole numbers.
 * Example: roundHalfUpDiv(335, 10) is 34, and roundHalfUpDiv(334, 10) is 33.
 */
export function roundHalfUpDiv(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new Error("roundHalfUpDiv needs whole numbers");
  }
  if (numerator < 0 || denominator <= 0) {
    throw new Error("roundHalfUpDiv needs a non negative numerator and a positive denominator");
  }
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** 336000 becomes "$3,360.00". */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Cents must be a whole number");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rest}`;
}

/** Parse dollars typed by an admin, such as "1800" or "1,800.50", into cents. */
export function dollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid dollar amount: ${input}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
