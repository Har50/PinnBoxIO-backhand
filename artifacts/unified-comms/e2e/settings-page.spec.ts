import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_USER_EMAIL } from "./global-setup";

/**
 * Settings page end-to-end tests for PinnboxIO (unified-comms web app).
 *
 * These tests verify that:
 *  1. All major card sections are rendered on /settings for a signed-in user.
 *  2. The dark mode toggle applies/removes the "dark" class on <html>.
 *  3. The "Manage connected accounts" button navigates to /accounts.
 *
 * Requires CLERK_SECRET_KEY to be set so @clerk/testing can programmatically
 * create a user session. Without it the tests are skipped automatically.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/sign-in`);
  await setupClerkTestingToken({ page });
  await clerk.signIn({
    page,
    emailAddress: TEST_USER_EMAIL,
  });
}

test.describe("Settings page — unauthenticated access", () => {
  test("unauthenticated visitor navigating to /settings is redirected to /sign-in", async ({ page }) => {
    await page.goto(`${BASE}/settings`);

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("nav")).not.toBeVisible();
  });
});

test.describe("Settings page", () => {
  test("renders all major sections for a signed-in user", async ({ page }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping settings test");
    }

    await signIn(page);
    await page.goto(`${BASE}/settings`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    const heading = page.getByRole("heading", { name: "Settings" });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("section-profile")).toBeVisible();
    await expect(page.getByTestId("section-appearance")).toBeVisible();
    await expect(page.getByTestId("section-notifications")).toBeVisible();
    await expect(page.getByTestId("section-connected-accounts")).toBeVisible();
    await expect(page.getByTestId("section-account-security")).toBeVisible();
  });

  test("dark mode toggle adds and removes the dark class on <html>", async ({ page }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping settings dark mode test");
    }

    await signIn(page);
    await page.goto(`${BASE}/settings`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    const heading = page.getByRole("heading", { name: "Settings" });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const toggle = page.getByTestId("toggle-dark-mode");
    await expect(toggle).toBeVisible({ timeout: 5_000 });

    const isCurrentlyDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );

    await toggle.click();

    const isDarkAfterFirstClick = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(isDarkAfterFirstClick).toBe(!isCurrentlyDark);

    await toggle.click();

    const isDarkAfterSecondClick = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(isDarkAfterSecondClick).toBe(isCurrentlyDark);
  });

  test("'Manage connected accounts' button navigates to /accounts", async ({ page }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping settings navigation test");
    }

    await signIn(page);
    await page.goto(`${BASE}/settings`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    const heading = page.getByRole("heading", { name: "Settings" });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const manageBtn = page.getByTestId("btn-manage-accounts");
    await expect(manageBtn).toBeVisible({ timeout: 5_000 });

    await manageBtn.click();

    await expect(page).toHaveURL(/\/accounts/, { timeout: 10_000 });
  });

  test("notification preferences persist across page reloads and are reflected by the API", async ({ page }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping notification preferences persistence test");
    }

    await signIn(page);
    await page.goto(`${BASE}/settings`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    const heading = page.getByRole("heading", { name: "Settings" });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Use the Weekly digest switch (defaults to false) so we can reliably test both directions.
    const weeklyDigestSwitch = page.getByTestId("switch-weekly-digest");
    await expect(weeklyDigestSwitch).toBeVisible({ timeout: 8_000 });

    // Record initial checked state.
    const initialChecked = await weeklyDigestSwitch.getAttribute("aria-checked");
    const wasOn = initialChecked === "true";
    const expectedAfterToggle = !wasOn;

    // Toggle the preference and wait for the PATCH to complete before reloading.
    const [patchResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/user/preferences") && r.request().method() === "PATCH",
        { timeout: 10_000 },
      ),
      weeklyDigestSwitch.click(),
    ]);
    expect(patchResponse.ok()).toBe(true);

    // Confirm the optimistic update already reflected in the UI.
    await expect(weeklyDigestSwitch).toHaveAttribute(
      "aria-checked",
      String(expectedAfterToggle),
      { timeout: 5_000 },
    );

    // Reload and verify the toggled state persisted.
    await page.reload();
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const switchAfterReload = page.getByTestId("switch-weekly-digest");
    await expect(switchAfterReload).toBeVisible({ timeout: 8_000 });
    await expect(switchAfterReload).toHaveAttribute(
      "aria-checked",
      String(expectedAfterToggle),
      { timeout: 8_000 },
    );

    // Verify the API also reflects the updated state using Playwright's request context
    // (which shares the page's auth cookies automatically).
    const apiBase = process.env.API_BASE_URL ?? `${BASE}/api`;
    const apiRes = await page.request.get(`${apiBase}/user/preferences`);
    expect(apiRes.ok()).toBe(true);
    const apiBody = await apiRes.json();
    expect(apiBody.weeklyDigest).toBe(expectedAfterToggle);

    // Restore original state so subsequent runs start from a known baseline.
    const [cleanupResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/user/preferences") && r.request().method() === "PATCH",
        { timeout: 10_000 },
      ),
      switchAfterReload.click(),
    ]);
    expect(cleanupResponse.ok()).toBe(true);
    await expect(switchAfterReload).toHaveAttribute(
      "aria-checked",
      String(wasOn),
      { timeout: 5_000 },
    );
  });
});
