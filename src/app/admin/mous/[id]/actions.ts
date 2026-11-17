"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request";
import { buildMouLink, cancelMou, regenerateLink } from "@/lib/services/mou";

export interface LinkState {
  error?: string;
  link?: string;
  expiresAt?: string;
  cancelled?: boolean;
}

export async function regenerateLinkAction(mouId: string, _prev: LinkState, formData: FormData): Promise<LinkState> {
  const admin = await requireAdmin();
  const days = Number(formData.get("days"));
  if (!Number.isInteger(days) || days < 1 || days > 90) return { error: "Choose between 1 and 90 days." };
  const { ip } = await getRequestMeta();
  const result = await regenerateLink(mouId, { email: admin.email, ip }, days);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/mous/${mouId}`);
  return { link: buildMouLink(result.value.token), expiresAt: result.value.expiresAt.toISOString().slice(0, 10) };
}

// The first argument is the previous state, which this action does not need.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function cancelMouAction(mouId: string, _prev: LinkState): Promise<LinkState> {
  const admin = await requireAdmin();
  const { ip } = await getRequestMeta();
  const result = await cancelMou(mouId, { email: admin.email, ip });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/mous/${mouId}`);
  revalidatePath("/admin/mous");
  return { cancelled: true };
}
