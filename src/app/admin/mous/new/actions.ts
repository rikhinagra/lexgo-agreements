"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request";
import { createMou } from "@/lib/services/mou";
import { parseCreateMou, type FieldErrors } from "@/lib/validation/mou";

export interface CreateMouState {
  values?: Record<string, string>;
  fieldErrors?: FieldErrors;
  error?: string;
  ccEmails?: string[];
  created?: { id: string; company: string };
}

export async function createMouAction(_prev: CreateMouState, formData: FormData): Promise<CreateMouState> {
  const admin = await requireAdmin();

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }

  const ccEmails = formData.getAll("ccEmail").filter((v): v is string => typeof v === "string");
  delete values.ccEmail;

  const parsed = parseCreateMou({ ...values, ccEmails });
  if (!parsed.ok) return { values, ccEmails, fieldErrors: parsed.fieldErrors };

  try {
    const { ip } = await getRequestMeta();
    const { mou } = await createMou(parsed.value, { email: admin.email, ip });
    return { created: { id: mou.id, company: parsed.value.companyName } };
  } catch (e) {
    console.error("createMou failed", e);
    return { values, ccEmails, error: "Could not save the MOU. Please try again." };
  }
}
