import { defineConfig, devices } from "@playwright/test";

const expoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
const port = Number(process.env.PORT ?? 8081);
const baseURL = expoDomain
  ? `https://${expoDomain}/`
  : `http://localhost:${port}/`;

export default defineConfig({
  testDir: "./e2e",
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
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm exec expo start --localhost --port 8081 --non-interactive",
        port,
        timeout: 120_000,
        reuseExistingServer: false,
        env: {
          PORT: String(port),
          EXPO_PUBLIC_DOMAIN: `localhost:${port}`,
        },
      }
    : undefined,
});
