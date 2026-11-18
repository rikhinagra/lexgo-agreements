import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Test mode defaults. Every value can be changed later from the admin area.
const SETTINGS: Record<string, string> = {
  business_timezone: "America/Los_Angeles",
  default_rate_cents: "180000",
  default_payment_due_days: "7",
  default_billing_mode: "ADVANCE",
  default_governing_law: "State of California",
  default_payment_method: "To be confirmed",
  provider_legal_name: "LexGo Solutions",
  provider_signatory_name: "Rikhi Singh",
  provider_signatory_title: "Authorized Signatory",
  review_before_send: "true",
};

async function main() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const adminEmails = (process.env.TEST_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const names = ["Baba", "Rikhi", "Saheb"];
  for (let i = 0; i < adminEmails.length; i++) {
    const email = adminEmails[i];
    await prisma.admin.upsert({
      where: { email },
      create: { email, name: names[i] ?? `Admin ${i + 1}` },
      update: {},
    });
  }
  console.log(`Seeded ${Object.keys(SETTINGS).length} settings and ${adminEmails.length} test admins.`);
}

main().finally(() => prisma.$disconnect());
