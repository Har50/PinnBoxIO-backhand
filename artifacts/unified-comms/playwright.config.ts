import { defineConfig, devices } from "@playwright/test";

const devDomain = process.env.REPLIT_DEV_DOMAIN;
const port = Number(process.env.PORT ?? 5173);
const baseURL = devDomain
  ? `https://${devDomain}/`
  : `http://localhost:${port}/`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm run dev",
        port,
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
          PORT: String(port),
          BASE_PATH: "/",
          VITE_CLERK_PUBLISHABLE_KEY:
            process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
        },
      }
    : undefined,
});
