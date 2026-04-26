import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_USER_EMAIL } from "./global-setup";

/**
 * Sign-out flow end-to-end tests for PinnboxIO (unified-comms web app).
 *
 * These tests verify that:
 *  1. After signing in, clicking the sign-out button in the sidebar redirects to /sign-in.
 *  2. The Clerk sign-in card is visible after sign-out.
 *  3. No protected content (sidebar nav) is visible after sign-out.
 *
 * Requires CLERK_SECRET_KEY to be set so @clerk/testing can programmatically
 * create a user session. Without it the test is skipped automatically.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

test.describe("Sign-out flow", () => {
  test("signing out via the sidebar button redirects to /sign-in", async ({
    page,
  }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping sign-out test");
    }

    await page.goto(`${BASE}/sign-in`);
    await setupClerkTestingToken({ page });

    await clerk.signIn({
      page,
      emailAddress: TEST_USER_EMAIL,
    });

    await page.goto(`${BASE}/`);

    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(page.locator("nav")).toBeVisible({ timeout: 10_000 });

    const userFooter = page.locator("div").filter({
      has: page.locator("button[title='Sign out']"),
    }).last();

    await userFooter.hover();

    const signOutButton = page.locator("button[title='Sign out']").last();
    await expect(signOutButton).toBeVisible({ timeout: 5_000 });

    await signOutButton.click();

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("nav")).not.toBeVisible();
  });
});
