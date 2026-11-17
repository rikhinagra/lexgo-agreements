import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load the local environment file for CLI commands such as migrate.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    // Migrations use the direct (non pooled) connection.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
