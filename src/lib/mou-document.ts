import { createHash } from "node:crypto";
import { computeServiceLine, formatCents, formatLongDate, toBusinessDate, type CalDate } from "./billing";

/** Change this whenever the MOU wording changes. It is saved with every signature. */
export const TERMS_VERSION = "2026-11-v1";

export interface MouDocumentInput {
  companyName: string;
  agents: number;
  rateCents: number;
  billingMode: "ADVANCE" | "ARREARS";
  paymentDueDays: number;
  paymentMethod: string | null;
  governingLaw: string | null;
  customScope: string | null;
  providerName: string;
  providerSignatoryName: string;
  providerSignatoryTitle: string;
  /** Set once the client has signed. */
  signed: null | {
    startDate: CalDate;
    signerName: string;
    signerTitle: string;
    signerEmail: string;
    signedAtText: string;
  };
  /** Used before signing, to show what the first invoice would be if signed today. */
  today: CalDate;
}

export interface MouRow { label: string; value: string }
export interface MouSection {
  heading: string;
  rows?: MouRow[];
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
}
export interface MouDocument {
  title: string;
  subtitle: string;
  intro: string;
  sections: MouSection[];
  signatures: { provider: { name: string; title: string; company: string }; client: { company: string; name: string | null; title: string | null; date: string | null } };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The MOU text, built from the saved terms. Both the page and the signing record use it. */
export function buildMouDocument(i: MouDocumentInput): MouDocument {
  const start = i.signed?.startDate ?? i.today;
  const line = computeServiceLine({
    agents: i.agents,
    rateCents: i.rateCents,
    month: { year: start.year, month: start.month },
    startDate: start,
  });
  const advance = i.billingMode === "ADVANCE";

  const initialBilling = advance
    ? i.signed
      ? `Monthly in advance. First invoice on signing: ${formatCents(line.amountCents)} for ${plural(i.agents, "Resource")}.`
      : `Monthly in advance. The first invoice is prepared on signing and pro rated from the signing date. Signing today would be ${formatCents(line.amountCents)} for ${plural(i.agents, "Resource")}.`
    : "Monthly in arrears. Each invoice is issued after the service month ends, and the first month is pro rated from the start date.";

  const scope = [
    "Inbox management, calendar organization, and scheduling",
    "Data entry, CRM maintenance, and routine reporting",
    "Research, documentation, and presentation support",
    "Customer, client, and vendor communications",
  ];
  if (i.customScope) scope.push(i.customScope);

  const dueText = i.paymentDueDays === 0 ? "Due upon receipt of invoice" : `Due within ${i.paymentDueDays} days of invoice date`;

  const sections: MouSection[] = [
    {
      heading: "1. Engagement details",
      rows: [
        { label: "Start date", value: i.signed ? formatLongDate(i.signed.startDate) : "The date of signing" },
        { label: "Number of assistants", value: `${plural(i.agents, "Virtual Assistant")} at start` },
        { label: "Additional resources", value: "Added on Client's written request (email is sufficient), at the same monthly rate per Assistant." },
        { label: "Engagement type", value: "Full-time, dedicated, monthly commitment per Resource" },
        { label: "Working days and hours", value: "Monday to Friday, standard full working day, aligned to Client's operational business hours" },
        { label: "Term", value: "Rolling monthly, continuing until terminated in accordance with Section 5" },
        { label: "Client contact", value: i.signed ? `${i.signed.signerName}, ${i.signed.signerEmail}` : "Entered by the signer below" },
      ],
    },
    {
      heading: "2. Scope of work",
      paragraphs: ["The assigned Resources will support the Client with administrative and operational tasks, including:"],
      bullets: scope,
      note: "Work materially outside this scope will be agreed upon in writing before commencement.",
    },
    {
      heading: "3. Fees and payment",
      rows: [
        { label: "Monthly commitment", value: `${formatCents(i.rateCents)} USD per Resource per month` },
        { label: "Initial billing", value: initialBilling },
        { label: "Payment terms", value: dueText },
        { label: "Added resources", value: advance ? "Billed pro rata from their start date, then monthly in advance" : "Billed pro rata from their start date, then monthly in arrears" },
        { label: "Payment method", value: i.paymentMethod ?? "To be confirmed" },
      ],
      note: advance
        ? "Services for any given month begin once that month's invoice is paid in full. Fees are exclusive of applicable taxes."
        : "Fees are exclusive of applicable taxes.",
    },
    {
      heading: "4. Responsibilities",
      rows: [
        { label: "Service Provider", value: "Assigns qualified personnel, oversees payroll, equipment, and basic connectivity, replaces unavailable personnel within ten (10) business days, and monitors attendance and quality standard adherence." },
        { label: "Client", value: "Provides operational instructions, system access and licenses, designates a primary point of contact, and remits payments on time." },
      ],
    },
    {
      heading: "5. Terms and conditions",
      rows: [
        { label: "Confidentiality and data", value: "Both Parties agree to keep non-public information confidential. This clause survives termination for two (2) years." },
        { label: "Intellectual property", value: "All work product created under this MOU belongs exclusively to the Client upon receipt of full payment. Service Provider retains ownership of its pre-existing tools and templates." },
        { label: "Non-solicitation", value: "During the engagement and for 12 months thereafter, the Client will not directly hire or solicit any Resource introduced under this MOU without written consent." },
        { label: "Termination", value: "Either Party may terminate with 30 days' written notice, or immediately for uncured material breach (10 business days notice). Fees paid for the current month are non-refundable." },
        { label: "Governing law", value: `Governed by the laws of ${i.governingLaw ?? "the State of California"}.` },
      ],
    },
  ];

  return {
    title: "Memorandum of Understanding",
    subtitle: "Virtual Assistant Services Agreement",
    intro: `This Memorandum of Understanding ("MOU") is made effective as of ${i.signed ? formatLongDate(i.signed.startDate) : "the date of signing"}, between ${i.providerName} ("Service Provider") and ${i.companyName} ("Client"). Each is a "Party" and together the "Parties."`,
    sections,
    signatures: {
      provider: { name: i.providerSignatoryName, title: i.providerSignatoryTitle, company: i.providerName },
      client: {
        company: i.companyName,
        name: i.signed?.signerName ?? null,
        title: i.signed?.signerTitle ?? null,
        date: i.signed?.signedAtText ?? null,
      },
    },
  };
}

/** A fingerprint of the exact text that was agreed to. Saved with the signature. */
export function hashDocument(doc: MouDocument): string {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}

export function todayInBusinessZone(now = new Date()): CalDate {
  return toBusinessDate(now);
}
