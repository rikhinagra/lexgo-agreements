import { describe, expect, it } from "vitest";
import { parseCreateMou } from "./validation/mou";
import { describeChanges } from "./mou-changes";

const form = {
  companyName: "Sunrise Dental", agents: "2", rate: "1800", clientEmail: "maria@example.com", ccEmails: ["a@x.com"],
  billingMode: "ADVANCE", paymentDueDays: "7", governingLaw: "California", paymentMethod: "Bank", customScope: "",
};
const before = {
  companyName: "Sunrise Dental", agents: 2, rateCents: 180_000, billingMode: "ADVANCE", paymentDueDays: 7,
  governingLaw: "California", paymentMethod: "Bank", customScope: null, clientEmail: "maria@example.com", ccEmails: ["a@x.com"],
};
const parse = (extra: Record<string, unknown> = {}) => {
  const r = parseCreateMou({ ...form, ...extra });
  if (!r.ok) throw new Error(JSON.stringify(r.fieldErrors));
  return r.value;
};

describe("describeChanges", () => {
  it("finds nothing when nothing changed", () => {
    expect(describeChanges(before, parse())).toEqual([]);
  });
  it("lists exactly the fields that changed", () => {
    const changes = describeChanges(before, parse({ agents: "3", clientEmail: "new@example.com", customScope: "Weekend cover" }));
    expect(changes.map((c) => c.field).sort()).toEqual(["Client email", "Extra scope", "VA agents"]);
    expect(changes.find((c) => c.field === "VA agents")).toMatchObject({ from: "2", to: "3" });
  });
  it("sees a changed rate and changed copy emails", () => {
    const changes = describeChanges(before, parse({ rate: "1600", ccEmails: ["a@x.com", "b@x.com"] }));
    expect(changes.map((c) => c.field).sort()).toEqual(["Copy emails", "Rate per agent"]);
  });
  it("treats an empty extra scope and no extra scope as the same", () => {
    expect(describeChanges({ ...before, customScope: null }, parse({ customScope: "  " }))).toEqual([]);
  });
});
