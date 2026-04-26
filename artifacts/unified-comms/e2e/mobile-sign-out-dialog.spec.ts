import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_USER_EMAIL } from "./global-setup";

/**
 * Mobile sign-out confirmation dialog tests for PinnboxIO.
 *
 * These tests verify the mobile-specific sign-out flow where the user taps
 * the avatar button in the slim sidebar (visible at narrow viewports) which
 * opens a confirmation dialog before signing out.
 *
 * Tests run at a ~400 px wide viewport to trigger the mobile sidebar layout.
 *
 * Requires CLERK_SECRET_KEY to be set so @clerk/testing can programmatically
 * create a user session. Without it the tests are skipped automatically.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const MOBILE_VIEWPORT = { width: 400, height: 812 };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/sign-in`);
  await setupClerkTestingToken({ page });
  await clerk.signIn({
    page,
    emailAddress: TEST_USER_EMAIL,
  });
}

test.describe("Mobile sign-out confirmation dialog", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("tapping the avatar opens the dialog and Cancel keeps the user signed in", async ({
    page,
  }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(
        true,
        "CLERK_SECRET_KEY is not set — skipping mobile sign-out dialog test",
      );
    }

    await signIn(page);

    await page.goto(`${BASE}/`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(page.locator("nav")).toBeVisible({ timeout: 10_000 });

    const mobileAvatarButton = page
      .locator('button[title="Sign out"]')
      .filter({ visible: true });
    await expect(mobileAvatarButton).toBeVisible({ timeout: 5_000 });
    await mobileAvatarButton.click();

    const dialogTitle = page.getByRole("heading", {
      name: "Sign out of PinnboxIO?",
    });
    await expect(dialogTitle).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText("You will be redirected to the sign-in page."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(dialogTitle).not.toBeVisible({ timeout: 5_000 });

    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("tapping Sign out in the mobile dialog redirects to /sign-in", async ({
    page,
  }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(
        true,
        "CLERK_SECRET_KEY is not set — skipping mobile sign-out dialog test",
      );
    }

    await signIn(page);

    await page.goto(`${BASE}/`);
    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(page.locator("nav")).toBeVisible({ timeout: 10_000 });

    const mobileAvatarButton = page
      .locator('button[title="Sign out"]')
      .filter({ visible: true });
    await expect(mobileAvatarButton).toBeVisible({ timeout: 5_000 });
    await mobileAvatarButton.click();

    await expect(
      page.getByRole("heading", { name: "Sign out of PinnboxIO?" }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("nav")).not.toBeVisible();
  });
});
