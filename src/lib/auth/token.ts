import { createHash, randomBytes } from "node:crypto";

/** A random 256 bit token, safe to put in a cookie or a link. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored only as a SHA-256 hash. Tokens are random, so a fast hash is fine. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
