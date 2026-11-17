import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });

// Integration tests use the real Neon test database, so they run one file at a time.
export default defineConfig({
  test: {
    include: ["src/**/*.int.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
