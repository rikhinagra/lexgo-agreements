import { describe, expect, it } from "vitest";
import { parseCreateMou } from "./mou";

const valid = {
  companyName: "Spectrum MRI",
  agents: "2",
  rate: "1,800",
  clientEmail: "  Angela@Example.COM ",
  billingMode: "ADVANCE",
  paymentDueDays: "7",
  governingLaw: "State of California",
  paymentMethod: "Bank transfer",
  customScope: "",
  linkExpiryDays: "14",
};

describe("parseCreateMou", () => {
  it("accepts good input and normalizes it", () => {
    const r = parseCreateMou(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.agents).toBe(2);
    expect(r.value.rate).toBe(180_000);
    expect(r.value.clientEmail).toBe("angela@example.com");
    expect(r.value.customScope).toBeNull();
    expect(r.value.paymentDueDays).toBe(7);
  });
  it("defaults the link expiry to 30 days", () => {
    const { linkExpiryDays: _ignored, ...rest } = valid;
    void _ignored;
    const r = parseCreateMou(rest);
    expect(r.ok && r.value.linkExpiryDays).toBe(30);
  });
  it("keeps an optional scope line", () => {
    const r = parseCreateMou({ ...valid, customScope: "  Bookkeeping support " });
    expect(r.ok && r.value.customScope).toBe("Bookkeeping support");
  });
  it("rejects bad agent counts", () => {
    for (const agents of ["0", "-1", "1.5", "abc", "501", ""]) {
      const r = parseCreateMou({ ...valid, agents });
      expect(r.ok, `agents=${agents}`).toBe(false);
      if (!r.ok) expect(r.fieldErrors.agents).toBeDefined();
    }
  });
  it("rejects bad rates", () => {
    for (const rate of ["", "abc", "12.345", "0", "0.50", "100001"]) {
      const r = parseCreateMou({ ...valid, rate });
      expect(r.ok, `rate=${rate}`).toBe(false);
      if (!r.ok) expect(r.fieldErrors.rate).toBeDefined();
    }
  });
  it("rejects bad emails", () => {
    for (const clientEmail of ["", "nope", "a@b", "a b@c.com"]) {
      const r = parseCreateMou({ ...valid, clientEmail });
      expect(r.ok, `email=${clientEmail}`).toBe(false);
    }
  });
  it("rejects a missing company, billing mode, governing law or payment method", () => {
    expect(parseCreateMou({ ...valid, companyName: " " }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, billingMode: "WEEKLY" }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, governingLaw: "" }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, paymentMethod: "" }).ok).toBe(false);
  });
  it("limits payment due days and link expiry", () => {
    expect(parseCreateMou({ ...valid, paymentDueDays: "-1" }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, paymentDueDays: "91" }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, paymentDueDays: "0" }).ok).toBe(true);
    expect(parseCreateMou({ ...valid, linkExpiryDays: "0" }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, linkExpiryDays: "91" }).ok).toBe(false);
  });
  it("rejects over long text", () => {
    expect(parseCreateMou({ ...valid, companyName: "x".repeat(121) }).ok).toBe(false);
    expect(parseCreateMou({ ...valid, customScope: "x".repeat(301) }).ok).toBe(false);
  });
});
