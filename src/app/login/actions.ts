"use server";

import { redirect } from "next/navigation";
import { verifyLogin } from "@/lib/auth/login";
import { isIpBlocked, purgeOldAttempts, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { getRequestMeta } from "@/lib/auth/request";
import { startSession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

// One message for every failure, so the page never reveals which emails exist.
const FAILED = "Invalid email or password, or the account is temporarily locked.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password || email.length > 200 || password.length > 256) return { error: FAILED };

  const meta = await getRequestMeta();

  // Too many failures from this address: refuse without even checking the password.
  if (await isIpBlocked(meta.ip)) return { error: FAILED };

  const result = await verifyLogin(email, password);
  if (!result.ok) {
    await recordFailedAttempt(meta.ip);
    return { error: FAILED };
  }

  await purgeOldAttempts();
  await startSession(result.admin.id, meta);
  redirect("/admin/mous");
}
