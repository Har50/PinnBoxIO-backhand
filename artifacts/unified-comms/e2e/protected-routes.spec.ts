import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { TEST_USER_EMAIL } from "./global-setup";

/**
 * Protected-routes end-to-end tests for PinnboxIO (unified-comms web app).
 *
 * These tests cover three scenarios for each protected route:
 *  1. Unauthenticated visitors are redirected to /sign-in.
 *  2. No protected content (sidebar nav) is ever rendered before the redirect fires.
 *  3. Authenticated users can reach the route without being redirected to /sign-in.
 *
 * Scenario 3 requires CLERK_SECRET_KEY to be set so @clerk/testing can programmatically
 * create a user session. Without it the authenticated tests are skipped automatically.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const PROTECTED_ROUTES = [
  "/inbox",
  "/contacts",
  "/accounts",
  "/search",
  "/whatsapp",
  "/linkedin",
  "/ai",
  "/storage",
  "/settings",
] as const;

test.describe("Protected routes — unauthenticated access", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated visitor is redirected from ${route} to /sign-in`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${route}`);

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

      await expect(
        page.getByRole("textbox", { name: /email/i }),
      ).toBeVisible({ timeout: 10_000 });

      await expect(page.locator("nav")).not.toBeVisible();
    });
  }
});

test.describe("Protected routes — no content flash before redirect", () => {
  /**
   * For each tested route, we inject a MutationObserver before navigation that
   * records whether a <nav> element (the authenticated sidebar) is ever added to
   * the DOM.  If the loading guard works correctly, that element must NEVER appear
   * for a signed-out user — not even for a single frame.
   */
  const SAMPLED_ROUTES = [
    "/whatsapp",
    "/linkedin",
    "/ai",
    "/storage",
    "/inbox",
    "/contacts",
    "/settings",
  ] as const;

  for (const route of SAMPLED_ROUTES) {
    test(`no protected content is rendered before redirect from ${route}`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as Window & { __navEverSeen__: boolean }).__navEverSeen__ =
          false;
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                if (
                  node.tagName === "NAV" ||
                  node.querySelector("nav") !== null
                ) {
                  (
                    window as Window & { __navEverSeen__: boolean }
                  ).__navEverSeen__ = true;
                  observer.disconnect();
                  return;
                }
              }
            }
          }
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      });

      await page.goto(`${BASE}${route}`);

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

      const navEverSeen = await page.evaluate(
        () =>
          (window as Window & { __navEverSeen__: boolean }).__navEverSeen__,
      );
      expect(navEverSeen).toBe(false);
    });
  }
});

test.describe("Protected routes — authenticated access", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.CLERK_SECRET_KEY) {
      test.skip(true, "CLERK_SECRET_KEY is not set — skipping authenticated tests");
    }

    await page.goto(`${BASE}/sign-in`);
    await setupClerkTestingToken({ page });
    await clerk.signIn({
      page,
      emailAddress: TEST_USER_EMAIL,
    });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`authenticated user can reach ${route} without sign-in redirect`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${route}`);

      await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 15_000 });

      await expect(
        page.getByRole("textbox", { name: /email/i }),
      ).not.toBeVisible();

      await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });
    });
  }
});
