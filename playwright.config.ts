import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the built Ramifold (npm run build) with fake-claude (TechSpec 6, Baseline 11).
// Chromium always with its sandbox. Firefox and WebKit follow with task T-15.
export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, launchOptions: { chromiumSandbox: true } },
    },
  ],
});
