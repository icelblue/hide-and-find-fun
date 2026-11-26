import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "/tmp/browser/april/playwright-results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    actionTimeout: 15_000,
  },
});
