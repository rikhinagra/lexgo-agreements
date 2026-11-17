// Usage: pnpm admin:set-password you@example.com ["Display Name"]
// Creates the admin if it does not exist (a name is then required), and sets the password.
// The password is typed into a hidden prompt, so it never appears on screen or in history.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { checkPasswordStrength, hashPassword } from "../src/lib/auth/password";

config({ path: ".env.local" });

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error("This command needs an interactive terminal."));
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1); // Ctrl-C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const name = process.argv[3]?.trim();
  if (!email.includes("@")) throw new Error('Usage: pnpm admin:set-password you@example.com ["Display Name"]');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (!existing && !name) throw new Error("This admin does not exist yet. Add a display name as the second argument.");

    const password = await askHidden("New password (hidden): ");
    const problem = checkPasswordStrength(password);
    if (problem) throw new Error(problem);
    const again = await askHidden("Type it again: ");
    if (again !== password) throw new Error("The two passwords do not match. Nothing was saved.");

    const passwordHash = await hashPassword(password);
    if (existing) {
      await prisma.admin.update({
        where: { id: existing.id },
        data: { passwordHash, failedLogins: 0, lockedUntil: null, active: true },
      });
      await prisma.session.deleteMany({ where: { adminId: existing.id } }); // sign out everywhere
    } else {
      await prisma.admin.create({ data: { email, name: name!, passwordHash } });
    }
    await prisma.auditLog.create({
      data: { actor: "cli", action: existing ? "admin.password_set" : "admin.created", entityType: "Admin", entityId: existing?.id ?? email },
    });
    console.log(`Password saved for ${email}. You can sign in now.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
