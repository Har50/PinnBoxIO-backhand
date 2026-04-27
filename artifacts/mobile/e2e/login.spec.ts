import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the login screen (artifacts/mobile/app/login.tsx).
 *
 * Covers:
 *  1. Initial render — app branding and action buttons are visible
 *  2. "Sign in" button initiates the Replit OIDC login OAuth flow (no screen_hint=signup)
 *  3. Loading indicator shown while the auth flow is starting
 *  4. Error banner displayed when OIDC discovery returns a server error
 *  5. "Create account" button navigates to the signup carousel
 *  6. Successful OAuth callback signs the user in and redirects to the app
 *
 * Note on credential entry: the app uses Replit OIDC (an external OAuth provider),
 * so users never enter credentials directly into the app. Tests validate the
 * OAuth initiation flow and the callback/token-exchange instead of credential
 * form interaction.
 *
 * testID reference (React Native testID → data-testid on Expo web):
 *   sign-in-button       — primary "Sign in" Pressable
 *   sign-up-button       — secondary "Create account" Pressable
 *   login-error-banner   — error alert shown on auth failure
 */

const OIDC_DISCOVERY_URL =
  "https://replit.com/oidc/.well-known/openid-configuration";
const OIDC_AUTHORIZE_URL = "https://replit.com/oidc/authorize";

const MOCK_DISCOVERY = {
  issuer: "https://replit.com/oidc",
  authorization_endpoint: OIDC_AUTHORIZE_URL,
  token_endpoint: "https://replit.com/oidc/token",
};

test.describe("Login screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page
      .getByTestId("sign-in-button")
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("shows app branding and both action buttons on initial load", async ({
    page,
  }) => {
    await expect(page.getByText("PinnboxIO")).toBeVisible();
    await expect(page.getByTestId("sign-in-button")).toBeVisible();
    await expect(page.getByTestId("sign-up-button")).toBeVisible();
    await expect(page.getByTestId("login-error-banner")).not.toBeVisible();
  });

  test("shows 'Sign in' label on the sign-in button", async ({ page }) => {
    await expect(page.getByTestId("sign-in-button")).toContainText("Sign in");
  });

  test("'Create account' button navigates to the signup carousel", async ({
    page,
  }) => {
    await page.getByTestId("sign-up-button").click();
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
    await expect(page.getByTestId("signup-carousel")).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Login screen – OAuth integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page
      .getByTestId("sign-in-button")
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("clicking 'Sign in' initiates the OAuth login flow without screen_hint=signup", async ({
    page,
  }) => {
    await page.route(OIDC_DISCOVERY_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISCOVERY),
      });
    });

    let capturedAuthUrl: string | null = null;
    await page.route(`${OIDC_AUTHORIZE_URL}*`, async (route) => {
      capturedAuthUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock auth page</body></html>",
      });
    });

    await page.getByTestId("sign-in-button").click();

    await expect(async () => {
      expect(capturedAuthUrl).toBeTruthy();
    }).toPass({ timeout: 10_000 });

    const authUrl = new URL(capturedAuthUrl!);
    expect(authUrl.searchParams.get("screen_hint")).not.toBe("signup");
    expect(authUrl.searchParams.get("response_type")).toBe("code");
    expect(authUrl.searchParams.get("scope")).toContain("openid");
    expect(authUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(authUrl.searchParams.get("state")).toBeTruthy();
  });

  test("shows a loading indicator while the sign-in OAuth flow is starting", async ({
    page,
  }) => {
    await page.route(OIDC_DISCOVERY_URL, async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISCOVERY),
      });
    });

    await page.route(`${OIDC_AUTHORIZE_URL}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Mock auth page</body></html>",
      });
    });

    await page.getByTestId("sign-in-button").click();

    await expect(page.getByTestId("sign-in-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByText("Sign in")).not.toBeVisible();
  });

  test("shows error banner when OIDC discovery returns a server error", async ({
    page,
  }) => {
    await page.route(OIDC_DISCOVERY_URL, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.getByTestId("sign-in-button").click();

    await expect(page.getByTestId("login-error-banner")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("successful OAuth callback signs the user in and lands them on the app", async ({
    page,
  }) => {
    const TEST_STATE = "e2e-login-oauth-state-abcdef123456";
    const TEST_CODE = "e2e-login-auth-code-abcdef123456";
    const TEST_TOKEN = "e2e-login-session-token-abcdef123456";

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
        body: JSON.stringify({
          user: {
            id: "e2e-login-user-id",
            email: "login-e2e@example.com",
            firstName: "Login",
            lastName: "TestUser",
            profileImageUrl: null,
          },
        }),
      });
    });

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
          codeVerifier: "e2e-login-verifier-string",
          nonce: "e2e-login-nonce-string",
        },
      },
    );

    await page.goto(`/?code=${TEST_CODE}&state=${TEST_STATE}`);

    await expect(page).not.toHaveURL(/\/(login|signup)/, { timeout: 15_000 });

    const appContent = page
      .getByRole("link", { name: /inbox/i })
      .or(page.getByRole("tab"))
      .or(page.getByTestId("tab-inbox"));
    await expect(appContent.first()).toBeVisible({ timeout: 15_000 });
  });
});
