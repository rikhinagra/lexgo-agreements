"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/auth/request";
import { buildMouLink, createMou } from "@/lib/services/mou";
import { parseCreateMou, type FieldErrors } from "@/lib/validation/mou";

export interface CreateMouState {
  values?: Record<string, string>;
  fieldErrors?: FieldErrors;
  error?: string;
  created?: { id: string; company: string; link: string; expiresAt: string };
}

export async function createMouAction(_prev: CreateMouState, formData: FormData): Promise<CreateMouState> {
  const admin = await requireAdmin();

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }

  const parsed = parseCreateMou(values);
  if (!parsed.ok) return { values, fieldErrors: parsed.fieldErrors };

  try {
    const { ip } = await getRequestMeta();
    const { mou, token } = await createMou(parsed.value, { email: admin.email, ip });
    return {
      created: {
        id: mou.id,
        company: parsed.value.companyName,
        link: buildMouLink(token),
        expiresAt: mou.tokenExpiresAt.toISOString().slice(0, 10),
      },
    };
  } catch (e) {
    console.error("createMou failed", e);
    return { values, error: "Could not save the MOU. Please try again." };
  }
}
