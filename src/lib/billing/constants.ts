// Default business settings. The real values are stored in the Setting table
// and can be changed by admins. These are the fallbacks.

/** All "which day is it" decisions use this timezone (Pacific, California). */
export const BUSINESS_TIMEZONE = "America/Los_Angeles";

/** Default monthly rate per agent: $1,800.00 in cents. */
export const DEFAULT_RATE_CENTS = 180_000;

/** Default number of days an invoice is payable after its issue date. */
export const DEFAULT_PAYMENT_DUE_DAYS = 7;
