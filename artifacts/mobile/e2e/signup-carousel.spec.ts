import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the signup onboarding carousel (artifacts/mobile/app/signup.tsx).
 *
 * Covers:
 *  1. Advancing slides via the Next button (slides 0 → 1 → 2 → 3)
 *  2. CTA button ("Create my free account") appears only on the final slide (3)
 *  3. Jumping to a slide via the dot indicators
 *  4. Back button returns to the login screen
 *  5. Clicking the CTA triggers the Replit OIDC sign-up OAuth flow (screen_hint=signup)
 *  6. Loading indicator shown while the auth flow is starting
 *  7. Successful OAuth callback signs the user in and lands them on the app
 *
 * testID reference (React Native testID → data-testid on Expo web):
 *   signup-carousel       — horizontal ScrollView wrapping all slides
 *   signup-back-button    — back arrow in the header
 *   signup-next-button    — "Next →" footer button (slides 0-2 only)
 *   signup-continue-button— "Create my free account" CTA (slide 3 only)
 *   signup-dot-{0..3}     — dot indicators; tap to jump to that slide
 */

const OIDC_DISCOVERY_URL =
  "https://replit.com/oidc/.well-known/openid-configuration";
const OIDC_AUTHORIZE_URL = "https://replit.com/oidc/authorize";

const MOCK_DISCOVERY = {
  issuer: "https://replit.com/oidc",
  authorization_endpoint: OIDC_AUTHORIZE_URL,
  token_endpoint: "https://replit.com/oidc/token",
};

const SLIDES = [
  { index: 0, title: "All your inboxes, one place" },
  { index: 1, title: "Unified search" },
  { index: 2, title: "AI-powered replies" },
  { index: 3, title: "Free from day one" },
];

test.describe("Signup carousel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await page
      .getByTestId("signup-carousel")
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("shows slide 1 content and Next button on initial load", async ({
    page,
  }) => {
    await expect(page.getByText(SLIDES[0].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();
  });

  test("advances through all slides via Next button", async ({ page }) => {
    for (let i = 0; i < SLIDES.length - 1; i++) {
      await expect(page.getByText(SLIDES[i].title)).toBeVisible();

      if (i < SLIDES.length - 1) {
        await expect(page.getByTestId("signup-next-button")).toBeVisible();
        await expect(
          page.getByTestId("signup-continue-button"),
        ).not.toBeVisible();
      }

      await page.getByTestId("signup-next-button").click();
    }

    await expect(page.getByText(SLIDES[3].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).not.toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
  });

  test("CTA button appears only on the final slide", async ({ page }) => {
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();

    for (let i = 0; i < SLIDES.length - 1; i++) {
      await page.getByTestId("signup-next-button").click();
      if (i < SLIDES.length - 2) {
        await expect(
          page.getByTestId("signup-continue-button"),
        ).not.toBeVisible();
      }
    }

    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
    await expect(page.getByText("Create my free account")).toBeVisible();
  });

  test("jumping via dot indicators switches slides", async ({ page }) => {
    await page.getByTestId("signup-dot-3").click();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).not.toBeVisible();

    await page.getByTestId("signup-dot-0").click();
    await expect(page.getByText(SLIDES[0].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();

    await page.getByTestId("signup-dot-2").click();
    await expect(page.getByText(SLIDES[2].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
  });

  test("back button returns to the login screen", async ({ page }) => {
    await page.getByTestId("signup-back-button").click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByTestId("signup-carousel")).not.toBeVisible();
  });
});

test.describe("Signup flow – OAuth integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await page
      .getByTestId("signup-carousel")
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("clicking 'Create my free account' initiates the OAuth sign-up flow with screen_hint=signup", async ({
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

    await page.getByTestId("signup-dot-3").click();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();

    await page.getByTestId("signup-continue-button").click();

    await expect(async () => {
      expect(capturedAuthUrl).toBeTruthy();
    }).toPass({ timeout: 10_000 });

    const authUrl = new URL(capturedAuthUrl!);
    expect(authUrl.searchParams.get("screen_hint")).toBe("signup");
    expect(authUrl.searchParams.get("response_type")).toBe("code");
    expect(authUrl.searchParams.get("scope")).toContain("openid");
    expect(authUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(authUrl.searchParams.get("state")).toBeTruthy();
  });

  test("shows a loading indicator while the sign-up OAuth flow is starting", async ({
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

    await page.getByTestId("signup-dot-3").click();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();

    await page.getByTestId("signup-continue-button").click();

    await expect(page.getByTestId("signup-continue-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByText("Create my free account")).not.toBeVisible();
  });

  test("successful OAuth callback signs the user in and lands them on the app", async ({
    page,
  }) => {
    const TEST_STATE = "e2e-test-oauth-state-abcdef123456";
    const TEST_CODE = "e2e-test-auth-code-abcdef123456";
    const TEST_TOKEN = "e2e-test-session-token-abcdef123456";

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
            id: "e2e-test-user-id",
            email: "e2e@example.com",
            firstName: "E2E",
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
          codeVerifier: "e2e-test-verifier-string",
          nonce: "e2e-test-nonce-string",
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
