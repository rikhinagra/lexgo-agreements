import type { Prisma } from "../../generated/prisma/client";
import { formatInvoiceNumber } from "../billing/numbering";
import { yearMonthKey } from "../billing/dates";
import type { YearMonth } from "../billing/types";

/**
 * Reserve the next invoice number for a service month.
 *
 * Call this inside the same database transaction that creates the invoice.
 * If the transaction fails, the counter rolls back too, so numbers stay gapless.
 * The upsert increments atomically, so two invoices created at the same moment
 * can never receive the same number.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  ym: YearMonth,
): Promise<string> {
  const key = yearMonthKey(ym);
  const row = await tx.invoiceSequence.upsert({
    where: { yearMonth: key },
    create: { yearMonth: key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return formatInvoiceNumber(ym, row.lastValue);
}
