import { describe, expect, it } from "vitest";
import { checkPasswordStrength, hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./token";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });
  it("never stores the password and uses a new salt each time", async () => {
    const a = await hashPassword("same password here");
    const b = await hashPassword("same password here");
    expect(a).not.toContain("same password here");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
  });
  it("rejects malformed stored hashes without throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plaintext")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1$2$3$bad$bad")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$a$b")).toBe(false);
  });
  it("enforces the password rules", () => {
    expect(checkPasswordStrength("short")).not.toBeNull();
    expect(checkPasswordStrength("aaaaaaaaaaaaaaaa")).not.toBeNull();
    expect(checkPasswordStrength("x".repeat(200))).not.toBeNull();
    expect(checkPasswordStrength("A decent passphrase 42")).toBeNull();
  });
});

describe("tokens", () => {
  it("are long, random and URL safe", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("hash the same way every time and never equal the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});
