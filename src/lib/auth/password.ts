import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Passwords are hashed with scrypt, a slow memory hard function built into Node.
// The stored format is: scrypt$N$r$p$salt$hash (salt and hash in base64).
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * N * R * 2; // headroom above the 128 * N * r requirement

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  const options: ScryptOptions = { N: n, r, p, maxmem: Math.max(MAX_MEMORY, 128 * n * r * 2) };
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Returns a problem description, or null when the password is acceptable. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (new Set(password).size < 5) {
    return "Use a more varied password.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length !== KEY_LENGTH) return false;
  try {
    const actual = await derive(password, Buffer.from(saltB64, "base64"), Number(n), Number(r), Number(p));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// A real hash of a random value, used to spend the same time when the email is unknown.
let dummyHash: Promise<string> | null = null;
export function dummyVerify(password: string): Promise<boolean> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash.then((h) => verifyPassword(password, h));
}
