import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end tests for the main tab navigation (artifacts/mobile/app/(tabs)/_layout.tsx).
 *
 * Covers:
 *  1. Tab bar is visible after successful authentication
 *  2. Core tabs (Dashboard, Inbox, Search, AI, Accounts, Settings) are present in the tab bar
 *  3. Navigating to each core tab loads the correct screen
 *
 * The tests use the same OAuth-callback mock pattern as the signup-carousel suite to
 * simulate a fully authenticated session before exercising navigation.
 */

const MOCK_USER = {
  id: "e2e-nav-user-id",
  email: "nav-e2e@example.com",
  firstName: "Nav",
  lastName: "TestUser",
  profileImageUrl: null,
};

async function signInViaOAuthCallback(page: Page) {
  const TEST_STATE = "e2e-nav-oauth-state-nav123456";
  const TEST_CODE = "e2e-nav-auth-code-nav123456";
  const TEST_TOKEN = "e2e-nav-session-token-nav123456";

  await page.route("**/api/mobile-auth/token-exchange", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: TEST_TOKEN }),
    });
  });

  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: MOCK_USER }),
    });
  });

  // Navigate to the app origin first so that sessionStorage writes target the
  // correct origin (not about:blank) and are readable by AuthContext on callback.
  await page.goto("/login");
  await page
    .getByTestId("sign-in-button")
    .waitFor({ state: "visible", timeout: 15_000 });

  await page.evaluate(
    ({ state, pkceData }) => {
      sessionStorage.setItem("commshub_oauth_state", state);
      sessionStorage.setItem(
        "commshub_pkce_state",
        JSON.stringify(pkceData),
      );
    },
    {
      state: TEST_STATE,
      pkceData: {
        codeVerifier: "e2e-nav-verifier-string",
        nonce: "e2e-nav-nonce-string",
      },
    },
  );

  await page.goto(`/?code=${TEST_CODE}&state=${TEST_STATE}`);

  await expect(page).not.toHaveURL(/\/(login|signup)/, { timeout: 15_000 });
}

test.describe("Main tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await signInViaOAuthCallback(page);
    await page
      .getByRole("tab")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("tab bar is visible after sign-in with core tabs present", async ({
    page,
  }) => {
    const tabBar = page.getByRole("tablist");
    await expect(tabBar).toBeVisible();

    for (const label of ["Dashboard", "Inbox", "Search", "AI", "Accounts", "Settings"]) {
      await expect(
        page.getByRole("tab", { name: new RegExp(label, "i") }),
      ).toBeVisible();
    }
  });

  test("Dashboard tab is active by default and shows dashboard content", async ({
    page,
  }) => {
    const dashboardTab = page.getByRole("tab", { name: /dashboard/i });
    await expect(dashboardTab).toBeVisible();
    await expect(page).toHaveURL(/\/(tabs\/)?$|\/tabs\/index|\/$/, {
      timeout: 10_000,
    });
  });

  test("tapping the Inbox tab loads the inbox screen", async ({ page }) => {
    await page.getByRole("tab", { name: /inbox/i }).click();

    await expect(page).toHaveURL(/inbox/, { timeout: 10_000 });
  });

  test("tapping the Search tab loads the search screen", async ({ page }) => {
    await page.getByRole("tab", { name: /search/i }).click();

    await expect(page).toHaveURL(/search/, { timeout: 10_000 });
  });

  test("tapping the AI tab loads the AI assistant screen", async ({ page }) => {
    await page.getByRole("tab", { name: /^ai$/i }).click();

    await expect(page).toHaveURL(/\/ai$/, { timeout: 10_000 });
    await expect(page.getByText("AI Assistant")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("tapping the Accounts tab loads the accounts screen", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /accounts/i }).click();

    await expect(page).toHaveURL(/accounts/, { timeout: 10_000 });
  });

  test("tapping the Settings tab loads the settings screen", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /settings/i }).click();

    await expect(page).toHaveURL(/settings/, { timeout: 10_000 });
  });

  test("can switch between tabs multiple times without errors", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: /inbox/i }).click();
    await expect(page).toHaveURL(/inbox/, { timeout: 10_000 });

    await page.getByRole("tab", { name: /search/i }).click();
    await expect(page).toHaveURL(/search/, { timeout: 10_000 });

    await page.getByRole("tab", { name: /inbox/i }).click();
    await expect(page).toHaveURL(/inbox/, { timeout: 10_000 });
  });
});
