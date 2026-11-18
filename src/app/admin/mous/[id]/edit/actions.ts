"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request";
import { updateMou } from "@/lib/services/mou";
import { parseCreateMou } from "@/lib/validation/mou";
import type { CreateMouState } from "../../new/actions";

export async function updateMouAction(mouId: string, _prev: CreateMouState, formData: FormData): Promise<CreateMouState> {
  const admin = await requireAdmin();

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  const ccEmails = formData.getAll("ccEmail").filter((v): v is string => typeof v === "string");
  delete values.ccEmail;

  const parsed = parseCreateMou({ ...values, ccEmails });
  if (!parsed.ok) return { values, ccEmails, fieldErrors: parsed.fieldErrors };

  let outcome: "none" | "saved" | "stopped";
  try {
    const { ip } = await getRequestMeta();
    const result = await updateMou(mouId, parsed.value, { email: admin.email, ip });
    if (!result.ok) return { values, ccEmails, error: result.error };
    outcome = result.value.changes.length === 0 ? "none" : result.value.linkStopped ? "stopped" : "saved";
  } catch (e) {
    console.error("updateMou failed", e);
    return { values, ccEmails, error: "Could not save the changes. Please try again." };
  }

  revalidatePath(`/admin/mous/${mouId}`);
  revalidatePath("/admin/mous");
  // The detail page shows a short message for this outcome.
  redirect(`/admin/mous/${mouId}?edited=${outcome}`);
}
