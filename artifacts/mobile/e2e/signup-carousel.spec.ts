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

  /**
   * Verify that each slide's illustration animates to full opacity (opacity: 1)
   * when its slide becomes the active one.  The entrance animation starts at
   * opacity 0 and runs for ~300 ms, so we allow up to 2 s for CSS to settle.
   *
   * testID reference:
   *   signup-illustration-inbox  — slide 0
   *   signup-illustration-search — slide 1
   *   signup-illustration-ai     — slide 2
   *   signup-illustration-free   — slide 3
   */
  test("each slide illustration becomes fully visible when its slide is active", async ({
    page,
  }) => {
    const ILLUSTRATION_TIMEOUT = 2_000;

    const slides = [
      { key: "inbox",  title: SLIDES[0].title },
      { key: "search", title: SLIDES[1].title },
      { key: "ai",     title: SLIDES[2].title },
      { key: "free",   title: SLIDES[3].title },
    ];

    for (let i = 0; i < slides.length; i++) {
      const { key, title } = slides[i];

      await expect(page.getByText(title)).toBeVisible();

      await expect(page.getByTestId(`signup-illustration-${key}`)).toHaveCSS(
        "opacity",
        "1",
        { timeout: ILLUSTRATION_TIMEOUT },
      );

      if (i < slides.length - 1) {
        await page.getByTestId("signup-next-button").click();
      }
    }
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

  test("shows error banner when OIDC discovery endpoint returns a server error", async ({
    page,
  }) => {
    await page.route(OIDC_DISCOVERY_URL, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.getByTestId("signup-dot-3").click();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();

    await page.getByTestId("signup-continue-button").click();

    await expect(page.getByTestId("signup-error-banner")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("error banner clears when the user retries sign-up after a failure", async ({
    page,
  }) => {
    // First click: OIDC discovery fails with 500.
    // Subsequent calls: discovery succeeds (slowed) so we can observe the
    // loading state and verify the banner has cleared during the retry.
    let discoveryCallCount = 0;
    await page.route(OIDC_DISCOVERY_URL, async (route) => {
      discoveryCallCount++;
      if (discoveryCallCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
        return;
      }
      // Slow the success response so the loading state is observable
      // before the page navigates away to the mock authorize endpoint.
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

    // First attempt — failure path
    await page.getByTestId("signup-continue-button").click();
    await expect(page.getByTestId("signup-error-banner")).toBeVisible({
      timeout: 10_000,
    });

    // CTA must be re-enabled and visible again so the user can retry
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    // Second attempt — recovery path. Banner should clear immediately
    // (setSignInError(null) at the start of startAuthFlow).
    await page.getByTestId("signup-continue-button").click();

    await expect(page.getByTestId("signup-error-banner")).not.toBeVisible({
      timeout: 5_000,
    });

    // Loading state should re-appear during the retry attempt
    await expect(page.getByTestId("signup-continue-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByText("Create my free account")).not.toBeVisible();

    // Sanity: discovery was hit twice (one fail, one retry success)
    expect(discoveryCallCount).toBeGreaterThanOrEqual(2);
  });

  test("shows error banner when token exchange fails after OAuth callback", async ({
    page,
  }) => {
    const TEST_STATE = "e2e-test-oauth-state-token-error";
    const TEST_CODE = "e2e-test-auth-code-token-error";

    await page.route("**/api/mobile-auth/token-exchange", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Token exchange failed" }),
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

    await expect(page).toHaveURL(/\/(login|signup)/, { timeout: 15_000 });

    await expect(page.getByTestId("login-error-banner")).toBeVisible({
      timeout: 10_000,
    });
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
