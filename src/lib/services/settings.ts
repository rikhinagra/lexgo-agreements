import { prisma } from "../db/client";
import {
  BUSINESS_TIMEZONE,
  DEFAULT_PAYMENT_DUE_DAYS,
  DEFAULT_RATE_CENTS,
} from "../billing/constants";

export interface AppSettings {
  businessTimezone: string;
  defaultRateCents: number;
  defaultPaymentDueDays: number;
  defaultBillingMode: "ADVANCE" | "ARREARS";
  defaultGoverningLaw: string;
  defaultPaymentMethod: string;
  providerLegalName: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
  reviewBeforeSend: boolean;
}

/** Read settings from the database, falling back to safe defaults. */
export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const n = Number(map.get(key));
    return Number.isInteger(n) && n >= 0 ? n : fallback;
  };
  return {
    businessTimezone: map.get("business_timezone") ?? BUSINESS_TIMEZONE,
    defaultRateCents: num("default_rate_cents", DEFAULT_RATE_CENTS),
    defaultPaymentDueDays: num("default_payment_due_days", DEFAULT_PAYMENT_DUE_DAYS),
    defaultBillingMode: map.get("default_billing_mode") === "ARREARS" ? "ARREARS" : "ADVANCE",
    defaultGoverningLaw: map.get("default_governing_law") ?? "",
    defaultPaymentMethod: map.get("default_payment_method") ?? "",
    providerLegalName: map.get("provider_legal_name") ?? "",
    providerSignatoryName: map.get("provider_signatory_name") ?? "",
    providerSignatoryTitle: map.get("provider_signatory_title") ?? "",
    reviewBeforeSend: map.get("review_before_send") !== "false",
  };
}
