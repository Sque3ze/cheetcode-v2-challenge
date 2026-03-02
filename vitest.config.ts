import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.unit.test.ts"],
    exclude: ["__tests__/e2e/**"],
    coverage: {
      provider: "v8",
    },
  },
});
