import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": new URL("./__tests__/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.unit.test.ts"],
    exclude: ["__tests__/e2e/**"],
    coverage: {
      provider: "v8",
    },
  },
});
