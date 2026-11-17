import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionRecord,
  deleteSessionByToken,
  findValidSession,
  purgeExpiredSessions,
  type SessionMeta,
} from "./session-store";

const isProd = process.env.NODE_ENV === "production";
// The __Host- prefix makes browsers refuse the cookie unless it is secure and site wide.
export const SESSION_COOKIE = isProd ? "__Host-lexgo_session" : "lexgo_session";

export async function startSession(adminId: string, meta: SessionMeta) {
  await purgeExpiredSessions();
  const { token, expiresAt } = await createSessionRecord(adminId, meta);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  await deleteSessionByToken(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
}

/** The signed in admin, or null. Cached for the duration of one request. */
export const getCurrentAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const found = await findValidSession(token);
  return found ? found.admin : null;
});

/**
 * Call this at the top of every admin page and every admin server action.
 * The layout check alone is not enough, because server actions can be called directly.
 */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
