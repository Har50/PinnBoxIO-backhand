import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_USER_EMAIL } from "./global-setup";

/**
 * Sign-in flow end-to-end tests for PinnboxIO (unified-comms web app).
 *
 * These tests cover three scenarios:
 *  1. Unauthenticated visitors are redirected to /sign-in.
 *  2. The Clerk sign-in card renders correctly on /sign-in.
 *  3. Authenticated users land on the dashboard without being redirected to sign-in.
 *
 * Scenario 3 requires CLERK_SECRET_KEY to be set so @clerk/testing can programmatically
 * create a user session. Without it the test is skipped automatically.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

test.describe("Sign-in flow", () => {
  test("unauthenticated visitor is redirected from / to /sign-in", async ({
    page,
  }) => {
    await page.goto(`${BASE}/`);

    await expect(page).toHaveURL(/\/sign-in/);

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator("nav")).not.toBeVisible();
  });

  test("sign-in page renders the Clerk card with correct content", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    await expect(page).toHaveURL(/\/sign-in/);

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();

    const headingOrTitle = page.getByText(/Welcome to PinnboxIO/i);
    await expect(headingOrTitle).toBeVisible();

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
  });

  test("authenticated user lands on dashboard without sign-in redirect", async ({
    page,
  }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping authenticated test");
    }

    await page.goto(`${BASE}/sign-in`);

    await setupClerkTestingToken({ page });

    await clerk.signIn({
      page,
      emailAddress: TEST_USER_EMAIL,
    });

    await page.goto(`${BASE}/`);

    await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).not.toBeVisible();

    const dashboardOrInbox = page
      .getByRole("heading", { name: /dashboard/i })
      .or(page.getByRole("link", { name: /inbox/i }));
    await expect(dashboardOrInbox.first()).toBeVisible({ timeout: 15_000 });
  });
});
