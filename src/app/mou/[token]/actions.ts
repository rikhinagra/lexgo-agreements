"use server";

import { redirect } from "next/navigation";
import { getRequestMeta } from "@/lib/auth/request";
import { askQuestion, signMou } from "@/lib/services/client-mou";
import { parseWith, questionSchema, signMouSchema, type FieldErrors } from "@/lib/validation/mou";

export interface ClientFormState {
  values?: Record<string, string>;
  fieldErrors?: FieldErrors;
  error?: string;
  sent?: boolean;
}

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

export async function signMouAction(token: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const values = readValues(formData);
  const parsed = parseWith(signMouSchema, values);
  if (!parsed.ok) return { values, fieldErrors: parsed.fieldErrors };

  const meta = await getRequestMeta();
  let result;
  try {
    result = await signMou(token, parsed.value, meta);
  } catch (e) {
    console.error("signMou failed", e);
    return { values, error: "Something went wrong and nothing was signed. Please try again." };
  }
  if (!result.ok) return { values, error: result.error };
  // The page now shows the signed copy.
  redirect(`/mou/${token}`);
}

export async function askQuestionAction(token: string, _prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const values = readValues(formData);
  // A hidden field that people never see. Bots fill it in, so a value means spam.
  // They get the same friendly answer, and nothing is saved.
  if ((values.website ?? "") !== "") return { sent: true };

  const parsed = parseWith(questionSchema, values);
  if (!parsed.ok) return { values, fieldErrors: parsed.fieldErrors };

  const meta = await getRequestMeta();
  try {
    const result = await askQuestion(token, parsed.value, meta);
    if (!result.ok) return { values, error: result.error };
  } catch (e) {
    console.error("askQuestion failed", e);
    return { values, error: "Your question could not be sent. Please try again." };
  }
  return { sent: true };
}
