import { describe, expect, it } from "vitest";
import { buildMouDocument, hashDocument, type MouDocumentInput } from "./mou-document";
import { parseCreateMou, parseWith, questionSchema, signMouSchema } from "./validation/mou";

const base: MouDocumentInput = {
  companyName: "Sunrise Dental",
  agents: 2,
  rateCents: 180_000,
  billingMode: "ADVANCE",
  paymentDueDays: 7,
  paymentMethod: "Bank transfer",
  governingLaw: "State of California",
  customScope: null,
  providerName: "LexGo Solutions",
  providerSignatoryName: "Rikhi Singh",
  providerSignatoryTitle: "Authorized Signatory",
  signed: null,
  today: { year: 2026, month: 11, day: 3 },
};

describe("buildMouDocument", () => {
  it("shows the pro rated first invoice for the signing day (Nov 3 is 28 of 30 days)", () => {
    const doc = buildMouDocument(base);
    const fees = doc.sections.find((s) => s.heading.startsWith("3."))!;
    const initial = fees.rows!.find((r) => r.label === "Initial billing")!;
    expect(initial.value).toContain("$3,360.00");
    expect(initial.value).toContain("2 Resources");
  });
  it("adds the extra scope line only when there is one", () => {
    expect(buildMouDocument(base).sections[1].bullets).toHaveLength(4);
    expect(buildMouDocument({ ...base, customScope: "Weekend cover" }).sections[1].bullets).toHaveLength(5);
  });
  it("drops the pay to start note when billing in arrears", () => {
    const advance = buildMouDocument(base).sections[2].note!;
    const arrears = buildMouDocument({ ...base, billingMode: "ARREARS" }).sections[2].note!;
    expect(advance).toContain("begin once that month's invoice is paid");
    expect(arrears).not.toContain("paid in full");
  });
  it("uses the signing details once signed", () => {
    const doc = buildMouDocument({
      ...base,
      signed: { startDate: { year: 2026, month: 11, day: 3 }, signerName: "Maria Lopez", signerTitle: "Owner", signerEmail: "maria@example.com", signedAtText: "Nov 3, 2026" },
    });
    expect(doc.intro).toContain("November 3, 2026");
    expect(doc.signatures.client.name).toBe("Maria Lopez");
  });
  it("gives the same fingerprint for the same text and a different one when text changes", () => {
    expect(hashDocument(buildMouDocument(base))).toBe(hashDocument(buildMouDocument(base)));
    expect(hashDocument(buildMouDocument(base))).not.toBe(hashDocument(buildMouDocument({ ...base, agents: 3 })));
  });
});

describe("copy emails", () => {
  const form = {
    companyName: "Sunrise Dental", agents: "2", rate: "1800", clientEmail: "Maria@Example.com",
    billingMode: "ADVANCE", paymentDueDays: "7", governingLaw: "California", paymentMethod: "Bank",
  };
  it("accepts up to 5, lowercases them and skips empty boxes", () => {
    const r = parseCreateMou({ ...form, ccEmails: ["A@x.com", "", " b@x.com "] });
    expect(r.ok && r.value.ccEmails).toEqual(["a@x.com", "b@x.com"]);
  });
  it("refuses a bad address, a repeat of the main email, a repeat in the list, and more than 5", () => {
    expect(parseCreateMou({ ...form, ccEmails: ["nope"] }).ok).toBe(false);
    expect(parseCreateMou({ ...form, ccEmails: ["maria@example.com"] }).ok).toBe(false);
    expect(parseCreateMou({ ...form, ccEmails: ["a@x.com", "A@x.com"] }).ok).toBe(false);
    expect(parseCreateMou({ ...form, ccEmails: ["1@x.com", "2@x.com", "3@x.com", "4@x.com", "5@x.com", "6@x.com"] }).ok).toBe(false);
  });
  it("works with no copy emails and defaults the link to 30 days", () => {
    const r = parseCreateMou(form);
    expect(r.ok && r.value.ccEmails).toEqual([]);
    expect(r.ok && r.value.linkExpiryDays).toBe(30);
  });
});

describe("signing and question forms", () => {
  const good = {
    signerName: "Maria Lopez", signerTitle: "Owner", signerEmail1: "Maria@Example.com", signerPhone1: "+1 (555) 123-4567",
    signerEmail2: "", signerPhone2: "", signatureTyped: "maria  lopez", agree: "on",
  };
  it("accepts a complete form, ignoring spacing and capitals in the typed name", () => {
    const r = parseWith(signMouSchema, good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.signerEmail1).toBe("maria@example.com");
      expect(r.value.signerEmail2).toBeNull();
    }
  });
  it("needs the agree box, a real phone, and a typed name that matches", () => {
    expect(parseWith(signMouSchema, { ...good, agree: "" }).ok).toBe(false);
    expect(parseWith(signMouSchema, { ...good, signerPhone1: "abc" }).ok).toBe(false);
    expect(parseWith(signMouSchema, { ...good, signerPhone1: "12" }).ok).toBe(false);
    expect(parseWith(signMouSchema, { ...good, signatureTyped: "Someone Else" }).ok).toBe(false);
    expect(parseWith(signMouSchema, { ...good, signerTitle: "" }).ok).toBe(false);
  });
  it("checks the optional second email and phone only when given", () => {
    expect(parseWith(signMouSchema, { ...good, signerEmail2: "bad" }).ok).toBe(false);
    expect(parseWith(signMouSchema, { ...good, signerEmail2: "two@example.com", signerPhone2: "555 987 6543" }).ok).toBe(true);
  });
  it("needs a real question and reply email", () => {
    expect(parseWith(questionSchema, { body: "Can we add a third agent later?", replyEmail: "a@b.com" }).ok).toBe(true);
    expect(parseWith(questionSchema, { body: "hi", replyEmail: "a@b.com" }).ok).toBe(false);
    expect(parseWith(questionSchema, { body: "A proper question here", replyEmail: "nope" }).ok).toBe(false);
  });
});
