import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node", testTimeout: 30000 },
});
