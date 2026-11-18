"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request";
import { buildMouLink, cancelMou, sendToClient } from "@/lib/services/mou";

export interface LinkState {
  error?: string;
  link?: string;
  expiresAt?: string;
  cancelled?: boolean;
  emails?: string[];
}

// The state and form arguments are required by the form hook but not needed here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendToClientAction(mouId: string, _prev: LinkState, _formData: FormData): Promise<LinkState> {
  const admin = await requireAdmin();
  const { ip } = await getRequestMeta();
  const result = await sendToClient(mouId, { email: admin.email, ip });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/mous/${mouId}`);
  revalidatePath("/admin/mous");
  return {
    link: buildMouLink(result.value.token),
    expiresAt: result.value.expiresAt.toISOString().slice(0, 10),
    emails: result.value.emails,
  };
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
