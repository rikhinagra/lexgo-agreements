import type { CreateMouInput } from "./validation/mou";

export type FieldChange = { field: string; from: string; to: string };

const show = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "none" : String(v));

/** Which terms are different between the saved MOU and the edited form. */
export function describeChanges(
  before: {
    companyName: string; agents: number; rateCents: number; billingMode: string; paymentDueDays: number;
    governingLaw: string | null; paymentMethod: string | null; customScope: string | null;
    clientEmail: string; ccEmails: string[];
  },
  after: CreateMouInput,
): FieldChange[] {
  const rows: [string, string, string][] = [
    ["Company name", show(before.companyName), show(after.companyName)],
    ["Client email", show(before.clientEmail), show(after.clientEmail)],
    ["Copy emails", show(before.ccEmails.join(", ")), show(after.ccEmails.join(", "))],
    ["VA agents", show(before.agents), show(after.agents)],
    ["Rate per agent", show(before.rateCents), show(after.rate)],
    ["Extra scope", show(before.customScope), show(after.customScope)],
    ["Billing", show(before.billingMode), show(after.billingMode)],
    ["Payment due days", show(before.paymentDueDays), show(after.paymentDueDays)],
    ["Governing law", show(before.governingLaw), show(after.governingLaw)],
    ["Payment method", show(before.paymentMethod), show(after.paymentMethod)],
  ];
  return rows.filter(([, from, to]) => from !== to).map(([field, from, to]) => ({ field, from, to }));
}
