import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "__tests__/e2e",
  timeout: 30_000,
  retries: 0,
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
});
