import { z } from "zod";
import { dollarsToCents } from "../billing/money";

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
    .default(14),
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
