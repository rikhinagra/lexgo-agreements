import { z } from "zod";
import { dollarsToCents } from "../billing/money";

export const MAX_CC_EMAILS = 5;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `Use at most ${max} characters.`);

export const createMouSchema = z.object({
  companyName: requiredText("Company name", 2, 120),
  agents: z.coerce
    .number({ message: "Enter the number of agents." })
    .int("Agents must be a whole number.")
    .min(1, "At least 1 agent.")
    .max(500, "At most 500 agents."),
  rate: z.string().trim().transform((value, ctx) => {
    try {
      const cents = dollarsToCents(value);
      if (cents < 100 || cents > 10_000_000) {
        ctx.addIssue({ code: "custom", message: "Rate must be between $1 and $100,000." });
        return z.NEVER;
      }
      return cents;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a dollar amount such as 1800 or 1800.50." });
      return z.NEVER;
    }
  }),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(200)),
  /** Extra people who get a copy of the MOU. Only one person signs. */
  ccEmails: z
    .array(z.string())
    .default([])
    .transform((list) => list.map((e) => e.trim().toLowerCase()).filter((e) => e !== "")),
  billingMode: z.enum(["ADVANCE", "ARREARS"], { message: "Choose a billing timing." }),
  paymentDueDays: z.coerce
    .number({ message: "Enter the payment due days." })
    .int("Payment due days must be a whole number.")
    .min(0, "Use 0 or more days.")
    .max(90, "Use at most 90 days."),
  governingLaw: requiredText("Governing law", 2, 120),
  paymentMethod: requiredText("Payment method", 2, 200),
  customScope: optionalText(300),
  linkExpiryDays: z.coerce
    .number()
    .int()
    .min(1, "Use at least 1 day.")
    .max(90, "Use at most 90 days.")
    .default(30),
}).superRefine((data, ctx) => {
  if (data.ccEmails.length > MAX_CC_EMAILS) {
    ctx.addIssue({ code: "custom", path: ["ccEmails"], message: `Add at most ${MAX_CC_EMAILS} extra emails.` });
    return;
  }
  const seen = new Set<string>([data.clientEmail]);
  for (const email of data.ccEmails) {
    if (!z.email().safeParse(email).success || email.length > 200) {
      ctx.addIssue({ code: "custom", path: ["ccEmails"], message: `"${email}" is not a valid email address.` });
      return;
    }
    if (seen.has(email)) {
      ctx.addIssue({ code: "custom", path: ["ccEmails"], message: `"${email}" is listed twice.` });
      return;
    }
    seen.add(email);
  }
});

export type CreateMouInput = z.infer<typeof createMouSchema>;

export type FieldErrors = Record<string, string[] | undefined>;

export function parseCreateMou(
  data: Record<string, unknown>,
): { ok: true; value: CreateMouInput } | { ok: false; fieldErrors: FieldErrors } {
  const result = createMouSchema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, fieldErrors: z.flattenError(result.error).fieldErrors as FieldErrors };
}

// ---------- Client page ----------

const phone = (label: string) =>
  z
    .string()
    .trim()
    .max(25, "Use at most 25 characters.")
    .refine((v) => /^[+()\-.\s\d]+$/.test(v) && v.replace(/\D/g, "").length >= 7, `Enter a valid ${label}.`);

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(200));

const optional = (schema: z.ZodType<string, string>) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(schema.nullable());

export const signMouSchema = z
  .object({
    signerName: requiredText("Full name", 2, 120),
    signerTitle: requiredText("Job title", 2, 120),
    signerEmail1: emailField,
    signerPhone1: phone("phone number"),
    signerEmail2: optional(emailField),
    signerPhone2: optional(phone("phone number")),
    signatureTyped: requiredText("Typed signature", 2, 120),
    agree: z.literal("on", { message: "Please tick the box to agree." }),
  })
  .superRefine((data, ctx) => {
    const norm = (v: string) => v.replace(/\s+/g, " ").trim().toLowerCase();
    if (norm(data.signatureTyped) !== norm(data.signerName)) {
      ctx.addIssue({ code: "custom", path: ["signatureTyped"], message: "Type your full name exactly as entered above." });
    }
  });

export type SignMouInput = z.infer<typeof signMouSchema>;

export const questionSchema = z.object({
  body: requiredText("Your question", 5, 2000),
  replyEmail: emailField,
});

export type QuestionInput = z.infer<typeof questionSchema>;

export function parseWith<T>(
  schema: z.ZodType<T>,
  data: Record<string, unknown>,
): { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, fieldErrors: z.flattenError(result.error as z.ZodError<Record<string, unknown>>).fieldErrors as FieldErrors };
}
