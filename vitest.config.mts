import { defineConfig } from "vitest/config";

// Fast unit tests. No database needed.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], exclude: ["src/**/*.int.test.ts"], environment: "node" },
});
